"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { QuoteStatus } from "@/types";

interface QuoteListItem {
  id: string;
  input_text: string;
  status: QuoteStatus;
  client_name: string | null;
  client_email: string | null;
  total_chf: number;
  language: string;
  offerten_nummer: string | null;
  created_at: string;
  sent_at: string | null;
}

function formatCHF(value: number): string {
  return value.toLocaleString("de-CH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

const statusConfig: Record<QuoteStatus, { label: string; bg: string; text: string }> = {
  draft: { label: "Entwurf", bg: "bg-gray-100", text: "text-gray-700" },
  sent: { label: "Gesendet", bg: "bg-blue-100", text: "text-blue-700" },
  approved: { label: "Genehmigt", bg: "bg-green-100", text: "text-green-700" },
};

export default function OffertenVerlaufPage() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<QuoteListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchQuotes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/quotes");
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Failed to load quotes");
        return;
      }
      setQuotes(json.quotes || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  const handleDuplicate = async (quoteId: string) => {
    setActionLoading(quoteId);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/duplicate`, {
        method: "POST",
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Failed to duplicate quote");
        return;
      }
      fetchQuotes();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to duplicate");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (quoteId: string) => {
    if (!confirm("Offerte wirklich löschen?")) return;
    setActionLoading(quoteId);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${quoteId}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Failed to delete quote");
        return;
      }
      setQuotes((prev) => prev.filter((q) => q.id !== quoteId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkApproved = async (quoteId: string) => {
    setActionLoading(quoteId);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${quoteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Failed to update status");
        return;
      }
      setQuotes((prev) =>
        prev.map((q) => (q.id === quoteId ? { ...q, status: "approved" as QuoteStatus } : q))
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Offerten-Verlauf</h1>
          <p className="mt-1 text-sm text-gray-500">
            Übersicht aller erstellten Offerten.
          </p>
        </div>
        <button
          onClick={() => router.push("/neue-offerte")}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-300 focus:outline-none"
        >
          + Neue Offerte
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <svg className="h-8 w-8 animate-spin text-blue-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="ml-3 text-gray-500">Lade Offerten...</span>
        </div>
      ) : quotes.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white px-6 py-16 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="mx-auto h-16 w-16 text-gray-300">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">Noch keine Offerten</h3>
          <p className="mt-2 text-sm text-gray-500">
            Erstelle deine erste Offerte mit KI-Unterst&uuml;tzung in unter 30 Sekunden.
          </p>
          <button
            onClick={() => router.push("/neue-offerte")}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-300 focus:outline-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Erste Offerte erstellen
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-600">Nr.</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Kunde</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Beschreibung</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Total (CHF)</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Datum</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {quotes.map((q) => {
                const sc = statusConfig[q.status];
                const busy = actionLoading === q.id;
                return (
                  <tr key={q.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                      {q.offerten_nummer || "–"}
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {q.client_name || "–"}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-gray-600">
                      {q.input_text}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {formatCHF(Number(q.total_chf))}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${sc.bg} ${sc.text}`}>
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {formatDate(q.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => router.push(`/neue-offerte?id=${q.id}`)}
                          className="rounded p-1.5 text-gray-600 hover:bg-gray-100"
                          title="Offerte öffnen"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                          </svg>
                        </button>
                        {q.status === "sent" && (
                          <button
                            onClick={() => handleMarkApproved(q.id)}
                            disabled={busy}
                            className="rounded p-1.5 text-green-600 hover:bg-green-50 disabled:opacity-50"
                            title="Als genehmigt markieren"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => handleDuplicate(q.id)}
                          disabled={busy}
                          className="rounded p-1.5 text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                          title="Offerte duplizieren"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(q.id)}
                          disabled={busy}
                          className="rounded p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-50"
                          title="Offerte löschen"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
