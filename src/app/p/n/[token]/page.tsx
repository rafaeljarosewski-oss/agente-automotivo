import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FileCodeIcon, FileDownIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatarDataHora } from "@/lib/dominio/datas";
import { formatarMoeda } from "@/lib/dominio/dinheiro";
import { ROTULO_TIPO_NOTA } from "@/lib/dominio/rotulos";
import { criarClienteAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Nota fiscal", robots: { index: false, follow: false } };

export default async function NotaPublica({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) notFound();
  const { data: n } = await criarClienteAdmin()
    .from("notas_fiscais")
    .select("tipo, status, numero, serie, chave, data_emissao, valor_total_centavos, ambiente, clientes(nome), empresas(nome_fantasia, razao_social)")
    .eq("token_publico", token)
    .in("status", ["autorizada", "cancelada"])
    .maybeSingle();
  if (!n || !n.empresas) notFound();
  const empresa = n.empresas.nome_fantasia ?? n.empresas.razao_social;
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center p-4">
      <Card>
        <CardContent className="grid gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{empresa}</p>
            <h1 className="text-2xl font-semibold">
              {ROTULO_TIPO_NOTA[n.tipo]} nº {n.numero}
            </h1>
            <p className="text-sm text-muted-foreground">
              {n.clientes?.nome ? `Para ${n.clientes.nome} · ` : ""}emitida em {formatarDataHora(n.data_emissao)}
            </p>
            <div className="mt-2 flex gap-2">
              {n.status === "cancelada" && <Badge variant="danger">Cancelada</Badge>}
              {n.ambiente === "homologacao" && <Badge variant="muted">Homologação — sem valor fiscal</Badge>}
            </div>
          </div>
          <p className="text-3xl font-semibold">{formatarMoeda(n.valor_total_centavos)}</p>
          {n.chave && <p className="font-mono text-xs break-all text-muted-foreground">Chave: {n.chave}</p>}
          <div className="grid gap-2 sm:grid-cols-2">
            <Button asChild size="lg">
              <a href={`/p/n/${token}/pdf`} target="_blank" rel="noreferrer">
                <FileDownIcon /> Baixar PDF
              </a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href={`/p/n/${token}/pdf?tipo=xml`} download>
                <FileCodeIcon /> Baixar XML
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
      <p className="mt-6 text-center text-xs text-muted-foreground">Enviado por {empresa} · Órion Oficina</p>
    </main>
  );
}
