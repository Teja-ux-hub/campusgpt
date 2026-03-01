'use client';

import { useState } from "react";
import MessageBubble from "./MessageBubble";

export default function ChatWindow() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    const query = input.trim();
    if (!query || isLoading) return;

    setError(null);
    setIsLoading(true);

    setMessages((prev) => [...prev, { role: "user", content: query }]);
    setInput("");

    try {
      console.log("CHAT_CLIENT_REQUEST", { query });
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed with ${res.status}`);
      }

      const data = await res.json();

      console.log("CHAT_CLIENT_RESPONSE", data);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer || "No answer." },
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col w-full max-w-3xl mx-auto h-[80vh] border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-950 overflow-hidden">
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Ask anything about your indexed documents.
          </p>
        )}
        {messages.map((msg, idx) => (
          <MessageBubble key={idx} role={msg.role} content={msg.content} />
        ))}
        {error && (
          <p className="text-sm text-red-500 dark:text-red-400 mt-2">
            {error}
          </p>
        )}
      </div>
      <form onSubmit={handleSubmit} className="border-t border-zinc-200 dark:border-zinc-800 p-3 flex gap-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question..."
          className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black dark:focus:ring-zinc-200"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="rounded-xl bg-black text-white text-sm px-4 py-2 disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {isLoading ? "Thinking..." : "Send"}
        </button>
      </form>
    </div>
  );
}
