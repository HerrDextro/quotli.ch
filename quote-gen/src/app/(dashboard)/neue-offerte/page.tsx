"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import type {
  QuoteStructuredData,
  QuoteLineItemInput,
  GenerateQuoteResponse,
  GeneratePdfRequest,
  SendEmailRequest,
  PdfUserProfile,
} from "@/types";

const PdfPreview = dynamic(() => import("@/components/pdf-preview"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-gray-100">
      <span className="text-sm text-gray-400">PDF-Vorschau lädt...</span>
    </div>
  ),
});

const MIN_CHARS = 20;
const AUTO_SAVE_DELAY = 1500;

function formatCHF(value: number): string {
  return value.toLocaleString("de-CH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function recalculate(items: QuoteLineItemInput[], mwstRate: number) {
  const updated = items.map((item) => ({
    ...item,
    total: Math.round(item.qty * item.unit_price * 100) / 100,
  }));
  const subtotal = updated.reduce((sum, i) => sum + i.total, 0);
  const mwstAmount = Math.round(subtotal * (mwstRate / 100) * 100) / 100;
  const grandTotal = Math.round((subtotal + mwstAmount) * 100) / 100;
  return { items: updated, subtotal, mwstAmount, grandTotal };
}

interface UsageInfo {
  plan: string;
  used: number;
  limit: number | null;
  reset_date: string;
  demo?: boolean;
}

export default function NeueOffertePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const [inputText, setInputText] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [quoteData, setQuoteData] = useState<QuoteStructuredData | null>(null);
  const [lineItems, setLineItems] = useState<QuoteLineItemInput[]>([]);
  const [totals, setTotals] = useState({
    subtotal: 0,
    mwstAmount: 0,
    grandTotal: 0,
  });
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [offertenNummer, setOffertenNummer] = useState<string | null>(null);
  const [profile, setProfile] = useState<PdfUserProfile | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftId = useRef<string | null>(null);
  const draftSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/user/profile");
        if (!res.ok) return;
        const data = await res.json();
        setProfile({
          company_name: data.company_name || "Firma",
          address: data.address || "Schweiz",
          logo_url: data.logo_url || null,
          plan: data.plan || "free",
        });
      } catch {
        setProfile({
          company_name: "Firma",
          address: "Schweiz",
          logo_url: null,
          plan: "free",
        });
      }
    }
    async function loadUsage() {
      try {
        const res = await fetch("/api/user/usage");
        if (!res.ok) return;
        const data = await res.json();
        setUsage(data);
      } catch {}
    }
    async function loadDraft() {
      if (editId) return;
      try {
        const res = await fetch("/api/draft");
        if (!res.ok) return;
        const data = await res.json();
        if (data.draft) {
          draftId.current = data.draft.id;
          setInputText(data.draft.input_text || "");
          setClientName(data.draft.client_name || "");
          setClientEmail(data.draft.client_email || "");
        }
      } catch {}
    }
    loadProfile();
    loadUsage();
    loadDraft();
  }, [editId]);

  const updateTotals = useCallback(
    (items: QuoteLineItemInput[], mwstRate: number) => {
      const result = recalculate(items, mwstRate);
      setLineItems(result.items);
      setTotals({
        subtotal: result.subtotal,
        mwstAmount: result.mwstAmount,
        grandTotal: result.grandTotal,
      });
    },
    []
  );

  const saveDraft = useCallback(async (text: string, cName: string, cEmail: string) => {
    if (!text.trim()) return;
    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft_id: draftId.current || undefined,
          input_text: text,
          client_name: cName,
          client_email: cEmail,
        }),
      });
      const data = await res.json();
      if (data.draft_id && !draftId.current) {
        draftId.current = data.draft_id;
      }
      setLastSaved(new Date());
    } catch {}
  }, []);

  const handleDraftChange = useCallback(
    (text: string, cName: string, cEmail: string) => {
      if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
      draftSaveTimer.current = setTimeout(() => {
        saveDraft(text, cName, cEmail);
      }, AUTO_SAVE_DELAY);
    },
    [saveDraft]
  );

  const triggerAutoSave = useCallback(
    (items: QuoteLineItemInput[], qData: QuoteStructuredData, qId: string, cName: string, cEmail: string) => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(async () => {
        try {
          const rec = recalculate(items, qData.mwst_rate);
          const updatedData: QuoteStructuredData = {
            ...qData,
            line_items: rec.items,
            subtotal: rec.subtotal,
            mwst_amount: rec.mwstAmount,
            grand_total: rec.grandTotal,
          };

          const res = await fetch(`/api/quotes/${qId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              structured_json: updatedData,
              total_chf: rec.grandTotal,
              client_name: cName || null,
              client_email: cEmail || null,
              line_items: rec.items,
            }),
          });
          if (res.ok) {
            setLastSaved(new Date());
          }
        } catch (err) {
          console.error("Auto-save error:", err);
        }
      }, 2000);
    },
    []
  );

  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    async function loadExisting() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/quotes/${editId}`);
        const json = await res.json();
        if (!json.success || !json.quote) {
          setError("Offerte nicht gefunden.");
          return;
        }
        if (cancelled) return;
        const q = json.quote;
        const structured = q.structured_json as QuoteStructuredData;
        if (!structured || !structured.line_items) {
          setError("Offerte hat keine strukturierten Daten.");
          return;
        }
        setQuoteData(structured);
        setQuoteId(q.id);
        setOffertenNummer(q.offerten_nummer);
        setClientName(q.client_name || "");
        setClientEmail(q.client_email || "");
        setInputText(q.input_text || "");
        updateTotals(structured.line_items, structured.mwst_rate);
      } catch {
        if (!cancelled) setError("Fehler beim Laden der Offerte.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    loadExisting();
    return () => { cancelled = true; };
  }, [editId, updateTotals]);

  useEffect(() => {
    if (!quoteData || !quoteId) return;
    const handler = () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = null;
        const items = lineItems;
        const rec = recalculate(items, quoteData.mwst_rate);
        const updatedData: QuoteStructuredData = {
          ...quoteData,
          line_items: rec.items,
          subtotal: rec.subtotal,
          mwst_amount: rec.mwstAmount,
          grand_total: rec.grandTotal,
        };
        fetch(`/api/quotes/${quoteId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            structured_json: updatedData,
            total_chf: rec.grandTotal,
            client_name: clientName || null,
            client_email: clientEmail || null,
            line_items: rec.items,
          }),
          keepalive: true,
        });
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [quoteData, quoteId, lineItems, clientName, clientEmail]);

  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
    };
  }, []);

  const handleSubmit = async () => {
    if (!inputText.trim() || inputText.trim().length < MIN_CHARS) return;
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);
    setQuoteData(null);
    setQuoteId(null);
    setOffertenNummer(null);
    setLineItems([]);
    setTotals({ subtotal: 0, mwstAmount: 0, grandTotal: 0 });

    try {
      const res = await fetch("/api/generate-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: inputText,
          client_name: clientName,
          client_email: clientEmail,
        }),
      });

      const json: GenerateQuoteResponse = await res.json();

      if (!json.success || !json.data) {
        if (res.status === 403) {
          setError(
            "Monatliches Limit erreicht (" + (usage?.limit ?? 3) + " Offerten/Monat). Upgrade auf Pro für unbegrenzte Offerten."
          );
        } else {
          setError(json.error ?? "Unknown error");
        }
        return;
      }

      const data = json.data;
      setQuoteData(data);
      setQuoteId(json.quoteId ?? null);
      setOffertenNummer(json.offerten_nummer ?? null);
      updateTotals(data.line_items, data.mwst_rate);
      setUsage((u) => (u ? { ...u, used: u.used + 1 } : u));
      draftId.current = null;
    } catch {
      setError(
        "Verbindung fehlgeschlagen. Bitte prüfe deine Internetverbindung und versuche es erneut."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemChange = (
    index: number,
    field: "qty" | "unit_price",
    value: string
  ) => {
    if (!quoteData || !quoteId) return;
    const updated = [...lineItems];
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) return;
    updated[index] = { ...updated[index], [field]: num };
    updateTotals(updated, quoteData.mwst_rate);
    triggerAutoSave(updated, quoteData, quoteId, clientName, clientEmail);
  };

  const getEditedQuote = (): QuoteStructuredData => {
    return {
      ...quoteData!,
      line_items: lineItems,
      subtotal: totals.subtotal,
      mwst_amount: totals.mwstAmount,
      grand_total: totals.grandTotal,
    };
  };

  const getPdfRequest = (): GeneratePdfRequest => ({
    quote: getEditedQuote(),
    profile: profile ?? {
      company_name: "Firma",
      address: "Schweiz",
      logo_url: null,
      plan: "free",
    },
    client_name: clientName || "Kunde",
    client_email: clientEmail,
    offerten_nummer: offertenNummer || "DRAFT",
  });

  const handleSaveDraft = async () => {
    if (!quoteData || !quoteId) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setIsSaving(true);
    setError(null);
    try {
      const rec = recalculate(lineItems, quoteData.mwst_rate);
      const editedQuote: QuoteStructuredData = {
        ...quoteData,
        line_items: rec.items,
        subtotal: rec.subtotal,
        mwst_amount: rec.mwstAmount,
        grand_total: rec.grandTotal,
      };
      const res = await fetch(`/api/quotes/${quoteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          structured_json: editedQuote,
          total_chf: rec.grandTotal,
          client_name: clientName || null,
          client_email: clientEmail || null,
          line_items: rec.items,
        }),
      });
      if (!res.ok) throw new Error();
      setLastSaved(new Date());
      setSuccessMsg("Entwurf gespeichert.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      setError("Speichern fehlgeschlagen. Bitte versuche es erneut.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGeneratePdf = async () => {
    if (!quoteData) return;
    setIsPdfLoading(true);
    setError(null);

    try {
      const body: GeneratePdfRequest = getPdfRequest();

      const res = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        setError(
          err?.error
            ? `PDF-Fehler: ${err.error}`
            : "PDF konnte nicht generiert werden. Bitte prüfe deine Internetverbindung und versuche es erneut."
        );
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${body.offerten_nummer}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError(
        "PDF-Download fehlgeschlagen. Bitte prüfe deine Internetverbindung und versuche es erneut."
      );
    } finally {
      setIsPdfLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!quoteData || !quoteId || !clientEmail) {
      setError("Kunden-E-Mail und Offerte werden benötigt.");
      return;
    }
    setIsEmailLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const body: SendEmailRequest = {
        quoteId,
        quote: getEditedQuote(),
        client_name: clientName || "Kunde",
        client_email: clientEmail,
        offerten_nummer: offertenNummer || "DRAFT",
      };

      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (!json.success) {
        setError(
          json.error
            ? `E-Mail-Fehler: ${json.error}`
            : "E-Mail konnte nicht gesendet werden. Bitte versuche es erneut."
        );
        return;
      }

      setSuccessMsg(`Offerte wurde an ${clientEmail} gesendet.`);
    } catch {
      setError(
        "E-Mail konnte nicht gesendet werden. Bitte prüfe deine Internetverbindung und versuche es erneut."
      );
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleReset = () => {
    setInputText("");
    setClientName("");
    setClientEmail("");
    setError(null);
    setSuccessMsg(null);
    setQuoteData(null);
    setLineItems([]);
    setTotals({ subtotal: 0, mwstAmount: 0, grandTotal: 0 });
    setQuoteId(null);
    setOffertenNummer(null);
    setLastSaved(null);
    setShowPreview(false);
    draftId.current = null;
  };

  const anyLoading = isPdfLoading || isEmailLoading || isSaving;
  const charCount = inputText.trim().length;
  const canGenerate = charCount >= MIN_CHARS;

  return (
    <div className={showPreview && quoteData ? "flex gap-6" : "space-y-8"}>
      <div className={showPreview && quoteData ? "min-w-0 flex-1 space-y-6" : "space-y-8"}>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {editId ? "Offerte bearbeiten" : "Neue Offerte"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {editId
              ? `Offerte ${offertenNummer || editId} – Positionen bearbeiten, PDF generieren oder senden.`
              : "Beschreiben Sie den Auftrag in freiem Text – die KI erstellt eine professionelle Offerte."}
          </p>
        </div>

        {!editId && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="job-input" className="block text-sm font-medium text-gray-700">
                Auftragsbeschreibung
              </label>
              {lastSaved && !quoteData && (
                <span className="inline-flex items-center gap-1 text-xs text-green-600">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  Entwurf gespeichert
                </span>
              )}
            </div>
            <textarea
              id="job-input"
              rows={8}
              className="w-full rounded-lg border border-gray-300 p-4 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
              placeholder="z.B. Renovation Wohnzimmer 5x4m, Wände weiss streichen (2 Anstriche), Decke weiss, Abdeckarbeiten, Turkey Fototapete entfernen..."
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                handleDraftChange(e.target.value, clientName, clientEmail);
              }}
              disabled={isLoading}
            />
            <div className="flex items-center justify-between">
              <span className={`text-xs ${canGenerate ? "text-gray-400" : "text-amber-600"}`}>
                {charCount < MIN_CHARS
                  ? `${MIN_CHARS - charCount} weitere Zeichen benötigt (mind. ${MIN_CHARS})`
                  : `${charCount} Zeichen`}
              </span>
              <div className="flex items-center gap-2">
                {usage?.demo && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
                    DEMO
                  </span>
                )}
                {usage && usage.limit !== null && (
                  <span className="text-xs text-gray-500">
                    {usage.used}/{usage.limit} Offerten diesen Monat &middot; zurückgesetzt am {new Date(usage.reset_date).toLocaleDateString("de-CH")}
                  </span>
                )}
                {usage && usage.limit === null && (
                  <span className="text-xs text-gray-400">Pro Plan – unbegrenzt</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="client-name" className="block text-sm font-medium text-gray-700">
                  Kundenname
                </label>
                <input
                  id="client-name"
                  type="text"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                  placeholder="Max Mustermann"
                  value={clientName}
                  onChange={(e) => {
                    setClientName(e.target.value);
                    handleDraftChange(inputText, e.target.value, clientEmail);
                  }}
                  disabled={isLoading}
                />
              </div>
              <div>
                <label htmlFor="client-email" className="block text-sm font-medium text-gray-700">
                  Kunden-E-Mail
                </label>
                <input
                  id="client-email"
                  type="email"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                  placeholder="kunde@example.ch"
                  value={clientEmail}
                  onChange={(e) => {
                    setClientEmail(e.target.value);
                    handleDraftChange(inputText, clientName, e.target.value);
                  }}
                  disabled={isLoading}
                />
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={isLoading || !canGenerate}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-300 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generiere...
                </>
              ) : (
                "Offerte generieren"
              )}
            </button>
          </div>
        )}

        {editId && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="client-name" className="block text-sm font-medium text-gray-700">
                  Kundenname
                </label>
                <input
                  id="client-name"
                  type="text"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                  placeholder="Max Mustermann"
                  value={clientName}
                  onChange={(e) => {
                    setClientName(e.target.value);
                    if (quoteData && quoteId) triggerAutoSave(lineItems, quoteData, quoteId, e.target.value, clientEmail);
                  }}
                  disabled={isLoading}
                />
              </div>
              <div>
                <label htmlFor="client-email" className="block text-sm font-medium text-gray-700">
                  Kunden-E-Mail
                </label>
                <input
                  id="client-email"
                  type="email"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                  placeholder="kunde@example.ch"
                  value={clientEmail}
                  onChange={(e) => {
                    setClientEmail(e.target.value);
                    if (quoteData && quoteId) triggerAutoSave(lineItems, quoteData, quoteId, clientName, e.target.value);
                  }}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <div className="flex items-start justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-3 flex-shrink-0 text-red-500 hover:text-red-700">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            <div className="flex items-start justify-between">
              <span>{successMsg}</span>
              <button onClick={() => setSuccessMsg(null)} className="ml-3 flex-shrink-0 text-green-500 hover:text-green-700">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {quoteData && (
          <div className="space-y-6">
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-0.5 text-xs font-medium text-blue-800">
                  {quoteData.trade}
                </span>
                <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-0.5 text-xs font-medium text-gray-700">
                  {quoteData.language.toUpperCase()}
                </span>
                {offertenNummer && (
                  <span className="inline-flex items-center rounded-full bg-purple-100 px-3 py-0.5 text-xs font-medium text-purple-800">
                    {offertenNummer}
                  </span>
                )}
                {lastSaved && (
                  <span className="ml-auto text-xs text-gray-400">
                    Gespeichert um {lastSaved.toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-700">{quoteData.summary}</p>
            </div>

            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Position</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600 w-24">Menge</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 w-20">Einheit</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600 w-32">Einzelpreis (CHF)</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600 w-32">Total (CHF)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lineItems.map((item, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900">{item.description}</td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.qty}
                          onChange={(e) => handleItemChange(i, "qty", e.target.value)}
                          className="w-full rounded border border-gray-200 px-2 py-1 text-right text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-3 text-gray-600">{item.unit}</td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(i, "unit_price", e.target.value)}
                          className="w-full rounded border border-gray-200 px-2 py-1 text-right text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {formatCHF(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200">
                    <td colSpan={4} className="px-4 py-3 text-right font-medium text-gray-600">Zwischentotal</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCHF(totals.subtotal)}</td>
                  </tr>
                  <tr className="border-t border-gray-100">
                    <td colSpan={4} className="px-4 py-3 text-right text-gray-600">MWST ({quoteData.mwst_rate}%)</td>
                    <td className="px-4 py-3 text-right text-gray-900">{formatCHF(totals.mwstAmount)}</td>
                  </tr>
                  <tr className="border-t-2 border-gray-300 bg-gray-50">
                    <td colSpan={4} className="px-4 py-3 text-right text-base font-bold text-gray-900">Gesamttotal</td>
                    <td className="px-4 py-3 text-right text-base font-bold text-gray-900">CHF {formatCHF(totals.grandTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Zahlungsbedingungen</span>
                  <p className="mt-1 text-gray-900">{quoteData.payment_terms}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Gültigkeitsdauer</span>
                  <p className="mt-1 text-gray-900">{quoteData.valid_days} Tage</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-gray-200 focus:outline-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
                {showPreview ? "Vorschau ausblenden" : "PDF-Vorschau"}
              </button>

              <button
                onClick={handleSaveDraft}
                disabled={anyLoading}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-gray-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Speichert...
                  </>
                ) : (
                  "Entwurf speichern"
                )}
              </button>

              <button
                onClick={handleGeneratePdf}
                disabled={anyLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700 focus:ring-2 focus:ring-green-300 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPdfLoading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Generiere PDF...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                    PDF generieren
                  </>
                )}
              </button>

              <button
                onClick={handleSendEmail}
                disabled={anyLoading || !clientEmail}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-300 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                title={!clientEmail ? "Kunden-E-Mail erforderlich" : undefined}
              >
                {isEmailLoading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Sende...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                    </svg>
                    Email an Kunde
                  </>
                )}
              </button>

              <button
                onClick={editId ? () => router.push("/offerten-verlauf") : handleReset}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-gray-200 focus:outline-none"
              >
                {editId ? "Zurück zum Verlauf" : "Neu starten"}
              </button>
            </div>
          </div>
        )}
      </div>

      {showPreview && quoteData && (
        <div className="sticky top-0 hidden h-[calc(100vh-2rem)] w-1/2 flex-shrink-0 lg:block">
          <div className="h-full overflow-hidden rounded-lg border border-gray-200 bg-white">
            <PdfPreview data={getPdfRequest()} />
          </div>
        </div>
      )}
    </div>
  );
}
