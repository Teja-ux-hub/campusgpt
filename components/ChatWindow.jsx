'use client';

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import QueryCounter from "./QueryCounter";
import { SendHorizontal, Globe, Bot, FileText } from "@/components/ui/Icons";

export default function ChatWindow() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearchingWeb, setIsSearchingWeb] = useState(false);
  const [error, setError] = useState(null);
  
  // Query counter states
  const [queryUsed, setQueryUsed] = useState(0);
  const [queryMax, setQueryMax] = useState(5);

  const scrollRef = useRef(null);

  useEffect(() => {
    async function fetchInitialLimit() {
      try {
        const res = await fetch("/api/chat");
        if (res.ok) {
          const data = await res.json();
          setQueryUsed(data.queryUsed || 0);
          setQueryMax(data.queryMax || 5);
        }
      } catch (err) {
        console.error("FAILED_TO_FETCH_LIMIT", err);
      }
    }
    fetchInitialLimit();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  async function handleSubmit(e, forcedQuery = null) {
    if (e) e.preventDefault();
    const query = forcedQuery || input.trim();
    if (!query || isLoading) return;

    setError(null);
    setIsLoading(true);
    setMessages((prev) => [...prev, { role: "user", content: query }]);
    setInput("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const data = await res.json();
      
      if (data.queryUsed !== undefined) setQueryUsed(data.queryUsed);
      if (data.queryMax !== undefined) setQueryMax(data.queryMax);

      if (!res.ok) {
        throw new Error(data.error || "Request failed");
      }

      setMessages((prev) => [
        ...prev,
        { 
          role: "assistant", 
          content: data.answer, 
          agentic: data.agentic 
        },
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      setIsSearchingWeb(false);
    }
  }

  const suggestions = [
    "Tell me about Cisco placement criteria",
    "How to prepare for TCS Ninja?",
    "What is the GPA cutoff for Salesforce?",
    "Recent hiring trends in CMRTC"
  ];

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto h-screen bg-[#060606] text-zinc-100 font-mono overflow-hidden">
      <QueryCounter 
        queryUsed={queryUsed} 
        queryMax={queryMax} 
        onBack={() => router.push('/')} 
      />

      {/* Topbar */}
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#34d399] shadow-[0_0_8px_#34d399]" />
          <h1 className="text-sm font-medium tracking-widest uppercase">CampusGPT Assistant</h1>
        </div>
        <div className="flex items-center gap-4">
          <Link 
            href="/documents"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-[#34d399]/10 hover:border-[#34d399]/30 transition-all text-[10px] text-zinc-500 hover:text-[#34d399] uppercase tracking-widest"
          >
            <FileText size={12} />
            <span>Find Docs</span>
          </Link>
          <div className="text-[10px] text-zinc-500 tracking-tighter">v2.1 // CM_RTC_NODES</div>
        </div>
      </div>

      {/* Chat Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth"
      >
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center animate-in fade-in duration-700">
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full border border-[#34d399]/20 animate-ping scale-150" />
              <div className="w-16 h-16 rounded-full border border-[#34d399]/30 flex items-center justify-center bg-[#34d399]/5">
                <Bot size={32} className="text-[#34d399]" />
              </div>
            </div>
            <h2 className="text-zinc-400 text-sm mb-8 tracking-wide">How can I assist your career today?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSubmit(null, s)}
                  className="text-left px-4 py-3 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-[#34d399]/30 transition-all text-xs text-zinc-500 hover:text-zinc-200"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom-2 fade-in duration-500`}
          >
            <div className={`relative max-w-[85%] px-5 py-4 text-sm leading-relaxed ${
              msg.role === "user" 
                ? "bg-zinc-900 border border-white/5 text-zinc-200 rounded-2xl rounded-tr-none" 
                : "bg-black border-l-2 border-l-[#34d399] border-y border-r border-white/5 text-zinc-300 rounded-2xl rounded-tl-none"
            }`}>
              {msg.agentic && (
                <div className="absolute -top-6 left-0 flex items-center gap-1.5 text-[10px] text-[#34d399] font-medium tracking-widest uppercase">
                  <Globe size={10} />
                  <span>web search</span>
                </div>
              )}
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start animate-in fade-in duration-300">
            <div className="bg-black border-l-2 border-l-zinc-700 border-y border-r border-white/5 px-5 py-4 rounded-2xl rounded-tl-none">
              <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce" />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20 text-red-400 text-xs text-center font-mono uppercase tracking-widest">
            ERROR: {error}
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="p-6 pt-0">
        <div className="relative group">
          <div className="absolute -top-[1px] left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#34d399]/40 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
          <form onSubmit={handleSubmit} className="relative flex gap-3 items-center bg-zinc-900/50 border border-white/5 rounded-2xl px-4 py-2 focus-within:border-[#34d399]/30 transition-all">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Query system..."
              className="flex-1 bg-transparent border-none outline-none py-3 text-sm text-zinc-200 placeholder:text-zinc-600"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2.5 rounded-xl bg-white/5 text-zinc-400 hover:text-[#34d399] hover:bg-[#34d399]/10 transition-all disabled:opacity-30"
            >
              <SendHorizontal size={20} />
            </button>
          </form>
        </div>
        <p className="text-center text-[9px] text-zinc-700 mt-4 tracking-[0.2em] uppercase">CampusGPT v2.1 // SECURE_NODE_ACCESS</p>
      </div>
    </div>
  );
}
