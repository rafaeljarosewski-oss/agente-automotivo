import { cn } from "@/lib/utils";

export function Logo({ className, compacto = false }: { className?: string; compacto?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <svg viewBox="0 0 32 32" className="size-7 shrink-0" aria-hidden>
        <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.9" />
        <circle cx="16" cy="16" r="5" fill="currentColor" />
        <circle cx="26" cy="9" r="2.5" fill="currentColor" />
      </svg>
      {!compacto && <span className="text-lg">Órion Oficina</span>}
    </span>
  );
}
