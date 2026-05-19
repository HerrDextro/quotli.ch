import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Resend } from "resend";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { getSupabaseAdmin } from "@/lib/supabase";
import { QuotePdfDocument } from "@/components/quote-pdf";
import type { SendEmailRequest, GeneratePdfRequest, PdfUserProfile } from "@/types";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as SendEmailRequest;

    if (!body.quoteId || !body.quote || !body.client_email) {
      return NextResponse.json(
        { success: false, error: "Missing required fields (quoteId, quote, client_email)" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: userRow } = await supabase
      .from("users")
      .select("id, company_name, address, logo_url, plan")
      .eq("clerk_id", userId)
      .single();

    if (!userRow) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const { data: quoteRow } = await supabase
      .from("quotes")
      .select("id, user_id")
      .eq("id", body.quoteId)
      .eq("user_id", userRow.id)
      .single();

    if (!quoteRow) {
      return NextResponse.json({ success: false, error: "Quote not found" }, { status: 404 });
    }

    const profile: PdfUserProfile = {
      company_name: userRow.company_name || "Firma",
      address: userRow.address || "Schweiz",
      logo_url: userRow.logo_url,
      plan: (userRow.plan as PdfUserProfile["plan"]) || "free",
    };

    const pdfData: GeneratePdfRequest = {
      quote: body.quote,
      profile,
      client_name: body.client_name,
      client_email: body.client_email,
      offerten_nummer: body.offerten_nummer,
    };

    const pdfElement = React.createElement(QuotePdfDocument, {
      data: pdfData,
    }) as React.ReactElement;

    const buffer = await renderToBuffer(pdfElement);
    const pdfBase64 = Buffer.from(buffer).toString("base64");

    const fileName = `Offerte_${body.offerten_nummer || "draft"}.pdf`;

    const { error: emailError } = await resend.emails.send({
      from: `${profile.company_name} <onboarding@resend.dev>`,
      to: body.client_email,
      subject: `Offerte ${body.offerten_nummer} – ${profile.company_name}`,
      html: `<p>Guten Tag ${body.client_name},</p><p>anbei erhalten Sie unsere Offerte ${body.offerten_nummer}.</p><p>Mit freundlichen Grüssen<br/>${profile.company_name}</p>`,
      attachments: [
        {
          filename: fileName,
          content: pdfBase64,
          contentType: "application/pdf",
        },
      ],
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      return NextResponse.json(
        { success: false, error: "Failed to send email" },
        { status: 500 }
      );
    }

    await supabase
      .from("quotes")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        structured_json: body.quote as unknown as Record<string, unknown>,
        total_chf: body.quote.grand_total,
        client_name: body.client_name,
        client_email: body.client_email,
      })
      .eq("id", body.quoteId);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to send email";
    console.error("Send email error:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
