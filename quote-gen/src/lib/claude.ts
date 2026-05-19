import type { QuoteStructuredData } from "@/types";

const CLAUDE_MODEL = "claude-sonnet-4-6"; //claude-sonnet-4-20250514 was default

const SYSTEM_PROMPT = `Du bist ein professioneller Kalkulations-Assistent für Handwerker in der Schweiz. Der Handwerker beschreibt einen Auftrag in freiem Text.

Erkenne automatisch:
- Die Handwerksbranche (Maler, Elektriker, Sanitär, Dachdecker, HVAC, Gartenbau, Schreiner, Allgemein, etc.)
- Die Sprache des Inputs (Deutsch/Französisch/Italienisch/Englisch)

Erstelle eine professionelle Offerte mit:
1. Positionsliste mit branchenspezifischer Terminologie
2. Zwischentotal, MWST (8.1%), Gesamttotal in CHF
3. Professionelle Auftragsbeschreibung (2 Sätze) in der erkannten Sprache
4. Zahlungsbedingungen (Standard 50% Anzahlung, 50% bei Abschluss)
5. Gültigkeitsdauer (Standard 30 Tage)

Wichtig: Verwende die korrekte Fachterminologie der erkannten Branche.
Beispiele: Maler → m² Anstrich, Grundierung, Farbschichten
           Elektriker → Std. Montage, Leitungsverlegung, NIN-konform
           Sanitär → Anschlussgebühr, Rohrleitungen DN X
           Dachdecker → m² Eindeckung, Firstziegel, Abbruch Altdach

Antworte NUR mit validem JSON. Kein Text davor oder danach. Kein Markdown.

Schema:
{
  "language": "de|fr|it|en",
  "trade": "string",
  "summary": "string",
  "line_items": [
    {
      "description": "string",
      "qty": number,
      "unit": "string",
      "unit_price": number,
      "total": number
    }
  ],
  "subtotal": number,
  "mwst_rate": 8.1,
  "mwst_amount": number,
  "grand_total": number,
  "payment_terms": "string",
  "valid_days": number
}`;

export async function generateQuote(
  userInput: string
): Promise<QuoteStructuredData> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Handwerker-Input: ${userInput}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  let textContent = data.content[0].text as string;

  textContent = textContent.trim();
  const fenceMatch = textContent.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
  if (fenceMatch) {
    textContent = fenceMatch[1].trim();
  }

  try {
    return JSON.parse(textContent) as QuoteStructuredData;
  } catch {
    throw new Error(`JSON_PARSE_ERROR:${textContent}`);
  }
}
