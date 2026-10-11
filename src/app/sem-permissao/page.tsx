import Link from "next/link";
import { ShieldAlertIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function SemPermissao() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      <ShieldAlertIcon className="size-10 text-destructive" />
      <h1 className="text-xl font-semibold">Você não tem permissão para acessar esta página</h1>
      <p className="max-w-md text-sm text-muted-foreground">Se precisar deste acesso, peça ao administrador da oficina.</p>
      <Button asChild>
        <Link href="/">Voltar ao início</Link>
      </Button>
    </main>
  );
}
