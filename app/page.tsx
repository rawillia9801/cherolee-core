"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50 p-8">
      <h1 className="text-2xl font-semibold">Cherolee Core</h1>
      <p className="mt-2 text-zinc-300">Home</p>

      <div className="mt-6">
        <Link
          href="/dashboard/core"
          className="inline-flex items-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-zinc-950"
        >
          Open Core Console
        </Link>
      </div>
    </main>
  );
}