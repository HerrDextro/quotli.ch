import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { getSupabaseAdmin } from "@/lib/supabase";

const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  if (!WEBHOOK_SECRET) {
    console.error("CLERK_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const body = await request.text();
  const headers = request.headers;

  const svixId = headers.get("svix-id");
  const svixTimestamp = headers.get("svix-timestamp");
  const svixSignature = headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const webhook = new Webhook(WEBHOOK_SECRET);

  let payload: Record<string, unknown>;
  try {
    payload = webhook.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const eventType = payload.type as string;

  if (eventType === "user.created") {
    const userData = payload.data as Record<string, unknown>;
    const clerkId = userData.id as string;
    const emailAddresses = userData.email_addresses as Array<{ email_address: string }>;
    const primaryEmail = emailAddresses?.[0]?.email_address || null;

    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from("users")
      .upsert(
        {
          clerk_id: clerkId,
          company_name: null,
          address: primaryEmail ? null : null,
        },
        { onConflict: "clerk_id" }
      );

    if (error) {
      console.error("Failed to create user:", error);
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
