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
    .select("id, stripe_customer_id")
    .eq("clerk_id", userId)
    .single();

  if (!userRow) {
    return NextResponse.json(
      { error: "User profile not found" },
      { status: 404 }
    );
  }

  let customerId = userRow.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: { clerk_id: userId },
    });
    customerId = customer.id;

    await supabase
      .from("users")
      .update({ stripe_customer_id: customerId })
      .eq("id", userRow.id);
  }

  const priceId = process.env.STRIPE_PRO_PRICE_ID;
  if (!priceId) {
    return NextResponse.json(
      { error: "Stripe price not configured" },
      { status: 500 }
    );
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/einstellungen?upgraded=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/einstellungen`,
    metadata: { clerk_id: userId },
  });

  return NextResponse.json({ url: session.url });
}
