// FILE: components/dashboard/DashboardCard.tsx
// CHEROLEE CORE — Dashboard Card (readable)

import Link from "next/link";

type Props = {
  title: string;
  description?: string;
  href?: string;          // internal navigation (same tab)
  externalUrl?: string;   // external navigation (new tab)
  icon?: React.ReactNode;
  badge?: string;
};

export default function DashboardCard({
  title,
  description,
  href,
  externalUrl,
  icon,
  badge,
}: Props) {
  const isExternal = Boolean(externalUrl);
  const targetHref = externalUrl ?? href ?? "#";

  const inner = (
    <div className="group relative h-full rounded-2xl border border-zinc-200/10 bg-white/5 p-5 shadow-sm transition hover:bg-white/10">
      {/* top-right glyph */}
      <div className="absolute right-3 top-3 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-[10px] font-semibold text-white/80 opacity-80 group-hover:opacity-100">
        {isExternal ? "↗" : "→"}
      </div>

      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/30 text-white">
          {icon ?? <span className="text-sm">⬚</span>}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold text-white">
              {title}
            </h3>

            {badge ? (
              <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white/90">
                {badge}
              </span>
            ) : null}
          </div>

          {description ? (
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-white/80">
              {description}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (isExternal) {
    return (
      <a href={externalUrl} target="_blank" rel="noreferrer" className="block h-full">
        {inner}
      </a>
    );
  }

  return (
    <Link href={targetHref} className="block h-full">
      {inner}
    </Link>
  );
}