"use client";

import { Suspense } from "react";
import CoreConsoleInner from "./CoreConsoleInner";

export default function CoreConsolePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 text-zinc-200 p-6">Loading Core…</div>}>
      <CoreConsoleInner />
    </Suspense>
  );
}