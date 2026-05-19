import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";

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

    const { data: quotes, error } = await supabase
      .from("quotes")
      .select("id, input_text, status, client_name, client_email, total_chf, language, offerten_nummer, created_at, sent_at")
      .eq("user_id", userRow.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch quotes error:", error);
      return NextResponse.json({ error: "Failed to fetch quotes" }, { status: 500 });
    }

    return NextResponse.json({ success: true, quotes });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Get quotes error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
