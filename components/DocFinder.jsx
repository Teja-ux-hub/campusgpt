'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import QueryCounter from "@/components/QueryCounter";
import { FileText, SendHorizontal, Bot } from "@/components/ui/Icons";

export default function DocFinder() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [queryUsed, setQueryUsed] = useState(0);
  const [queryMax, setQueryMax] = useState(5);

  const suggestions = [
    "I need befa first unit full pdf",
    "Give me ML unit 3 notes",
    "FAI unit 5 syllabus",
    "FLAT unit 1 important questions"
  ];

  useEffect(() => {
    async function fetchInitialLimit() {
      try {
        console.log("DOCS_FETCH_INITIAL_LIMIT_START");
        const res = await fetch("/api/documents");
        if (res.ok) {
          const data = await res.json();
          console.log("DOCS_FETCH_INITIAL_LIMIT_SUCCESS", data);
          setQueryUsed(data.queryUsed || 0);
          setQueryMax(data.queryMax || 5);
        }
      } catch (err) {
        console.error("DOCS_FAILED_TO_FETCH_LIMIT", err);
      }
    }
    fetchInitialLimit();
  }, []);

  async function handleSubmit(e, forcedMsg = null) {
    if (e) e.preventDefault();
    const trimmed = (forcedMsg || message).trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log("DOCS_CLIENT_SUBMIT", { message: trimmed });
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      const data = await res.json();
      console.log("DOCS_CLIENT_RESPONSE", data);
      
      if (data.queryUsed !== undefined) setQueryUsed(data.queryUsed);
      if (data.queryMax !== undefined) setQueryMax(data.queryMax);

      if (!res.ok) throw new Error(data.error || "File request failed");

      setResult(data);
    } catch (err) {
      console.error("DOCS_CLIENT_ERROR", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#060606] text-zinc-100 font-mono flex flex-col overflow-hidden">
      <QueryCounter 
        queryUsed={queryUsed}
        queryMax={queryMax}
        onBack={() => router.push('/')}
      />

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-xl animate-in fade-in zoom-in-95 duration-700">
          
          <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute top-4 right-6 z-10">
              <Link 
                href="/chat"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-[#34d399]/10 hover:border-[#34d399]/30 transition-all text-[10px] text-zinc-500 hover:text-[#34d399] uppercase tracking-widest"
              >
                <Bot size={12} />
                <span>Chat</span>
              </Link>
            </div>
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#34d399]/20 to-transparent" />
            
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-6">
                <div className="absolute inset-0 rounded-full border border-[#34d399]/10 animate-ping" />
                <div className="w-20 h-20 rounded-full border border-[#34d399]/20 flex items-center justify-center bg-[#34d399]/5">
                  <FileText size={40} className="text-[#34d399]" />
                </div>
              </div>

              <h1 className="text-xl font-medium tracking-widest uppercase mb-2">Document Retrieval</h1>
              <p className="text-xs text-zinc-500 tracking-tight mb-8">Secure access to CMRTC syllabus and study materials</p>

              <div className="flex flex-wrap justify-center gap-2 mb-8">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSubmit(null, s)}
                    className="px-3 py-1.5 rounded-full border border-white/5 bg-white/[0.02] hover:bg-[#34d399]/10 hover:border-[#34d399]/30 transition-all text-[10px] text-zinc-500 hover:text-[#34d399] uppercase tracking-tighter"
                  >
                    {s}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="w-full relative group/input">
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="e.g. befa unit 1 pdf..."
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm text-zinc-200 outline-none focus:border-[#34d399]/40 transition-all placeholder:text-zinc-700"
                />
                <button
                  type="submit"
                  disabled={!message.trim() || loading}
                  className="absolute right-2 top-2 p-2 rounded-xl bg-[#34d399] text-black hover:bg-[#2bc28a] transition-all disabled:opacity-30 disabled:grayscale"
                >
                  <SendHorizontal size={20} />
                </button>
              </form>
            </div>

            <div className="mt-8 min-h-[60px] flex items-center justify-center">
              {loading && (
                <div className="flex gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#34d399] animate-pulse" />
                  <div className="w-2 h-2 rounded-full bg-[#34d399] animate-pulse [animation-delay:0.2s]" />
                  <div className="w-2 h-2 rounded-full bg-[#34d399] animate-pulse [animation-delay:0.4s]" />
                </div>
              )}

              {error && (
                <div className="w-full p-4 rounded-xl bg-red-500/5 border border-red-500/10 text-red-400 text-xs text-center font-mono uppercase tracking-widest animate-in slide-in-from-top-2">
                  ACCESS_DENIED: {error}
                </div>
              )}

              {result && (
                <div className="w-full p-5 rounded-2xl bg-[#34d399]/5 border border-[#34d399]/20 flex items-center justify-between animate-in slide-in-from-top-4 duration-500">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#34d399]/10 flex items-center justify-center">
                      <FileText size={20} className="text-[#34d399]" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-widest mb-0.5">Verified Asset</span>
                      <span className="text-xs font-medium text-zinc-200 truncate max-w-[180px]">{result.filename}</span>
                    </div>
                  </div>
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 rounded-xl bg-[#34d399] text-black text-[10px] font-bold uppercase tracking-widest hover:bg-[#2bc28a] transition-all shadow-[0_0_20px_#34d39933]"
                  >
                    Download
                  </a>
                </div>
              )}
            </div>
          </div>
          
          <p className="text-center text-[9px] text-zinc-700 mt-8 tracking-[0.3em] uppercase">CampusGPT // SECURE_ASSET_FINDER_V2</p>
        </div>
      </div>
    </div>
  );
}
