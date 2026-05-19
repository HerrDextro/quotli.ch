import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(
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

    const { data: quote, error } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", userRow.id)
      .single();

    if (error || !quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    const { data: lineItems } = await supabase
      .from("quote_line_items")
      .select("*")
      .eq("quote_id", params.id)
      .order("sort_order", { ascending: true });

    return NextResponse.json({ success: true, quote, line_items: lineItems || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Get quote error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const supabase = getSupabaseAdmin();

    const { data: userRow } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    if (!userRow) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.status) updateData.status = body.status;
    if (body.structured_json) updateData.structured_json = body.structured_json;
    if (body.client_name !== undefined) updateData.client_name = body.client_name;
    if (body.client_email !== undefined) updateData.client_email = body.client_email;
    if (body.total_chf !== undefined) updateData.total_chf = body.total_chf;

    if (Object.keys(updateData).length > 0) {
      const { error } = await supabase
        .from("quotes")
        .update(updateData)
        .eq("id", params.id)
        .eq("user_id", userRow.id);

      if (error) {
        console.error("Update quote error:", error);
        return NextResponse.json({ error: "Failed to update quote" }, { status: 500 });
      }
    }

    if (body.line_items && Array.isArray(body.line_items)) {
      await supabase
        .from("quote_line_items")
        .delete()
        .eq("quote_id", params.id);

      const lineItems = body.line_items.map(
        (item: { description: string; qty: number; unit: string; unit_price: number; total: number }, index: number) => ({
          quote_id: params.id,
          description: item.description,
          qty: item.qty,
          unit: item.unit,
          unit_price_chf: item.unit_price,
          total_chf: item.total,
          sort_order: index,
        })
      );

      if (lineItems.length > 0) {
        await supabase.from("quote_line_items").insert(lineItems);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Patch quote error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
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

    const { error } = await supabase
      .from("quotes")
      .delete()
      .eq("id", params.id)
      .eq("user_id", userRow.id);

    if (error) {
      console.error("Delete quote error:", error);
      return NextResponse.json({ error: "Failed to delete quote" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Delete quote error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
