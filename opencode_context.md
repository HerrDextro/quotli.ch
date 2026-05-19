You are building a Swiss contractor quoting web app called [AppName].

TECH STACK
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Clerk (auth)
- Supabase (Postgres + file storage)
- Claude API via claude-sonnet-4-20250514 (quote generation)
- React-PDF (PDF generation)
- Resend (email)
- Stripe (subscriptions)

WHAT THE APP DOES
A contractor describes a job in plain text. The AI structures it into a
professional PDF quote with line items, totals, Swiss MWST (8.1%), and
payment terms. The contractor reviews, edits, downloads or emails the PDF.

SWISS-SPECIFIC REQUIREMENTS — these are non-negotiable
- All monetary values in CHF
- MWST rate 8.1% (variable, stored in config not hardcoded)
- Swiss QR-Rechnung on invoices (QR-IBAN format)
- Quote document language must match the job description language
  (auto-detect German  French  Italian  English)
- Date format DD.MM.YYYY
- PDF must include Absender, Empfänger, Offertennummer, Datum,
  Gültigkeitsdatum, Positionen, Zwischentotal, MWST, Gesamttotal,
  Zahlungsbedingungen, Unterschriftszeile

DATABASE SCHEMA (Supabase)
- users (id, clerk_id, company_name, logo_url, address, qr_iban,
  default_terms, default_validity_days, plan, created_at)
- quotes (id, user_id, input_text, structured_json, status
  [draftsentapproved], client_name, client_email, total_chf,
  language, created_at, sent_at)
- quote_line_items (id, quote_id, description, qty, unit,
  unit_price_chf, total_chf, sort_order)

QUOTE GENERATION FLOW
1. User submits textarea input
2. POST apigenerate-quote → calls Claude API with structured prompt
3. Claude returns JSON (see schema below)
4. Frontend displays editable line items table
5. User edits if needed, clicks PDF generieren
6. POST apigenerate-pdf → React-PDF builds branded PDF
7. User downloads or clicks Per E-Mail senden

CLAUDE API PROMPT (use exactly this in apigenerate-quote)

Du bist ein professioneller Kalkulations-Assistent für Handwerker in der
Schweiz. Der Handwerker beschreibt einen Auftrag in freiem Text.

Erkenne automatisch
- Die Handwerksbranche (Maler, Elektriker, Sanitär, Dachdecker, HVAC,
  Gartenbau, Schreiner, Allgemein, etc.)
- Die Sprache des Inputs (DeutschFranzösischItalienischEnglisch)

Erstelle eine professionelle Offerte mit
1. Positionsliste mit branchenspezifischer Terminologie
2. Zwischentotal, MWST (8.1%), Gesamttotal in CHF
3. Professionelle Auftragsbeschreibung (2 Sätze) in der erkannten Sprache
4. Zahlungsbedingungen (Standard 50% Anzahlung, 50% bei Abschluss)
5. Gültigkeitsdauer (Standard 30 Tage)

Wichtig Verwende die korrekte Fachterminologie der erkannten Branche.
Beispiele Maler → m² Anstrich, Grundierung, Farbschichten
           Elektriker → Std. Montage, Leitungsverlegung, NIN-konform
           Sanitär → Anschlussgebühr, Rohrleitungen DN X
           Dachdecker → m² Eindeckung, Firstziegel, Abbruch Altdach

Antworte NUR mit validem JSON. Kein Text davor oder danach. Kein Markdown.

Schema
{
  language defriten,
  trade string,
  summary string,
  line_items [
    {
      description string,
      qty number,
      unit string,
      unit_price number,
      total number
    }
  ],
  subtotal number,
  mwst_rate 8.1,
  mwst_amount number,
  grand_total number,
  payment_terms string,
  valid_days number
}

Handwerker-Input {{USER_INPUT}}


ERROR HANDLING
- Wrap all Claude API calls in trycatch
- If JSON.parse fails, log the raw response and return a 422 with the
  raw text so the frontend can show a fallback editor
- Never expose API keys in client components

PLAN LIMITS
- Free 5 quotesmonth, watermark Erstellt mit [AppName] in PDF footer
- Pro (CHF 49mo) unlimited quotes, own logo, email to client,
  quote history, duplicate feature
- Team (CHF 99mo) up to 5 users, client approval link, analytics

CODE STYLE
- TypeScript strict mode
- All API routes in appapi
- Shared types in typesindex.ts
- Supabase client in libsupabase.ts
- Claude client in libclaude.ts
- No any types
- Error boundaries on all major components