'use client';

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-zinc-900 text-zinc-100">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-6 md:px-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 ring-1 ring-zinc-800">
              <span className="text-sm font-semibold text-emerald-400">CG</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight">
                CampusGPT
              </span>
              <span className="text-xs text-zinc-500">
                RAG powered by Gemini + Pinecone
              </span>
            </div>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <button className="hidden rounded-full px-4 py-2 text-zinc-400 transition hover:text-zinc-100 md:inline-flex">
              Product
            </button>
            <button className="hidden rounded-full px-4 py-2 text-zinc-400 transition hover:text-zinc-100 md:inline-flex">
              Docs
            </button>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-zinc-800">
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="hidden rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-black shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 md:inline-flex">
                  Create account
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </nav>
        </header>

        <main className="mt-20 grid flex-1 gap-12 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-center">
          <section className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Production-ready RAG for your campus docs
            </div>
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
              Chat with your documents
              <span className="block bg-gradient-to-r from-emerald-400 via-cyan-300 to-sky-400 bg-clip-text text-transparent">
                like a pro.
              </span>
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
              CampusGPT turns PDFs and syllabi into an always-on assistant.
              Hybrid search, BM25 rerank, and per-student memory powered by
              Clerk, Gemini, and Pinecone.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <SignedIn>
                <button
                  onClick={() => router.push("/chat")}
                  className="flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-black shadow-[0_0_50px_rgba(16,185,129,0.4)] transition hover:bg-emerald-400"
                >
                  Get started
                  <span className="text-xs text-emerald-950/80">
                    RAG workspace
                  </span>
                </button>
              </SignedIn>
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-black shadow-[0_0_40px_rgba(16,185,129,0.5)] transition hover:bg-emerald-400">
                    Sign in to get started
                  </button>
                </SignInButton>
              </SignedOut>
              <p className="text-xs text-zinc-500">
                Only signed-in users can access the chat workspace.
              </p>
            </div>

            <dl className="grid max-w-xl grid-cols-3 gap-4 text-xs text-zinc-400 sm:text-sm">
              <div>
                <dt className="text-zinc-500">Latency</dt>
                <dd className="font-semibold text-zinc-100">Sub-second</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Retrieval</dt>
                <dd className="font-semibold text-zinc-100">
                  Hybrid + BM25
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Memory</dt>
                <dd className="font-semibold text-zinc-100">
                  Per userId
                </dd>
              </div>
            </dl>
          </section>

          <section className="space-y-6">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-6 shadow-[0_0_60px_rgba(24,24,27,0.9)] backdrop-blur">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
                Loved by students
              </p>
              <div className="mt-4 space-y-4">
                <blockquote className="rounded-2xl bg-zinc-900/80 p-4 text-sm text-zinc-200">
                  “CampusGPT turned a 120-page syllabus into a 5 minute chat.
                  It feels like cheating, but smarter.”
                  <footer className="mt-2 text-xs text-zinc-500">
                    — Final year CSE student
                  </footer>
                </blockquote>
                <blockquote className="rounded-2xl bg-zinc-900/80 p-4 text-sm text-zinc-200">
                  “I no longer scroll PDFs for exam questions. I just ask and
                  get pinpoint answers with sources.”
                  <footer className="mt-2 text-xs text-zinc-500">
                    — DSA mentor
                  </footer>
                </blockquote>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs text-zinc-400">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                  Stack
                </p>
                <ul className="mt-2 space-y-1">
                  <li>Clerk auth</li>
                  <li>Gemini 2.5 Flash</li>
                  <li>Pinecone serverless</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                  Retrieval
                </p>
                <ul className="mt-2 space-y-1">
                  <li>Dense embeddings</li>
                  <li>BM25 rerank</li>
                  <li>RRF fusion</li>
                </ul>
              </div>
            </div>
          </section>
        </main>

        <footer className="mt-10 flex items-center justify-between border-t border-zinc-900 pt-4 text-xs text-zinc-600">
          <span>© {new Date().getFullYear()} CampusGPT</span>
          <span>Built for your syllabus, not for the internet.</span>
        </footer>
      </div>
    </div>
  );
}
