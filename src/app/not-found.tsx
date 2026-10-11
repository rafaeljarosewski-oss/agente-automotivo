import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NaoEncontrado() {
  return (
    <main className="flex min-h-[60dvh] flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-5xl font-bold text-muted-foreground">404</p>
      <h1 className="text-xl font-semibold">Página não encontrada</h1>
      <p className="text-sm text-muted-foreground">O endereço pode estar errado ou o registro foi excluído.</p>
      <Button asChild>
        <Link href="/">Voltar ao início</Link>
      </Button>
    </main>
  );
}
