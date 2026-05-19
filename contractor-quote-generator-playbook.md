# Contractor Quote Generator — Full Playbook
### AI-powered quoting tool for trades. $1K in week 1.

---

## What You're Building

A web app where contractors type or paste job details and get a polished, branded PDF quote in under 30 seconds. Runs in the browser, no downloads, works on their phone.

**The flow:**

1. **Contractor logs in** — their company name, logo, and contact info are already saved. No re-entering every time.
2. **They describe the job** — a single text box: *"New roof install, 2400 sqft, tear off old shingles, 30yr architectural shingles, 2 skylights, materials ~$4800, 3 man crew 2 days"*. No forms. Just talk.
3. **AI structures the quote** — Claude extracts line items, calculates totals, adds standard terms and a professional intro. Editable before generating.
4. **PDF is generated** — branded with their logo, includes itemized costs, validity date, payment terms, and signature line. Download or email directly to the client.
5. **Optional: client approval link** — contractor shares a link. Client clicks "Approve" — contractor gets notified instantly.

**Trades to target first:** Roofing · HVAC · Landscaping · Plumbing · Painting · General contractor · Electrical · Flooring

**MVP features (week 1 only):**
- Text → PDF quote (the core — get this perfect first)
- Custom branding (logo upload + company name on every quote)
- Quote history (every quote saved, duplicatable)
- Email to client (one click sends the PDF from inside the app)

---

## Tech Stack

| Role | Tool | Why | Cost |
|------|------|-----|------|
| Framework | Next.js 14 | App Router + API routes + Vercel deploy. Fastest way to ship full-stack solo. | Free |
| AI | Claude API (claude-sonnet-4-20250514) | Best at following structured output instructions — critical for clean JSON from messy input. | ~$0.003/quote |
| PDF | React-PDF | Pixel-perfect PDFs server-side. Much easier than Puppeteer. Good logo/font support. | Free |
| Auth | Clerk | 10 min to set up. Free up to 10k monthly active users. | Free |
| Database | Supabase | Postgres + file storage for logos. Free tier handles hundreds of users. | Free |
| Payments | Stripe | Subscriptions + one-time setup fees. Use Stripe Checkout — don't build your own payment UI. | 2.9% + 30¢ |
| Email | Resend | Contractors email quotes to clients from inside the app. 3k emails/mo free. | Free |
| Hosting | Vercel | Zero config deploys. Free hobby tier is more than enough to start. | Free |

**Your monthly cost before your first paying customer: ~$0.**

---

## The Claude Prompt (Core of the Product)

This is the most important piece of code you'll write. Get this right and the product works.

```
You are a professional estimating assistant for contractors. The contractor will describe a job in plain language. Extract and structure the following:

1. A list of line items (description, quantity, unit, unit price, total)
2. A subtotal, tax (ask for rate or use 0%), and grand total
3. A 2-sentence professional summary of the scope of work
4. Recommended payment terms (e.g. 50% deposit, 50% on completion)
5. Quote validity period (default: 30 days)

Return ONLY valid JSON. No preamble. No markdown.

Schema:
{
  "summary": "string",
  "line_items": [{ "description": "string", "qty": number, "unit": "string", "unit_price": number, "total": number }],
  "subtotal": number,
  "tax_rate": number,
  "tax_amount": number,
  "grand_total": number,
  "payment_terms": "string",
  "valid_days": number
}

Contractor input: {{USER_INPUT}}
```

**Why this structure:** Pure JSON means you can validate it, auto-fill the PDF template, and let contractors edit individual line items before generating. The "no preamble" instruction is critical — without it Claude sometimes returns markdown code fences that break your JSON.parse().

---

## 7-Day Build Plan

### Day 1 — Project scaffold + auth
- `npx create-next-app`, push to GitHub
- Install and configure Clerk (login, signup pages)
- Create Supabase project, set up `quotes` table and `user_profiles` table
- Basic dashboard shell with nav

