"use client";

import { useEffect } from "react";
import { AlertTriangleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function ErroApp({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <AlertTriangleIcon className="size-10 text-destructive" />
      <h1 className="text-xl font-semibold">Algo deu errado</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Não foi possível carregar esta tela. Tente novamente; se o problema continuar, avise o suporte informando o código{" "}
        <code>{error.digest ?? "—"}</code>.
      </p>
      <Button onClick={reset}>Tentar novamente</Button>
    </div>
  );
}
