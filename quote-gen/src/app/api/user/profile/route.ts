import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  const { data: user, error } = await supabase
    .from("users")
    .select(
      "id, company_name, logo_url, address, qr_iban, default_terms, default_validity_days, plan, stripe_customer_id"
    )
    .eq("clerk_id", userId)
    .single();

  if (error || !user) {
    const { data: newUser, error: createError } = await supabase
      .from("users")
      .insert({ clerk_id: userId })
      .select(
        "id, company_name, logo_url, address, qr_iban, default_terms, default_validity_days, plan, stripe_customer_id"
      )
      .single();

    if (createError || !newUser) {
      console.error("Failed to create user:", createError);
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }

    return NextResponse.json(newUser);
  }

  return NextResponse.json(user);
}

export async function PATCH(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const allowedFields = [
    "company_name",
    "logo_url",
    "address",
    "qr_iban",
    "default_terms",
    "default_validity_days",
  ];

  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from("users")
    .update(updates)
    .eq("clerk_id", userId);

  if (error) {
    console.error("Failed to update profile:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