### Day 2 — Claude integration + quote editor
- Build the input form (big textarea + "Generate quote" button)
- Wire up the Claude API with the prompt above
- Parse JSON response, display editable line items table
- Let contractor tweak quantities and prices before finalising

### Day 3 — PDF generation
- Install react-pdf, build quote PDF template
- Logo upload to Supabase storage, rendered in PDF header
- "Download PDF" button works end-to-end
- Save completed quotes to Supabase

### Day 4 — Email + quote history
- Resend integration: "Email to client" button sends PDF as attachment
- Quote history page: list of past quotes with status (draft / sent / approved)
- Duplicate quote feature (massive time saver for repeat job types)

### Day 5 — Stripe + account settings
- Stripe Checkout for subscription setup
- Webhook to update user plan in Supabase on payment
- Gate "unlimited quotes" behind Pro plan
- Company settings page: name, logo, address, default terms

### Day 6 — Landing page + deploy
- Build the landing page (copy below)
- Deploy to Vercel, connect custom domain (~$12/yr on Namecheap)
- Test the entire flow end-to-end on mobile — contractors are on their phones
- Record a 2-min Loom demo video

### Day 7 — Sell
- Post in 5 Facebook contractor groups (scripts below)
- DM 30 contractors on LinkedIn
- Offer first 10 customers a locked-in founding member price
- Personally onboard every signup — jump on a Loom call if needed

**Biggest risks:**

- *Claude returns malformed JSON* → Wrap in try/catch. On parse failure, show raw text and let them paste into the editor manually. Log every failure and fix the prompt.
- *Contractors don't convert to paid* → Add a Calendly link for a 10-min demo call. Talk to every free user personally. Conversion happens in conversation, not the UI.

---

## Landing Page Copy

Write for someone reading on their phone between jobs. Short sentences. No jargon. One job: get them to start a free trial.

---

**Hero headline:**
> Stop losing evenings to paperwork.
> Send professional quotes in 30 seconds.

**Subheadline:**
> Just describe the job. QuoteFast writes the quote, builds the PDF, and emails it to your client — while you're still on site.

---

**Pain point section (above the fold):**
> Every quote you write by hand is an hour you didn't charge for.
>
> Most contractors spend 6–10 hours a week on quotes, proposals, and follow-ups. That's $600–$1,000 of unbillable time — every single week.
>
> There's a better way.

---

**How it works (3 steps):**
> **1. Describe the job in plain English**
> No forms. No templates. Just tell QuoteFast what the job involves — materials, labour, scope.
>
> **2. Review and adjust**
> Your quote appears in seconds, fully itemised. Edit any line before generating.
>
> **3. Send to your client**
> Download the branded PDF or email it directly. Done.

---

**Social proof (swap in real testimonials ASAP):**
> *"I used to spend Sunday nights doing quotes. Now I do them in the truck before I drive away."*
> — Mike R., roofing contractor
>
> *"Closed a $12,000 job because I sent the quote 20 minutes after the walkthrough. Client said no one else had ever done that."*
> — Dave T., HVAC

---

**Objection handling:**
> **Will it look professional?**
> Yes. Your logo, your company name, your pricing — formatted like a proper proposal, not a spreadsheet screenshot.
>
> **Do I need to be technical?**
> No. If you can describe a job to a customer, you can use QuoteFast.
>
> **What if the numbers are wrong?**
> You review every quote before sending. Change anything you want.

---

**CTA:**
> Try it free for 14 days. No credit card needed.
> If it doesn't save you 5 hours in your first week, cancel and pay nothing.

---

## Outreach Scripts

### Facebook Group Post
*(Use in groups like "HVAC Business Owners", "Roofing Contractors Network", "Painting Contractors", "Plumbing Contractors", "Landscaping Business Owners")*

