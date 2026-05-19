import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateQuote } from "@/lib/claude";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { GenerateQuoteResponse, QuoteLineItemInput } from "@/types";

function generateOffertenNummer(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `OFF-${y}${m}${d}-${rand}`;
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json<GenerateQuoteResponse>(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const input = body.input as string | undefined;
    const clientName = (body.client_name as string) || null;
    const clientEmail = (body.client_email as string) || null;
    const language = (body.language as string) || "de";

    if (!input || input.trim().length === 0) {
      return NextResponse.json<GenerateQuoteResponse>(
        { success: false, error: "Input text is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: userRow } = await supabase
      .from("users")
      .select("id, plan")
      .eq("clerk_id", userId)
      .single();

    if (!userRow) {
      return NextResponse.json<GenerateQuoteResponse>(
        { success: false, error: "User profile not found" },
        { status: 404 }
      );
    }

    const demoPlan = process.env.DEMO_PLAN as string | undefined;
    const effectivePlan = demoPlan || userRow.plan;

    if (!demoPlan && effectivePlan === "free") {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from("quotes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userRow.id)
        .gte("created_at", startOfMonth.toISOString());

      if ((count ?? 0) >= 3) {
        return NextResponse.json<GenerateQuoteResponse>(
          {
            success: false,
            error:
              "Free plan limit reached (3 quotes/month). Upgrade to Pro for unlimited quotes.",
          },
          { status: 403 }
        );
      }
    }

    const data = await generateQuote(input.trim());

    const offertenNummer = generateOffertenNummer();

    const { data: quoteRow, error: insertError } = await supabase
      .from("quotes")
      .insert({
        user_id: userRow.id,
        input_text: input.trim(),
        structured_json: data as unknown as Record<string, unknown>,
        status: "draft",
        client_name: clientName,
        client_email: clientEmail,
        total_chf: data.grand_total,
        language,
        offerten_nummer: offertenNummer,
      })
      .select("id")
      .single();

    if (insertError || !quoteRow) {
      console.error("Failed to save quote:", insertError);
      return NextResponse.json<GenerateQuoteResponse>(
        { success: true, data, offerten_nummer: offertenNummer },
        { status: 200 }
      );
    }

    if (data.line_items.length > 0) {
      const lineItems = data.line_items.map(
        (item: QuoteLineItemInput, index: number) => ({
          quote_id: quoteRow.id,
          description: item.description,
          qty: item.qty,
          unit: item.unit,
          unit_price_chf: item.unit_price,
          total_chf: item.total,
          sort_order: index,
        })
      );

      await supabase.from("quote_line_items").insert(lineItems);
    }

    return NextResponse.json<GenerateQuoteResponse>({
      success: true,
      data,
      quoteId: quoteRow.id,
      offerten_nummer: offertenNummer,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    if (message.startsWith("JSON_PARSE_ERROR:")) {
      const raw = message.replace("JSON_PARSE_ERROR:", "");
      console.error("Claude returned non-JSON:", raw);
      return NextResponse.json<GenerateQuoteResponse>(
        { success: false, error: "AI returned invalid JSON", raw },
        { status: 422 }
      );
    }

    console.error("Generate quote error:", message);
    return NextResponse.json<GenerateQuoteResponse>(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
