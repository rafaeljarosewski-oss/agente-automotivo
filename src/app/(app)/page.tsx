import Link from "next/link";
import { AlertTriangleIcon, ArrowRightIcon, FilePlus2Icon, PackageIcon, ReceiptIcon, WrenchIcon } from "lucide-react";

import { Cabecalho } from "@/components/comum/cabecalho";
import { CartoesOS } from "@/app/(app)/os/tabela";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listarOS, STATUS_EM_ANDAMENTO } from "@/lib/consultas/os";
import { formatarData, hojeISO, primeiroDiaDoMes } from "@/lib/dominio/datas";
import { formatarMoeda } from "@/lib/dominio/dinheiro";
import { ROTULO_STATUS_OS } from "@/lib/dominio/rotulos";
import { exigirSessao } from "@/lib/servidor/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { StatusOS } from "@/lib/supabase/tipos";
import { cn } from "@/lib/utils";

export const metadata = { title: "Painel" };

interface Indicadores {
  faturamento_dia: number;
  faturamento_mes: number;
  recebido_dia: number;
  os_por_status: Partial<Record<StatusOS, number>>;
  receber_vencidos: { quantidade: number; valor: number };
  receber_vencendo: { quantidade: number; valor: number };
  pagar_vencendo: { quantidade: number; valor: number };
  estoque_baixo: { id: string; nome: string; estoque_atual: number; estoque_minimo: number; unidade: string }[];
  notas_rejeitadas: number;
  notas_processando: number;
  orcamentos_abertos: number;
}

