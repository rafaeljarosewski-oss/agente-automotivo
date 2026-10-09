import type { Metadata } from "next";
import { Suspense } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/layout/logo";
import { FormularioLogin } from "./formulario-login";

export const metadata: Metadata = { title: "Entrar" };

export default function PaginaLogin() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-sidebar to-primary p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center text-white">
          <Logo className="text-white" />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Entrar</CardTitle>
            <CardDescription>Acesse a gestão da sua oficina.</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense>
              <FormularioLogin />
            </Suspense>
          </CardContent>
        </Card>
        <p className="mt-6 text-center text-xs text-white/70">Órion Automação Inteligente</p>
      </div>
    </main>
  );
}
