'use client';

import { useState } from "react";

export default function DocumentsPage() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed with ${res.status}`);
      }

      const data = await res.json();
      setResult({
        filename: data.filename,
        url: data.url,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-zinc-900 text-zinc-100">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-10">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">
            Course Documents
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Ask for a unit PDF and get a secure download link from Supabase.
          </p>
        </header>

        <main className="flex-1">
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-sm text-zinc-300">
              What do you need?
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder='e.g. "i need befa first unit full pdf"'
              className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500"
              rows={3}
            />
            <button
              type="submit"
              disabled={!message.trim() || loading}
              className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-black shadow-[0_0_30px_rgba(16,185,129,0.5)] transition hover:bg-emerald-400 disabled:opacity-60"
            >
              {loading ? "Thinking..." : "Get PDF"}
            </button>
          </form>

          <div className="mt-6 space-y-3">
            {error && (
              <p className="text-sm text-red-400">
                {error}
              </p>
            )}

            {result && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-sm text-zinc-300">
                  File: <span className="font-mono">{result.filename}</span>
                </p>
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center justify-center rounded-full bg-zinc-100 px-4 py-2 text-xs font-semibold text-black hover:bg-zinc-200"
                >
                  Download PDF
                </a>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

