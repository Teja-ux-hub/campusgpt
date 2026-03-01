'use client';

export default function MessageBubble({ role, content }) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-black text-white dark:bg-white dark:text-black"
            : "bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
        }`}
      >
        {content}
      </div>
    </div>
  );
}

