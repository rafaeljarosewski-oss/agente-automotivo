"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2Icon, SearchIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Busca que atualiza o parâmetro ?q= da URL (a página consulta o banco no servidor) */
export function CampoBusca({ placeholder, className, parametro = "q" }: { placeholder: string; className?: string; parametro?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [valor, setValor] = useState(params.get(parametro) ?? "");
  const [pendente, iniciar] = useTransition();
  const primeiro = useRef(true);

  useEffect(() => {
    if (primeiro.current) {
      primeiro.current = false;
      return;
    }
    const t = setTimeout(() => {
      const novos = new URLSearchParams(params.toString());
      if (valor.trim()) novos.set(parametro, valor.trim());
      else novos.delete(parametro);
      novos.delete("pagina");
      iniciar(() => router.replace(`${pathname}?${novos.toString()}`));
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor]);

  return (
    <div className={cn("relative w-full sm:max-w-sm", className)}>
      {pendente ? (
        <Loader2Icon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      ) : (
        <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      )}
      <Input
        type="search"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder={placeholder}
        className="pl-9"
        aria-label={placeholder}
      />
    </div>
  );
}
