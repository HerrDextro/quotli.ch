-- QuoteGen Supabase Schema
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_id TEXT NOT NULL UNIQUE,
  company_name TEXT,
  logo_url TEXT,
  address TEXT,
  qr_iban TEXT,
  default_terms TEXT,
  default_validity_days INTEGER NOT NULL DEFAULT 30,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'team')),
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quotes table
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  input_text TEXT NOT NULL,
  structured_json JSONB,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved')),
  client_name TEXT,
  client_email TEXT,
  total_chf NUMERIC(12, 2) NOT NULL DEFAULT 0,
  language TEXT NOT NULL DEFAULT 'de' CHECK (language IN ('de', 'fr', 'it', 'en')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  offerten_nummer TEXT,
  sent_at TIMESTAMPTZ
);

-- Quote line items table
CREATE TABLE quote_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  qty NUMERIC(12, 2) NOT NULL,
  unit TEXT NOT NULL,
  unit_price_chf NUMERIC(12, 2) NOT NULL,
  total_chf NUMERIC(12, 2) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Indexes
CREATE INDEX idx_quotes_user_id ON quotes(user_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_created_at ON quotes(created_at DESC);
CREATE INDEX idx_quote_line_items_quote_id ON quote_line_items(quote_id);

-- RLS Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;

-- Users can only read/update their own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (clerk_id = auth.jwt()->>'sub');

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (clerk_id = auth.jwt()->>'sub');

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (clerk_id = auth.jwt()->>'sub');

-- Quotes: users can only access their own quotes
CREATE POLICY "Users can view own quotes"
  ON quotes FOR SELECT
  USING (user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'));

CREATE POLICY "Users can create own quotes"
  ON quotes FOR INSERT
  WITH CHECK (user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'));

CREATE POLICY "Users can update own quotes"
  ON quotes FOR UPDATE
  USING (user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'));

CREATE POLICY "Users can delete own quotes"
  ON quotes FOR DELETE
  USING (user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'));

-- Line items: accessible through quote ownership
CREATE POLICY "Users can view own line items"
  ON quote_line_items FOR SELECT
  USING (quote_id IN (SELECT id FROM quotes WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub')));

CREATE POLICY "Users can create own line items"
  ON quote_line_items FOR INSERT
  WITH CHECK (quote_id IN (SELECT id FROM quotes WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub')));

CREATE POLICY "Users can update own line items"
  ON quote_line_items FOR UPDATE
  USING (quote_id IN (SELECT id FROM quotes WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub')));

CREATE POLICY "Users can delete own line items"
  ON quote_line_items FOR DELETE
  USING (quote_id IN (SELECT id FROM quotes WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub')));

-- Function to auto-create user on first sign-in
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (clerk_id)
  VALUES (NEW.id::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: The above trigger assumes Clerk user IDs are passed as JWT sub claims.
-- Adjust the trigger based on your Clerk-Supabase integration strategy.

-- Storage bucket for user logos (run in Supabase Dashboard > Storage or via CLI)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true);

-- Storage policy: users can upload their own logo
-- CREATE POLICY "Users can upload own logo"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'logos' AND (storage.foldername(name))[1] = (SELECT id::text FROM users WHERE clerk_id = auth.jwt()->>'sub'));

-- CREATE POLICY "Users can update own logo"
--   ON storage.objects FOR UPDATE
--   USING (bucket_id = 'logos' AND (storage.foldername(name))[1] = (SELECT id::text FROM users WHERE clerk_id = auth.jwt()->>'sub'));

-- CREATE POLICY "Anyone can view logos"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'logos');
