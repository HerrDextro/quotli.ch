# QuoteGen – Setup & Hosting Tutorial

This guide walks you through setting up QuoteGen from scratch, configuring all third-party services, and deploying to production.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Local Development Setup](#2-local-development-setup)
3. [Supabase Configuration](#3-supabase-configuration)
4. [Clerk Authentication Setup](#4-clerk-authentication-setup)
5. [Anthropic (Claude) API Setup](#5-anthropic-claude-api-setup)
6. [Resend Email Setup](#6-resend-email-setup)
7. [Stripe Payment Setup](#7-stripe-payment-setup)
8. [Connecting Clerk to Supabase (Webhook)](#8-connecting-clerk-to-supabase-webhook)
9. [Environment Variables Reference](#9-environment-variables-reference)
10. [Deploying to Vercel](#10-deploying-to-vercel)
11. [Post-Deployment Checklist](#11-post-deployment-checklist)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Prerequisites

- **Node.js** 18+ and **npm** 9+
- A **Supabase** account (free tier works): [supabase.com](https://supabase.com)
- A **Clerk** account (free tier works): [clerk.com](https://clerk.com)
- An **Anthropic** API key: [console.anthropic.com](https://console.anthropic.com)
- A **Resend** account (free tier works): [resend.com](https://resend.com)
- A **Stripe** account (test mode first): [stripe.com](https://stripe.com)
- A **Vercel** account for hosting: [vercel.com](https://vercel.com)

---

## 2. Local Development Setup

```bash
# Clone or navigate to the project
cd quote-gen

# Install dependencies
npm install

# Copy the example env file
cp .env.local.example .env.local
```

Now fill in `.env.local` as you progress through the following sections.

---

## 3. Supabase Configuration

### 3.1 Create a Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and click **New Project**.
2. Choose a name (e.g. `quotegen-prod`) and set a strong database password.
3. Select the closest region (Swiss users: **West Europe**).
4. Wait for the project to provision (~2 minutes).

### 3.2 Run the Schema

1. In your Supabase dashboard, go to **SQL Editor**.
2. Copy the entire contents of `supabase/schema.sql` and paste it into the editor.
3. Click **Run**. This creates:
   - `users` table
   - `quotes` table
   - `quote_line_items` table
   - All indexes
   - Row Level Security (RLS) policies

### 3.3 Create the Logos Storage Bucket

1. Go to **Storage** in the Supabase dashboard.
2. Click **New Bucket** and name it `logos`.
3. Set it to **Public** (so PDF logo images are accessible).
4. After creation, go to **Policies** for the `logos` bucket and add these policies:

**Policy 1 – Anyone can view logos:**
```
Allowed operation: SELECT
Target roles: anon, authenticated
Using expression: bucket_id = 'logos'
```

**Policy 2 – Users can upload their own logo:**
```
Allowed operation: INSERT
Target roles: authenticated
Using expression: bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text
```

**Policy 3 – Users can update their own logo:**
```
Allowed operation: UPDATE
Target roles: authenticated
Using expression: bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text
```

### 3.4 Get Your API Keys

1. Go to **Settings → API**.
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

---

## 4. Clerk Authentication Setup

### 4.1 Create a Clerk Application

1. Go to [dashboard.clerk.com](https://dashboard.clerk.com) and click **Create Application**.
2. Name it `QuoteGen`.
3. Enable **Email** sign-in (and any others you want).
4. Click **Create**.

### 4.2 Get Your API Keys

1. In your Clerk dashboard, go to **API Keys**.
2. Copy:
   - **Publishable Key** → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - **Secret Key** → `CLERK_SECRET_KEY`

### 4.3 Configure Redirect URLs

In **Paths** settings, set:
- Sign-in URL: `/sign-in`
- Sign-up URL: `/sign-up`
- After sign-in: `/neue-offerte`
- After sign-up: `/neue-offerte`

### 4.4 Enable Webhooks (Critical)

This step is required so new Clerk users are automatically created in Supabase.

1. Go to **Webhooks** in the Clerk dashboard.
2. Click **Add Endpoint**.
3. For local development, use a tunnel URL like `https://your-ngrok-url/api/clerk/webhook` (see [ngrok](https://ngrok.com)).
4. For production, use `https://your-domain.com/api/clerk/webhook`.
5. Subscribe to the **`user.created`** event only.
6. Click **Create**.
7. Copy the **Signing Secret** → `CLERK_WEBHOOK_SECRET`

---

## 5. Anthropic (Claude) API Setup

1. Go to [console.anthropic.com](https://console.anthropic.com).
2. Create an account and add billing (Claude Sonnet costs ~$3/MTok input, ~$15/MTok output).
3. Go to **API Keys** and create a new key.
4. Copy the key → `ANTHROPIC_API_KEY`

The app uses `claude-sonnet-4-20250514` which provides fast, high-quality structured output for quote generation.

---

## 6. Resend Email Setup

### 6.1 Create an API Key

1. Go to [resend.com](https://resend.com) and sign up.
2. Go to **API Keys** and create a new key.
3. Copy the key → `RESEND_API_KEY`

### 6.2 Configure Your Sending Domain

For production, you must verify a custom domain:

1. Go to **Domains** in the Resend dashboard.
2. Click **Add Domain** and follow the DNS verification steps.
3. Update the `from` address in `src/app/api/send-email/route.ts` from `onboarding@resend.dev` to your verified domain (e.g. `offerten@yourcompany.ch`).

> **Note:** In development/test mode, Resend only sends to your account email. Use `onboarding@resend.dev` for testing.

---

## 7. Stripe Payment Setup

### 7.1 Create a Product and Price

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com).
2. Switch to **Test mode** (toggle in top right).
3. Go to **Products → Add Product**:
   - Name: `QuoteGen Pro`
   - Description: `Unbegrenzte Offerten pro Monat`
   - Pricing: **Recurring**, e.g. CHF 29/month
4. After creation, copy the **Price ID** (starts with `price_...`).

### 7.2 Get Your API Keys

1. Go to **Developers → API Keys**.
2. Copy:
   - **Secret key** → `STRIPE_SECRET_KEY`
   - Set the **Price ID** → `STRIPE_PRO_PRICE_ID`

### 7.3 Set Up Webhooks

1. Go to **Developers → Webhooks**.
2. Click **Add Endpoint**.
3. URL: `https://your-domain.com/api/stripe/webhook`
4. For local dev: use ngrok URL.
5. Events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
6. After creation, click **Reveal** the signing secret → `STRIPE_WEBHOOK_SECRET`

---

## 8. Connecting Clerk to Supabase (Webhook)

The app uses a Clerk webhook (`/api/clerk/webhook`) to auto-create a user row in Supabase when someone signs up. Without this, new users get a "User profile not found" error.

**Setup steps** (already covered in section 4.4):
1. Ensure the Clerk webhook endpoint is set to `/api/clerk/webhook`.
2. Subscribe to `user.created` events.
3. Add `CLERK_WEBHOOK_SECRET` to your environment variables.

**How it works:**
1. User signs up via Clerk.
2. Clerk sends a `user.created` webhook to `/api/clerk/webhook`.
3. The webhook handler verifies the Svix signature.
4. It creates a new row in the `users` table with the Clerk user ID.
5. The user is redirected to the dashboard and can immediately start creating quotes.

---

## 9. Environment Variables Reference

Create a `.env.local` file in the `quote-gen/` directory:

```env
# ─── Clerk Authentication ───
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/neue-offerte
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/neue-offerte
CLERK_WEBHOOK_SECRET=whsec_...

# ─── Supabase ───
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# ─── Anthropic Claude API ───
ANTHROPIC_API_KEY=sk-ant-...

# ─── Resend (Email) ───
RESEND_API_KEY=re_...

# ─── Stripe (Payments) ───
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...

# ─── App ───
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 10. Deploying to Vercel

### 10.1 Push to Git

```bash
cd quote-gen
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/quotegen.git
git push -u origin main
```

### 10.2 Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and click **New Project**.
2. Import your Git repository.
3. Set **Root Directory** to `quote-gen`.
4. Set **Framework Preset** to **Next.js**.
5. Under **Environment Variables**, add ALL variables from section 9.
6. Update production URLs:
   - `NEXT_PUBLIC_APP_URL` → `https://your-domain.com`
   - Clerk webhook → `https://your-domain.com/api/clerk/webhook`
   - Stripe webhook → `https://your-domain.com/api/stripe/webhook`
7. Click **Deploy**.

### 10.3 Custom Domain (Optional)

1. In Vercel, go to **Settings → Domains**.
2. Add your domain (e.g. `quotegen.ch`).
3. Update DNS records at your registrar as instructed.
4. Update all environment variables that reference the app URL.

### 10.4 Stripe Live Mode

When ready to accept real payments:

1. Switch Stripe from **Test** to **Live** mode.
2. Create a new product/price in live mode.
3. Create a new webhook endpoint for the live keys.
4. Update Vercel environment variables with the live keys:
   - `STRIPE_SECRET_KEY` → live key
   - `STRIPE_WEBHOOK_SECRET` → live webhook secret
   - `STRIPE_PRO_PRICE_ID` → live price ID
5. Redeploy on Vercel.

---

## 11. Post-Deployment Checklist

- [ ] Clerk webhook is live and `user.created` events create Supabase rows
- [ ] Sign up a new test user → dashboard loads without errors
- [ ] Create a quote via "Neue Offerte" → Claude generates structured data
- [ ] Edit line items → totals recalculate correctly
- [ ] Generate PDF → downloads with correct company data
- [ ] Upload a logo in settings → appears in PDF
- [ ] Send email → client receives PDF attachment
- [ ] Quote history shows created quotes with correct status
- [ ] Upgrade to Pro via Stripe → plan changes in Supabase
- [ ] Free plan user hits 3-quote limit → gets upgrade prompt
- [ ] Billing portal works for Pro users

---

## 12. Troubleshooting

### "User profile not found" on first sign-in

The Clerk webhook isn't firing. Verify:
- `CLERK_WEBHOOK_SECRET` is set correctly.
- The webhook endpoint URL is reachable (check Clerk dashboard for failed deliveries).
- The Svix signature verification is passing.

### Claude returns "AI returned invalid JSON"

This is rare but can happen with complex inputs. Try:
- Simplifying the input text.
- Checking your Anthropic API key and billing status.

### PDF generation fails with a blank page

- Ensure `@react-pdf/renderer` is installed (`npm ls @react-pdf/renderer`).
- Check server logs for rendering errors.

### Logo doesn't appear in PDF

- The `logos` Supabase Storage bucket must be set to **public**.
- Logo upload is a Pro feature (free plan users see a watermark instead).
- Verify the `logo_url` in the `users` table is a valid public URL.

### Stripe webhook returns 400

- Ensure `STRIPE_WEBHOOK_SECRET` matches the endpoint's signing secret.
- The webhook endpoint must receive the raw body (the app reads via `request.text()`, not `request.json()`).

### Emails not received

- In test mode, Resend only sends to your account email.
- Verify your sending domain DNS records are correct.
- Check the Resend dashboard for delivery status.



## Notes:
Zimmer renovieren. Alter Holzboden rausnehmen und neuen Boden verlegen im Zimmer ca. 5 x 4 Meter. Wände neu weiss streichen, kleinere Dübellöcher schliessen und alles sauber abdecken. Sockelleisten wenn nötig ersetzen. Am Schluss reinigen und entsorgen vom alten Material. Bitte Offerte mit Material und Arbeit separat ausweisen.