function Indicador({ titulo, valor, detalhe, href, destaque }: { titulo: string; valor: string; detalhe?: string; href?: string; destaque?: "perigo" | "alerta" }) {
  const conteudo = (
    <Card className={cn("h-full gap-1 py-4 transition-colors", href && "hover:border-primary", destaque === "perigo" && "border-destructive/50", destaque === "alerta" && "border-warning")}>
      <CardContent className="px-4">
        <p className="text-xs text-muted-foreground">{titulo}</p>
        <p className={cn("text-2xl font-semibold tracking-tight", destaque === "perigo" && "text-destructive")}>{valor}</p>
        {detalhe && <p className="text-xs text-muted-foreground">{detalhe}</p>}
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{conteudo}</Link> : conteudo;
}

async function PainelInstalador({ nome }: { nome: string }) {
  const supabase = await criarClienteServidor();
  const hoje = hojeISO();
  const [ordens, { data: comissoes }] = await Promise.all([
    listarOS(supabase, { status: STATUS_EM_ANDAMENTO }),
    supabase.from("comissoes").select("valor_centavos").gte("competencia", primeiroDiaDoMes(hoje)).lte("competencia", hoje).neq("status", "cancelado"),
  ]);
  return (
    <>
      <Cabecalho titulo={`Olá, ${nome}!`} descricao="Suas ordens de serviço em andamento." />
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <Indicador titulo="OS em andamento" valor={String(ordens.length)} href="/os" />
        <Indicador titulo="Minhas comissões no mês" valor={formatarMoeda((comissoes ?? []).reduce((s, c) => s + c.valor_centavos, 0))} />
      </div>
      <CartoesOS ordens={ordens} />
    </>
  );
}

export default async function Painel() {
  const sessao = await exigirSessao();
  const primeiroNome = sessao.perfil.nome.split(" ")[0] ?? sessao.perfil.nome;
  if (sessao.perfil.papel === "instalador") return <PainelInstalador nome={primeiroNome} />;

  const admin = sessao.perfil.papel === "admin";
  const supabase = await criarClienteServidor();
  await supabase.rpc("expirar_orcamentos");
  const { data } = await supabase.rpc("painel_indicadores", { p_hoje: hojeISO() });
  const ind = data as unknown as Indicadores;
  const emAndamento = STATUS_EM_ANDAMENTO.reduce((s, st) => s + (ind.os_por_status[st] ?? 0), 0);

  return (
    <>
      <Cabecalho titulo={`Olá, ${primeiroNome}!`} descricao={`Resumo de hoje, ${formatarData(hojeISO())}.`}>
        <Button variant="outline" asChild>
          <Link href="/os/nova">
            <WrenchIcon /> Nova OS
          </Link>
        </Button>
        <Button asChild>
          <Link href="/orcamentos/novo">
            <FilePlus2Icon /> Novo orçamento
          </Link>
        </Button>
      </Cabecalho>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador titulo="Faturamento hoje (OS concluídas)" valor={formatarMoeda(ind.faturamento_dia)} detalhe={`Recebido hoje: ${formatarMoeda(ind.recebido_dia)}`} />
        <Indicador titulo="Faturamento no mês" valor={formatarMoeda(ind.faturamento_mes)} href={admin ? "/relatorios" : undefined} />
        <Indicador
          titulo="A receber vencido"
          valor={formatarMoeda(ind.receber_vencidos.valor)}
          detalhe={`${ind.receber_vencidos.quantidade} título(s) · vencendo em 7 dias: ${formatarMoeda(ind.receber_vencendo.valor)}`}
          href="/financeiro/receber?filtro=vencidos"
          destaque={ind.receber_vencidos.quantidade > 0 ? "perigo" : undefined}
        />
        {admin ? (
          <Indicador
            titulo="Contas a pagar (até 7 dias)"
            valor={formatarMoeda(ind.pagar_vencendo.valor)}
            detalhe={`${ind.pagar_vencendo.quantidade} conta(s), incluindo vencidas`}
            href="/financeiro/pagar"
            destaque={ind.pagar_vencendo.quantidade > 0 ? "alerta" : undefined}
          />
        ) : (
          <Indicador titulo="Orçamentos em aberto" valor={String(ind.orcamentos_abertos)} href="/orcamentos" />
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Ordens de serviço</CardTitle>
            <CardDescription>{emAndamento} em andamento</CardDescription>
            <CardAction>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/os">
                  Ver todas <ArrowRightIcon />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-4">
            {(["aberta", "em_execucao", "aguardando_peca", "concluida"] as StatusOS[]).map((st) => (
              <Link key={st} href={`/os?status=${st}`} className="rounded-lg border p-3 transition-colors hover:border-primary" data-testid={`os-${st}`}>
                <p className="text-xs text-muted-foreground">{ROTULO_STATUS_OS[st]}</p>
                <p className="text-2xl font-semibold">{ind.os_por_status[st] ?? 0}</p>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ReceiptIcon className="size-4" /> Notas fiscais
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <Link href="/notas?status=rejeitada" className={cn("flex justify-between rounded-md border p-3 hover:border-primary", ind.notas_rejeitadas > 0 && "border-destructive/50 text-destructive")}>
              <span className="flex items-center gap-2">
                {ind.notas_rejeitadas > 0 && <AlertTriangleIcon className="size-4" />} Rejeitadas ou com erro
              </span>
              <strong data-testid="notas-rejeitadas">{ind.notas_rejeitadas}</strong>
            </Link>
            <Link href="/notas?status=processando" className="flex justify-between rounded-md border p-3 hover:border-primary">
              <span>Em processamento</span>
              <strong>{ind.notas_processando}</strong>
            </Link>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackageIcon className="size-4" /> Estoque abaixo do mínimo
            </CardTitle>
            <CardAction>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/estoque?filtro=baixo">
                  Ver estoque <ArrowRightIcon />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {ind.estoque_baixo.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tudo certo: nenhum produto abaixo do mínimo.</p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" data-testid="estoque-baixo">
                {ind.estoque_baixo.slice(0, 12).map((p) => (
                  <li key={p.id}>
                    <Link href={`/estoque/${p.id}`} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm hover:border-primary">
                      <span className="truncate">{p.nome}</span>
                      <span className={cn("shrink-0 font-medium", Number(p.estoque_atual) <= 0 ? "text-destructive" : "text-warning-foreground")}>
                        {Number(p.estoque_atual).toLocaleString("pt-BR")} / {Number(p.estoque_minimo).toLocaleString("pt-BR")} {p.unidade}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
