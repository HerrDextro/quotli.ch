import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { QuoteStructuredData } from "@/types";

function generateOffertenNummer(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `OFF-${y}${m}${d}-${rand}`;
}

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data: userRow } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    if (!userRow) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { data: original, error: fetchError } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", userRow.id)
      .single();

    if (fetchError || !original) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    const { data: lineItems } = await supabase
      .from("quote_line_items")
      .select("description, qty, unit, unit_price_chf, total_chf, sort_order")
      .eq("quote_id", params.id)
      .order("sort_order", { ascending: true });

    const offertenNummer = generateOffertenNummer();

    const { data: newQuote, error: insertError } = await supabase
      .from("quotes")
      .insert({
        user_id: userRow.id,
        input_text: original.input_text,
        structured_json: original.structured_json as Record<string, unknown> | null,
        status: "draft",
        client_name: original.client_name,
        client_email: original.client_email,
        total_chf: original.total_chf,
        language: original.language,
        offerten_nummer: offertenNummer,
      })
      .select("id")
      .single();

    if (insertError || !newQuote) {
      console.error("Duplicate quote error:", insertError);
      return NextResponse.json({ error: "Failed to duplicate quote" }, { status: 500 });
    }

    if (lineItems && lineItems.length > 0) {
      const newLineItems = lineItems.map((item) => ({
        quote_id: newQuote.id,
        description: item.description,
        qty: item.qty,
        unit: item.unit,
        unit_price_chf: item.unit_price_chf,
        total_chf: item.total_chf,
        sort_order: item.sort_order,
      }));

      await supabase.from("quote_line_items").insert(newLineItems);
    }

    const structuredJson = original.structured_json as QuoteStructuredData | null;

    return NextResponse.json({
      success: true,
      quoteId: newQuote.id,
      offerten_nummer: offertenNummer,
      data: structuredJson,
      client_name: original.client_name,
      client_email: original.client_email,
      input_text: original.input_text,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Duplicate quote error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
