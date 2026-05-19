# QuoteGen – System Architecture Documentation

## Overview

QuoteGen is a Swiss-focused SaaS application that lets contractors generate professional quotes (Offerten) using AI. A contractor describes a job in free text, Claude structures it into a line-item quote with Swiss-specific pricing (CHF, 8.1% MWST), and the app produces a branded PDF that can be emailed directly to the client.

---

## Tech Stack

| Layer            | Technology                        | Purpose                                      |
|------------------|-----------------------------------|----------------------------------------------|
| Framework        | Next.js 14 (App Router)           | Full-stack React framework with API routes   |
| Language         | TypeScript                        | Type safety across client and server         |
| Styling          | Tailwind CSS                      | Utility-first CSS                            |
| Authentication   | Clerk                             | User management, sign-in/up, sessions, JWTs  |
| Database         | Supabase (PostgreSQL)             | User profiles, quotes, line items, storage   |
| AI               | Anthropic Claude Sonnet 4         | Structured quote generation from free text   |
| PDF Generation   | @react-pdf/renderer               | Server-side PDF rendering                    |
| Email            | Resend                            | Transactional email with PDF attachment      |
| Payments         | Stripe                            | Subscriptions, billing portal, webhooks      |
| Hosting          | Vercel                            | Serverless deployment, edge functions        |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Client (Browser)                           │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Landing Page │  │ Neue Offerte │  │ Offerten-    │              │
│  │    (/)       │  │ (/neue-      │  │ Verlauf      │              │
│  │              │  │  offerte)    │  │              │              │
│  └──────────────┘  └──────┬───────┘  └──────────────┘              │
│                           │                                         │
│  ┌──────────────┐  ┌──────┴───────┐                                │
│  │ Einstellungen│  │ Clerk        │                                │
│  │ (/einstell.) │  │ UserButton   │                                │
│  └──────────────┘  └──────────────┘                                │
│                                                                     │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Next.js API Routes (Server)                     │
│                                                                     │
│  ┌────────────────────┐  ┌──────────────────────────┐              │
│  │ /api/generate-quote│──│ Claude API (Anthropic)    │              │
│  │ POST               │  │ → Structured quote JSON   │              │
│  └────────┬───────────┘  └──────────────────────────┘              │
│           │                                                         │
│           ▼                                                         │
│  ┌────────────────────┐  ┌──────────────────────────┐              │
│  │ /api/generate-pdf  │──│ @react-pdf/renderer       │              │
│  │ POST               │  │ → A4 PDF with branding    │              │
│  └────────────────────┘  └──────────────────────────┘              │
│                                                                     │
│  ┌────────────────────┐  ┌──────────────────────────┐              │
│  │ /api/send-email    │──│ Resend                    │              │
│  │ POST               │  │ → Email with PDF attach   │              │
│  └────────────────────┘  └──────────────────────────┘              │
│                                                                     │
│  ┌────────────────────┐  ┌──────────────────────────┐              │
│  │ /api/stripe/*      │──│ Stripe API                │              │
│  │ checkout/portal/   │  │ → Subscriptions & billing │              │
│  │ webhook            │  │                           │              │
│  └────────────────────┘  └──────────────────────────┘              │
│                                                                     │
│  ┌────────────────────┐  ┌──────────────────────────┐              │
│  │ /api/clerk/webhook │←─│ Clerk Webhooks            │              │
│  │ POST               │  │ → user.created event      │              │
│  └────────┬───────────┘  └──────────────────────────┘              │
│           │                                                         │
│           ▼                                                         │
│  ┌────────────────────┐                                             │
│  │ /api/user/profile  │                                             │
│  │ GET / PATCH        │                                             │
│  └────────┬───────────┘                                             │
│           │                                                         │
│  ┌────────┴───────────┐                                             │
│  │ /api/user/         │                                             │
│  │ upload-logo POST   │                                             │
│  └────────┬───────────┘                                             │
│           │                                                         │
└───────────┼─────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Supabase (PostgreSQL)                          │
│                                                                     │
│  ┌────────────┐   ┌────────────┐   ┌──────────────────┐            │
│  │   users    │───│   quotes   │───│ quote_line_items  │            │
│  │            │   │            │   │                    │            │
│  │ clerk_id   │   │ user_id FK │   │ quote_id FK        │            │
│  │ company    │   │ status     │   │ description        │            │
│  │ logo_url   │   │ total_chf  │   │ qty, unit_price    │            │
│  │ plan       │   │ offerten_  │   │ total_chf          │            │
│  │ stripe_id  │   │ nummer     │   │ sort_order         │            │
│  └────────────┘   └────────────┘   └──────────────────┘            │
│                                                                     │
│  ┌────────────────────────────┐                                     │
│  │ Storage: logos/ bucket     │                                     │
│  │ (public, per-user folders) │                                     │
│  └────────────────────────────┘                                     │
│                                                                     │
│  Row Level Security (RLS) enabled on all tables                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Model

### `users`

| Column                   | Type       | Description                              |
|--------------------------|------------|------------------------------------------|
| `id`                     | UUID (PK)  | Auto-generated                           |
| `clerk_id`               | TEXT       | Clerk user ID (unique)                   |
| `company_name`           | TEXT       | Company name shown on quotes             |
| `logo_url`               | TEXT       | Public URL to uploaded logo              |
| `address`                | TEXT       | Multi-line address (street, city, etc.)  |
| `qr_iban`                | TEXT       | Swiss QR-IBAN for invoices               |
| `default_terms`          | TEXT       | Default payment terms text               |
| `default_validity_days`  | INTEGER    | Default quote validity (default: 30)     |
| `plan`                   | TEXT       | `free`, `pro`, or `team` (default: free) |
| `stripe_customer_id`     | TEXT       | Stripe customer ID (set on first checkout)|
| `created_at`             | TIMESTAMPTZ| Auto-set                                 |

### `quotes`

| Column             | Type       | Description                                   |
|--------------------|------------|-----------------------------------------------|
| `id`               | UUID (PK)  | Auto-generated                                |
| `user_id`          | UUID (FK)  | References `users.id`, cascade delete         |
| `input_text`       | TEXT       | Original free-text input from contractor      |
| `structured_json`  | JSONB      | Full Claude-generated quote data              |
| `status`           | TEXT       | `draft`, `sent`, or `approved`                |
| `client_name`      | TEXT       | Client name                                   |
| `client_email`     | TEXT       | Client email                                  |
| `total_chf`        | NUMERIC    | Grand total in CHF                            |
| `language`         | TEXT       | `de`, `fr`, `it`, or `en`                     |
| `offerten_nummer`  | TEXT       | Unique quote number (e.g. OFF-20260429-1234)  |
| `created_at`       | TIMESTAMPTZ| Auto-set                                      |
| `sent_at`          | TIMESTAMPTZ| When email was sent                           |

### `quote_line_items`

| Column          | Type       | Description                            |
|-----------------|------------|----------------------------------------|
| `id`            | UUID (PK)  | Auto-generated                         |
| `quote_id`      | UUID (FK)  | References `quotes.id`, cascade delete |
| `description`   | TEXT       | Line item description                  |
| `qty`           | NUMERIC    | Quantity                               |
| `unit`          | TEXT       | Unit (m², Std., Stück, etc.)           |
| `unit_price_chf`| NUMERIC    | Unit price in CHF                      |
| `total_chf`     | NUMERIC    | qty × unit_price_chf                   |
| `sort_order`    | INTEGER    | Display order                          |

---

## Request Flows

### Quote Generation Flow

```
User types job description
         │
         ▼
POST /api/generate-quote
  { input, client_name, client_email }
         │
         ├── Clerk auth check (JWT via middleware)
         │
         ├── Fetch user profile from Supabase
         │   └── Check plan limits (free: 3/month)
         │
         ├── Call Claude API (claude-sonnet-4-20250514)
         │   ├── System prompt: Swiss contractor assistant
         │   ├── Input: free-text job description
         │   └── Output: structured JSON (line items, totals, MWST 8.1%)
         │
         ├── Save quote + line items to Supabase
         │
         └── Return structured data to client
             { success, data, quoteId, offerten_nummer }
         │
         ▼
Client renders editable table
  - User can adjust qty and unit_price
  - Totals recalculate client-side
         │
    ┌────┴────┐
    │         │
    ▼         ▼
  PDF       Email
```

### PDF Generation Flow

```
POST /api/generate-pdf
  { quote, profile, client_name, offerten_nummer }
         │
         ├── Validate request body
         │
         ├── Render QuotePdfDocument via @react-pdf/renderer
         │   ├── A4 page with Swiss formatting
         │   ├── Company logo (Pro plan only, via Image component)
         │   ├── Line items table with CHF formatting
         │   ├── MWST calculation breakdown
         │   ├── Payment terms section
         │   ├── Signature line
         │   └── Watermark footer (free plan only)
         │
         └── Return PDF as binary attachment
             Content-Type: application/pdf
```

### Email Flow

```
POST /api/send-email
  { quoteId, quote, client_name, client_email, offerten_nummer }
         │
         ├── Clerk auth check
         ├── Fetch user profile (for branding)
         ├── Verify quote ownership
         ├── Render PDF (same as generate-pdf)
         ├── Send via Resend
         │   ├── From: company name <onboarding@resend.dev>
         │   ├── To: client_email
         │   ├── Subject: "Offerte OFF-xxx – Company Name"
         │   ├── HTML body with greeting
         │   └── Attachment: PDF binary (base64)
         │
         └── Update quote status → "sent"
             Set sent_at timestamp
```

### User Lifecycle Flow

```
Clerk Sign-Up
      │
      ▼
Clerk sends user.created webhook
      │
      ▼
POST /api/clerk/webhook
      │
      ├── Verify Svix signature
      ├── Extract clerk_id from payload
      ├── INSERT INTO users (clerk_id) — creates row with plan='free'
      └── Return 200
      │
      ▼
User redirected to /neue-offerte
      │
      ├── /api/user/profile → returns profile (GET)
      ├── User fills in company details in /einstellungen
      └── User uploads logo → /api/user/upload-logo
            │
            ├── Upload to Supabase Storage (logos/{userId}/logo.ext)
            ├── Get public URL
            └── Update users.logo_url
```

### Subscription Flow

```
User clicks "Auf Pro upgraden"
      │
      ▼
POST /api/stripe/checkout
      │
      ├── Fetch user, create Stripe customer if needed
      ├── Create Checkout Session
      │   └── mode: subscription, price: STRIPE_PRO_PRICE_ID
      └── Return checkout URL
      │
      ▼
User completes Stripe Checkout
      │
      ▼
Stripe sends checkout.session.completed webhook
      │
      ▼
POST /api/stripe/webhook
      │
      ├── Verify Stripe signature
      ├── Extract clerk_id from session metadata
      ├── UPDATE users SET plan = 'pro' WHERE clerk_id = ...
      └── Return 200
      │
      ▼
User redirected to /einstellungen?upgraded=true
```

---

## API Reference

### Quote Endpoints

| Method | Path                         | Auth | Description                          |
|--------|------------------------------|------|--------------------------------------|
| POST   | `/api/generate-quote`        | Yes  | Generate quote via Claude, save to DB|
| POST   | `/api/generate-pdf`          | No   | Render quote as PDF (data in body)   |
| POST   | `/api/send-email`            | Yes  | Render PDF + send via Resend         |
| GET    | `/api/quotes`                | Yes  | List user's quotes                   |
| GET    | `/api/quotes/[id]`           | Yes  | Get single quote                     |
| PATCH  | `/api/quotes/[id]`           | Yes  | Update quote status                  |
| DELETE | `/api/quotes/[id]`           | Yes  | Delete quote                         |
| POST   | `/api/quotes/[id]/duplicate` | Yes  | Duplicate quote with new number      |

### User Endpoints

| Method | Path                     | Auth | Description                       |
|--------|--------------------------|------|-----------------------------------|
| GET    | `/api/user/profile`      | Yes  | Get user profile                  |
| PATCH  | `/api/user/profile`      | Yes  | Update company info               |
| POST   | `/api/user/upload-logo`  | Yes  | Upload logo to Supabase Storage   |

### Stripe Endpoints

| Method | Path                      | Auth | Description                       |
|--------|---------------------------|------|-----------------------------------|
| POST   | `/api/stripe/checkout`    | Yes  | Create checkout session           |
| POST   | `/api/stripe/portal`      | Yes  | Create billing portal session     |
| POST   | `/api/stripe/webhook`     | No   | Handle Stripe events (signature)  |

### Webhook Endpoints

| Method | Path                      | Auth | Description                       |
|--------|---------------------------|------|-----------------------------------|
| POST   | `/api/clerk/webhook`      | No   | Clerk user.created (Svix sig)     |

---

## Security Model

### Authentication

- **Clerk** handles all authentication via JWTs.
- The Clerk middleware (`src/middleware.ts`) protects all routes except `/`, `/sign-in`, `/sign-up`, and `/api/clerk/webhook`.
- API routes call `auth()` to get the current `userId`.

### Authorization (Row Level Security)

- Supabase RLS policies ensure users can only access their own data.
- All policies match on `clerk_id = auth.jwt()->>'sub'`.
- The service role key (admin) bypasses RLS for server-side operations.

### API Route Security

| Route                    | Protection Mechanism              |
|--------------------------|-----------------------------------|
| `/api/generate-quote`    | Clerk auth + plan limit check     |
| `/api/generate-pdf`      | None (data passed in request body)|
| `/api/send-email`        | Clerk auth + quote ownership check|
| `/api/stripe/webhook`    | Stripe signature verification     |
| `/api/clerk/webhook`     | Svix signature verification       |
| `/api/user/*`            | Clerk auth                        |
| `/api/quotes/*`          | Clerk auth                        |

### Secrets Management

- All secrets are stored in environment variables (never in code).
- `.env.local` is gitignored.
- On Vercel, secrets are stored in project environment variables.
- The Supabase service role key is only used server-side (never exposed to the client).

---

## Plan Limits

| Feature                  | Free Plan    | Pro Plan        |
|--------------------------|--------------|-----------------|
| Quotes per month         | 3            | Unlimited       |
| PDF generation           | Yes          | Yes             |
| Email sending            | Yes          | Yes             |
| Logo in PDF              | Watermark    | Custom logo     |
| PDF watermark footer     | Yes          | No              |
| Quote history            | Yes          | Yes             |
| Company branding         | Yes          | Yes             |

---

## File Structure

```
quote-gen/
├── supabase/
│   └── schema.sql                    # Database schema, RLS policies
├── src/
│   ├── app/
│   │   ├── layout.tsx                # Root layout (ClerkProvider)
│   │   ├── page.tsx                  # Landing page (public)
│   │   ├── middleware.ts             # Auth middleware
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx            # Dashboard layout (sidebar)
│   │   │   ├── neue-offerte/
│   │   │   │   └── page.tsx          # Quote creation + editor
│   │   │   ├── offerten-verlauf/
│   │   │   │   └── page.tsx          # Quote history
│   │   │   └── einstellungen/
│   │   │       └── page.tsx          # Settings + subscription
│   │   └── api/
│   │       ├── clerk/
│   │       │   └── webhook/
│   │       │       └── route.ts      # Clerk user.created handler
│   │       ├── generate-quote/
│   │       │   └── route.ts          # Claude → structured quote
│   │       ├── generate-pdf/
│   │       │   └── route.ts          # React-PDF → PDF download
│   │       ├── send-email/
│   │       │   └── route.ts          # PDF + Resend email
│   │       ├── quotes/
│   │       │   ├── route.ts          # GET list
│   │       │   └── [id]/
│   │       │       ├── route.ts      # GET/PATCH/DELETE
│   │       │       └── duplicate/
│   │       │           └── route.ts  # POST duplicate
│   │       ├── user/
│   │       │   ├── profile/
│   │       │   │   └── route.ts      # GET/PATCH profile
│   │       │   └── upload-logo/
│   │       │       └── route.ts      # POST logo upload
│   │       └── stripe/
│   │           ├── checkout/
│   │           │   └── route.ts      # POST create checkout
│   │           ├── portal/
│   │           │   └── route.ts      # POST billing portal
│   │           └── webhook/
│   │               └── route.ts      # POST Stripe events
│   ├── components/
│   │   ├── sidebar.tsx               # Dashboard navigation
│   │   └── quote-pdf.tsx             # React-PDF template
│   ├── lib/
│   │   ├── claude.ts                 # Claude API client + prompt
│   │   ├── supabase.ts              # Supabase client + admin
│   │   └── stripe.ts                # Stripe instance
│   └── types/
│       └── index.ts                  # TypeScript type definitions
├── .env.local.example                # Environment variable template
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.mjs
```

---

## External Service Dependencies

### Anthropic Claude

- **Model**: `claude-sonnet-4-20250514`
- **Endpoint**: `https://api.anthropic.com/v1/messages`
- **Max tokens**: 4096
- **Usage**: ~500-2000 tokens per quote generation
- **System prompt**: Swiss-specific contractor assistant with JSON-only output

### Supabase

- **Database**: PostgreSQL with RLS
- **Storage**: `logos` bucket (public, per-user folders)
- **Auth integration**: JWT `sub` claim matched to `clerk_id`
- **Admin access**: Service role key for server-side operations

### Clerk

- **Events used**: `user.created` (webhook)
- **JWT**: Included in all requests via Clerk middleware
- **UserButton**: Client-side component for profile/sign-out

### Stripe

- **Mode**: Subscriptions
- **Events listened**: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- **Metadata**: `clerk_id` stored on customer and session for user matching

### Resend

- **Usage**: Transactional email with PDF attachment
- **From address**: Configurable per deployment (defaults to `onboarding@resend.dev` for testing)
- **Attachment**: PDF rendered server-side, sent as base64

---

## Error Handling Strategy

| Error Source        | Handling                                                    |
|---------------------|-------------------------------------------------------------|
| Claude API failure  | Returns `AI returned invalid JSON` or HTTP 500 with message|
| Claude non-JSON     | Caught by JSON.parse, returns raw text in response          |
| Supabase errors     | Logged to console, returns 500 to client                    |
| Auth failure        | Returns 401, Clerk redirects to sign-in                     |
| Plan limit exceeded | Returns 403 with upgrade message                            |
| Stripe webhook fail | Logged, returns 400 (Stripe retries automatically)          |
| Resend failure      | Returns 500 with "Failed to send email"                     |
| File upload error   | Returns 400 (wrong type/size) or 500 (upload failed)        |
