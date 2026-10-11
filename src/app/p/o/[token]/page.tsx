import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2Icon, FileDownIcon, MessageCircleIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { linkWhatsApp } from "@/lib/dominio/contato";
import { formatarData, hojeISO } from "@/lib/dominio/datas";
import { formatarMoeda } from "@/lib/dominio/dinheiro";
import { formatarPlaca } from "@/lib/dominio/placa";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { BotaoAprovar } from "./aprovar";

export const metadata: Metadata = { title: "Orçamento", robots: { index: false, follow: false } };

export default async function OrcamentoPublico({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) notFound();
  const admin = criarClienteAdmin();
  const { data: o } = await admin
    .from("orcamentos")
    .select("id, numero, status, validade, created_at, subtotal_centavos, desconto_itens_centavos, desconto_total_centavos, total_centavos, observacoes, clientes(nome), veiculos(placa, marca, modelo), orcamento_itens(descricao, quantidade, unidade, total_centavos, ordem), empresas(nome_fantasia, razao_social, whatsapp, telefone)")
    .eq("token_publico", token)
    .is("deleted_at", null)
    .maybeSingle();
  if (!o || !o.empresas) notFound();

  const empresa = o.empresas.nome_fantasia ?? o.empresas.razao_social;
  const expirado = o.status === "expirado" || (["rascunho", "enviado"].includes(o.status) && o.validade < hojeISO());
  const podeAprovar = ["rascunho", "enviado"].includes(o.status) && !expirado;
  const descontos = o.desconto_itens_centavos + o.desconto_total_centavos;

  return (
    <main className="mx-auto min-h-dvh max-w-2xl bg-background p-4 sm:p-8">
      <header className="mb-6">
        <p className="text-sm text-muted-foreground">{empresa}</p>
        <h1 className="text-2xl font-semibold">Orçamento nº {o.numero}</h1>
        <p className="text-sm text-muted-foreground">
          Para {o.clientes?.nome} · emitido em {formatarData(o.created_at)} · válido até {formatarData(o.validade)}
        </p>
        {o.veiculos && (
          <p className="mt-1 text-sm">
            <span className="font-mono">{formatarPlaca(o.veiculos.placa)}</span> · {[o.veiculos.marca, o.veiculos.modelo].filter(Boolean).join(" ")}
          </p>
        )}
        <div className="mt-2">
          {o.status === "aprovado" ? (
            <Badge variant="success">
              <CheckCircle2Icon /> Aprovado
            </Badge>
          ) : expirado ? (
            <Badge variant="warning">Expirado</Badge>
          ) : o.status === "recusado" ? (
            <Badge variant="danger">Recusado</Badge>
          ) : null}
        </div>
      </header>
      <Card className="py-0">
        <CardContent className="divide-y px-0">
          {[...o.orcamento_itens]
            .sort((a, b) => a.ordem - b.ordem)
            .map((i, idx) => (
              <div key={idx} className="flex justify-between gap-4 px-5 py-3 text-sm">
                <span>
                  {i.descricao}
                  <span className="block text-xs text-muted-foreground">
                    {Number(i.quantidade).toLocaleString("pt-BR")} {i.unidade === "M2" ? "m²" : i.unidade}
                  </span>
                </span>
                <span className="font-medium whitespace-nowrap">{formatarMoeda(i.total_centavos)}</span>
              </div>
            ))}
          {descontos > 0 && (
            <div className="flex justify-between px-5 py-3 text-sm">
              <span className="text-muted-foreground">Descontos</span>
              <span>− {formatarMoeda(descontos)}</span>
            </div>
          )}
          <div className="flex justify-between px-5 py-4 text-lg font-semibold">
            <span>Total</span>
            <span>{formatarMoeda(o.total_centavos)}</span>
          </div>
        </CardContent>
      </Card>
      {o.observacoes && <p className="mt-4 text-sm whitespace-pre-line text-muted-foreground">{o.observacoes}</p>}
      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        {podeAprovar && <BotaoAprovar token={token} />}
        <Button variant="outline" asChild size="lg">
          <a href={`/p/o/${token}/pdf`} target="_blank" rel="noreferrer">
            <FileDownIcon /> Baixar PDF
          </a>
        </Button>
        {(o.empresas.whatsapp || o.empresas.telefone) && (
          <Button variant="outline" asChild size="lg" className="sm:col-span-2">
            <a href={linkWhatsApp(o.empresas.whatsapp ?? o.empresas.telefone, `Olá! Tenho uma dúvida sobre o orçamento nº ${o.numero}.`)} target="_blank" rel="noreferrer">
              <MessageCircleIcon /> Falar com a {empresa}
            </a>
          </Button>
        )}
      </div>
      <p className="mt-10 text-center text-xs text-muted-foreground">Enviado por {empresa} · Órion Oficina</p>
    </main>
  );
}
