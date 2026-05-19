import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";

function generateOffertenNummer(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `OFF-${y}${m}${d}-${rand}`;
}

export async function GET() {
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

    const { data: draft } = await supabase
      .from("quotes")
      .select("id, input_text, client_name, client_email")
      .eq("user_id", userRow.id)
      .eq("status", "draft")
      .is("structured_json", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({ draft: draft || null });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Get draft error:", message);
    return NextResponse.json({ draft: null });
  }
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const inputText = (body.input_text as string) || "";
    const clientName = (body.client_name as string) || null;
    const clientEmail = (body.client_email as string) || null;
    const draftId = body.draft_id as string | undefined;

    const supabase = getSupabaseAdmin();

    const { data: userRow } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    if (!userRow) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (draftId) {
      const { error } = await supabase
        .from("quotes")
        .update({
          input_text: inputText,
          client_name: clientName,
          client_email: clientEmail,
        })
        .eq("id", draftId)
        .eq("user_id", userRow.id);

      if (error) {
        console.error("Update draft error:", error);
        return NextResponse.json({ error: "Failed to update draft" }, { status: 500 });
      }

      return NextResponse.json({ draft_id: draftId });
    }

    const offertenNummer = generateOffertenNummer();
    const { data: newDraft, error } = await supabase
      .from("quotes")
      .insert({
        user_id: userRow.id,
        input_text: inputText,
        structured_json: null,
        status: "draft",
        client_name: clientName,
        client_email: clientEmail,
        total_chf: 0,
        language: "de",
        offerten_nummer: offertenNummer,
      })
      .select("id")
      .single();

    if (error || !newDraft) {
      console.error("Create draft error:", error);
      return NextResponse.json({ error: "Failed to create draft" }, { status: 500 });
    }

    return NextResponse.json({ draft_id: newDraft.id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Save draft error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
