import Link from "next/link";
import { ChevronLeftIcon } from "lucide-react";

export function Cabecalho({
  titulo,
  descricao,
  voltar,
  children,
}: {
  titulo: React.ReactNode;
  descricao?: React.ReactNode;
  voltar?: { href: string; rotulo: string };
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {voltar && (
          <Link href={voltar.href} className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeftIcon className="size-4" /> {voltar.rotulo}
          </Link>
        )}
        <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
        {descricao && <div className="mt-1 text-sm text-muted-foreground">{descricao}</div>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
