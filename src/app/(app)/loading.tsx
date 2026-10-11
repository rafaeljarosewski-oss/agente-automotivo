import { Skeleton } from "@/components/ui/skeleton";

export default function Carregando() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-label="Carregando">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-80" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