> Quick question for the group —
>
> How long does it take you to put together a detailed quote?
>
> I just launched a tool that lets you describe a job in plain language and get back a formatted PDF quote with line items in about 30 seconds. Built it because a contractor friend was spending his Sunday evenings on paperwork.
>
> Looking for 10 contractors to try it free for 2 weeks and give me honest feedback. DM me if you're interested — I'll set you up today.

**Group rules:** Never drop a link in the first post — offer to DM the link instead. Engage genuinely for 2–3 days before posting if the group is strict.

---

### LinkedIn DM
*(Search: "roofing contractor", "HVAC owner", "general contractor" — filter to 2nd connections)*

> Hey [Name] —
>
> Quick one: how much time do you spend writing quotes each week?
>
> I built a tool for contractors that turns a plain-English job description into a formatted PDF quote in under a minute. Your branding, line items, totals, payment terms — ready to send.
>
> Happy to set you up on a free 2-week trial if you want to test it. No pitch, just want real feedback from someone in the field.
>
> Worth a look?

---

### Cold Email
*(Find emails from Google Maps business listings)*

> **Subject: Quotes in 30 seconds (free trial for local contractors)**
>
> Hi [Name],
>
> I built a tool that writes contractor quotes from plain-English job descriptions — formatted PDF with your branding, line items, totals, and payment terms. Takes about 30 seconds.
>
> Offering local contractors a free 2-week trial before I open it up more broadly.
>
> Would you want to try it? I can set you up today.
>
> [Your name]
> [Link to landing page]

---

### Follow-up (send 3 days after no reply)

> Hey [Name] — just bumping this in case it got buried.
>
> Here's a 2-min demo so you can see exactly what it does: [Loom link]
>
> Happy to set you up for free this week if you want to try it on a real job.

---

## Pricing

| Plan | Price | What's included |
|------|-------|-----------------|
| Free | $0/mo | 5 quotes/month, QuoteFast branding |
| Pro | $149/mo | Unlimited quotes, your logo, email to client, quote history, duplicate quotes |
| Team | $299/mo | Everything in Pro + up to 5 users, client approval link, analytics |

---

### Launch Pricing Tactics

**1. Founding member offer**
First 10 customers get Pro at **$79/mo locked for life**. Creates urgency, generates cash fast, and gives you loyal advocates who feel invested in your success.

**2. One-time setup fee**
Charge **$199 upfront** for the first week. Covers onboarding, logo setup, and building their custom default terms template. Converts better than you'd think — serious buyers pay to start.

**3. Annual discount**
Offer 2 months free on annual ($1,490/yr vs $1,788). Gets you upfront cash and locks in retention. Don't offer this in week 1 — wait until someone asks.

---

### Path to $1K in Week 1

| Scenario | Math | Result |
|----------|------|--------|
| **Fastest** | 5 customers × $199 setup fee | **$995 ✓** |
| **Mixed** | 3 × $199 setup + 3 × $79 first month | $597 + $237 = $834 |
| **Pure subscription** | 7 × $149/mo first charge | $1,043 ✓ |

> The setup fee is the unlock. Without it, you're waiting on monthly billing cycles. With it, every signup is immediate cash. Position it as: *"I personally onboard you, configure your branding, and build your default terms template."*

---

## Key Things That Aren't Obvious

- **Test on mobile before launch.** Contractors use this between jobs, on a job site, on their phone. If the textarea is annoying on iOS or the PDF download breaks on Android, you lose half your signups.
- **The Facebook group post will outperform LinkedIn for week 1.** Contractors are tribal and they trust their trade groups. A genuine post in a 20k-member HVAC group can get 50 DMs in a day.
- **Talk to every free user personally.** Don't rely on the UI to convert them. A 10-minute Loom call where you walk them through their first quote will close more than any in-app prompt.
- **Don't skip the duplicate quote feature.** Contractors do the same job types over and over. Roofing quote → duplicate → change square footage → done. This alone makes the product sticky.
