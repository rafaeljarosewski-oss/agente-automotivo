import Link from "next/link";
import { notFound } from "next/navigation";
import { FilePlus2Icon, MessageCircleIcon, WrenchIcon } from "lucide-react";

import { Cabecalho } from "@/components/comum/cabecalho";
import { StatusOrcamento, StatusOS } from "@/components/comum/status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatarTelefone, linkWhatsApp } from "@/lib/dominio/contato";
import { formatarData } from "@/lib/dominio/datas";
import { formatarMoeda } from "@/lib/dominio/dinheiro";
import { formatarCpfCnpj } from "@/lib/dominio/documentos";
import { exigirSessao } from "@/lib/servidor/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { AcoesCliente, VeiculosCliente } from "./interativo";

export default async function PaginaCliente({ params }: { params: Promise<{ id: string }> }) {
  const { empresa } = await exigirSessao("admin", "atendente");
  const { id } = await params;
  const supabase = await criarClienteServidor();
  const { data: cliente } = await supabase.from("clientes").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!cliente) notFound();

  const [{ data: veiculos }, { data: categorias }, { data: orcamentos }, { data: ordens }] = await Promise.all([
    supabase.from("veiculos").select("*").eq("cliente_id", id).is("deleted_at", null).order("created_at"),
    supabase.from("categorias_veiculo").select("id, nome").is("deleted_at", null).eq("ativo", true).order("ordem"),
    supabase.from("orcamentos").select("id, numero, status, total_centavos, created_at, veiculo_id").eq("cliente_id", id).is("deleted_at", null).order("created_at", { ascending: false }).limit(20),
    supabase.from("ordens_servico").select("id, numero, status, total_centavos, created_at, veiculo_id").eq("cliente_id", id).is("deleted_at", null).order("created_at", { ascending: false }).limit(20),
  ]);

  const nomeEmpresa = empresa.nome_fantasia ?? empresa.razao_social;
  const contato = cliente.whatsapp ?? cliente.telefone;
  const placaDe = (vid: string | null) => veiculos?.find((v) => v.id === vid)?.placa;

  return (
    <>
      <Cabecalho
        titulo={cliente.nome}
        voltar={{ href: "/clientes", rotulo: "Clientes" }}
        descricao={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {cliente.tipo_pessoa === "PJ" && <Badge variant="muted">Pessoa jurídica</Badge>}
            {cliente.cpf_cnpj && <span>{formatarCpfCnpj(cliente.cpf_cnpj)}</span>}
            {contato && <span>{formatarTelefone(contato)}</span>}
            {cliente.cidade && <span>{[cliente.cidade, cliente.uf].filter(Boolean).join("/")}</span>}
          </span>
        }
      >
        {cliente.whatsapp && (
          <Button variant="outline" asChild>
            <a href={linkWhatsApp(cliente.whatsapp, `Olá, ${cliente.nome.split(" ")[0]}! Aqui é da ${nomeEmpresa}.`)} target="_blank" rel="noreferrer">
              <MessageCircleIcon /> WhatsApp
            </a>
          </Button>
        )}
        <Button variant="outline" asChild>
          <Link href={`/os/nova?cliente=${cliente.id}`}>
            <WrenchIcon /> Nova OS
          </Link>
        </Button>
        <Button asChild>
          <Link href={`/orcamentos/novo?cliente=${cliente.id}`}>
            <FilePlus2Icon /> Novo orçamento
          </Link>
        </Button>
      </Cabecalho>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="grid gap-6">
          <VeiculosCliente clienteId={cliente.id} veiculos={veiculos ?? []} categorias={categorias ?? []} />
          <Card>
            <CardHeader>
              <CardTitle>Histórico</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Ordens de serviço</h3>
                {ordens?.length ? (
                  <ul className="divide-y text-sm">
                    {ordens.map((o) => (
                      <li key={o.id} className="flex items-center justify-between gap-2 py-2">
                        <Link href={`/os/${o.id}`} className="hover:underline">
                          OS nº {o.numero} <span className="text-muted-foreground">· {formatarData(o.created_at)}</span>
                          {placaDe(o.veiculo_id) && <span className="ml-1 font-mono text-xs">{placaDe(o.veiculo_id)}</span>}
                        </Link>
                        <span className="flex items-center gap-2">
                          {formatarMoeda(o.total_centavos)} <StatusOS status={o.status} />
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma OS.</p>
                )}
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Orçamentos</h3>
                {orcamentos?.length ? (
                  <ul className="divide-y text-sm">
                    {orcamentos.map((o) => (
                      <li key={o.id} className="flex items-center justify-between gap-2 py-2">
                        <Link href={`/orcamentos/${o.id}`} className="hover:underline">
                          Nº {o.numero} <span className="text-muted-foreground">· {formatarData(o.created_at)}</span>
                        </Link>
                        <span className="flex items-center gap-2">
                          {formatarMoeda(o.total_centavos)} <StatusOrcamento status={o.status} />
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum orçamento.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        <AcoesCliente cliente={cliente} />
      </div>
    </>
  );
}
