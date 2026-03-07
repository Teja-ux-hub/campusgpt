'use client';

export default function MessageBubble({ role, content }) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-md ${
          isUser
            ? "bg-zinc-800 text-zinc-100 rounded-br-none"
            : "glass-gold text-zinc-200 rounded-bl-none border border-gold-primary/20"
        }`}
      >
        {content}
      </div>
    </div>
  );
}

