import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  const { data: userRow } = await supabase
    .from("users")
    .select("stripe_customer_id")
    .eq("clerk_id", userId)
    .single();

  if (!userRow?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No Stripe customer found" },
      { status: 404 }
    );
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: userRow.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/einstellungen`,
  });

  return NextResponse.json({ url: session.url });
}
