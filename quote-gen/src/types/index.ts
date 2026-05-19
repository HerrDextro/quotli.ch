export type QuoteStatus = "draft" | "sent" | "approved";

export type Plan = "free" | "pro" | "team";

export type SupportedLanguage = "de" | "fr" | "it" | "en";

export interface User {
  id: string;
  clerk_id: string;
  company_name: string | null;
  logo_url: string | null;
  address: string | null;
  qr_iban: string | null;
  default_terms: string | null;
  default_validity_days: number;
  plan: Plan;
  stripe_customer_id: string | null;
  created_at: string;
}

export interface Quote {
  id: string;
  user_id: string;
  input_text: string;
  structured_json: QuoteStructuredData | null;
  status: QuoteStatus;
  client_name: string | null;
  client_email: string | null;
  total_chf: number;
  language: SupportedLanguage;
  offerten_nummer: string | null;
  created_at: string;
  sent_at: string | null;
}

export interface QuoteLineItem {
  id: string;
  quote_id: string;
  description: string;
  qty: number;
  unit: string;
  unit_price_chf: number;
  total_chf: number;
  sort_order: number;
}

export interface QuoteLineItemInput {
  description: string;
  qty: number;
  unit: string;
  unit_price: number;
  total: number;
}

export interface QuoteStructuredData {
  language: SupportedLanguage;
  trade: string;
  summary: string;
  line_items: QuoteLineItemInput[];
  subtotal: number;
  mwst_rate: number;
  mwst_amount: number;
  grand_total: number;
  payment_terms: string;
  valid_days: number;
}

export interface GenerateQuoteResponse {
  success: boolean;
  data?: QuoteStructuredData;
  raw?: string;
  error?: string;
  quoteId?: string;
  offerten_nummer?: string;
}

export interface PdfUserProfile {
  company_name: string;
  address: string;
  logo_url: string | null;
  plan: Plan;
}

export interface GeneratePdfRequest {
  quote: QuoteStructuredData;
  profile: PdfUserProfile;
  client_name: string;
  client_email: string;
  offerten_nummer: string;
}

export interface SendEmailRequest {
  quoteId: string;
  quote: QuoteStructuredData;
  client_name: string;
  client_email: string;
  offerten_nummer: string;
}

export interface QuoteWithItems {
  quote: Quote;
  line_items: QuoteLineItem[];
}
