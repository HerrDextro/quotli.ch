import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";

const PLAN_LIMITS: Record<string, number | null> = {
  free: 3,
  pro: null,
  team: null,
};

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data: userRow } = await supabase
      .from("users")
      .select("id, plan")
      .eq("clerk_id", userId)
      .single();

    if (!userRow) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const demoPlan = process.env.DEMO_PLAN as string | undefined;
    const plan = demoPlan || userRow.plan || "free";
    const limit = demoPlan ? null : (PLAN_LIMITS[plan] ?? null);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userRow.id)
      .gte("created_at", startOfMonth.toISOString());

    const used = count ?? 0;

    const now = new Date();
    const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return NextResponse.json({
      plan,
      used,
      limit,
      reset_date: resetDate.toISOString(),
      demo: !!demoPlan,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Usage error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
