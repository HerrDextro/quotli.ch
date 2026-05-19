"use client";

import { useEffect, useState, useCallback } from "react";

interface UserProfile {
  company_name: string | null;
  logo_url: string | null;
  address: string | null;
  qr_iban: string | null;
  default_terms: string | null;
  default_validity_days: number;
  plan: string;
}

export default function EinstellungenPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [form, setForm] = useState({
    company_name: "",
    address: "",
    logo_url: "",
    qr_iban: "",
    default_terms: "",
    default_validity_days: 30,
  });

  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/user/profile");
      if (!res.ok) throw new Error("Failed to fetch");
      const data: UserProfile = await res.json();
      setProfile(data);
      setForm({
        company_name: data.company_name || "",
        address: data.address || "",
        logo_url: data.logo_url || "",
        qr_iban: data.qr_iban || "",
        default_terms: data.default_terms || "",
        default_validity_days: data.default_validity_days || 30,
      });
    } catch {
      setMessage({ type: "error", text: "Profil konnte nicht geladen werden." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgraded") === "true") {
      setMessage({
        type: "success",
        text: "Pro Plan aktiviert! Vielen Dank für Ihr Upgrade.",
      });
      fetchProfile();
      window.history.replaceState({}, "", "/einstellungen");
    }
  }, [fetchProfile]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setMessage({ type: "success", text: "Einstellungen gespeichert." });
    } catch {
      setMessage({ type: "error", text: "Speichern fehlgeschlagen." });
    } finally {
      setSaving(false);
    }
  };

  const handleSubscribe = async () => {
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch {
      setMessage({
        type: "error",
        text: "Checkout konnte nicht gestartet werden.",
      });
    }
  };

  const handleManageBilling = async () => {
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch {
      setMessage({
        type: "error",
        text: "Billing-Portal konnte nicht geöffnet werden.",
      });
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/user/upload-logo", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }
      const { logo_url } = await res.json();
      setForm((f) => ({ ...f, logo_url }));
      setMessage({ type: "success", text: "Logo hochgeladen." });
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Logo-Upload fehlgeschlagen.",
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Einstellungen</h1>

      {message && (
        <div
          className={`rounded-md px-4 py-3 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Company Profile */}
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Firmenprofil
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Diese Daten erscheinen auf Ihren Offerten und Rechnungen.
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Firmenname
            </label>
            <input
              type="text"
              value={form.company_name}
              onChange={(e) =>
                setForm((f) => ({ ...f, company_name: e.target.value }))
              }
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Adresse
            </label>
            <textarea
              value={form.address}
              onChange={(e) =>
                setForm((f) => ({ ...f, address: e.target.value }))
              }
              rows={2}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Logo
            </label>
            <div
              className={`mt-1 flex flex-col items-center gap-3 rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                isDragging
                  ? "border-indigo-400 bg-indigo-50"
                  : "border-gray-300 bg-gray-50 hover:border-gray-400"
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) {
                  const fakeEvent = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
                  handleLogoUpload(fakeEvent);
                }
              }}
            >
              {form.logo_url ? (
                <img
                  src={form.logo_url}
                  alt="Logo"
                  className="h-16 w-auto rounded border border-gray-200 object-contain"
                />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="h-10 w-10 text-gray-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                </svg>
              )}
              <div>
                <p className="text-sm text-gray-600">
                  {uploading ? (
                    <span className="inline-flex items-center gap-1">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Wird hochgeladen...
                    </span>
                  ) : isDragging ? (
                    "Datei hier ablegen"
                  ) : (
                    <>
                      Logo hierher ziehen oder{" "}
                      <label className="cursor-pointer font-medium text-indigo-600 hover:text-indigo-500">
                        Datei auswählen
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                          disabled={uploading}
                        />
                      </label>
                    </>
                  )}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  PNG, JPG oder SVG. Max. 2 MB.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              QR-IBAN
            </label>
            <input
              type="text"
              value={form.qr_iban}
              onChange={(e) =>
                setForm((f) => ({ ...f, qr_iban: e.target.value }))
              }
              placeholder="CHXX XXXX XXXX XXXX XXXX X"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">
              Standard-Zahlungsbedingungen
            </label>
            <textarea
              value={form.default_terms}
              onChange={(e) =>
                setForm((f) => ({ ...f, default_terms: e.target.value }))
              }
              rows={2}
              placeholder="z.B. Zahlbar innerhalb von 30 Tagen..."
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Standard-Gültigkeit (Tage)
            </label>
            <input
              type="number"
              value={form.default_validity_days}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  default_validity_days: parseInt(e.target.value) || 30,
                }))
              }
              min={1}
              max={365}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "Speichert..." : "Speichern"}
          </button>
        </div>
      </section>

      {/* Subscription */}
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Abo</h2>
        <p className="mt-1 text-sm text-gray-500">
          Verwalten Sie Ihr Abonnement und Ihren Plan.
        </p>

        <div className="mt-6 flex items-center gap-4">
          <div
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
              profile?.plan === "pro"
                ? "bg-indigo-100 text-indigo-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {profile?.plan === "pro" ? "Pro Plan" : "Free Plan"}
          </div>

          <span className="text-sm text-gray-500">
            {profile?.plan === "pro"
              ? "Unbegrenzte Offerten pro Monat"
              : "3 Offerten pro Monat"}
          </span>
        </div>

        <div className="mt-6">
          {profile?.plan === "pro" ? (
            <button
              onClick={handleManageBilling}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Abo verwalten
            </button>
          ) : (
            <button
              onClick={handleSubscribe}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              Auf Pro upgraden
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
