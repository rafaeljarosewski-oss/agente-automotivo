import type { Metadata } from "next";
import { Suspense } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogoEmpilhada } from "@/components/layout/logo";
import { FormularioLogin } from "./formulario-login";

export const metadata: Metadata = { title: "Entrar" };

export default function PaginaLogin() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[radial-gradient(circle_at_50%_25%,#1c2c4c,#0b1424_70%)] p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center text-white">
          <LogoEmpilhada className="w-52" />
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
      </div>
    </main>
  );
}
