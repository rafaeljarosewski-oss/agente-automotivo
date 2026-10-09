import Link from "next/link";
import { AlertTriangleIcon, PlusIcon } from "lucide-react";

import { BotaoCSV } from "@/components/comum/botao-csv";
import { Cabecalho } from "@/components/comum/cabecalho";
import { CampoBusca } from "@/components/comum/campo-busca";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { normalizarBusca } from "@/lib/dominio/texto";
import { exigirSessao } from "@/lib/servidor/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { TabelaPeliculas } from "./peliculas";
import { TabelaProdutos, TabelaServicos } from "./tabelas";

export const metadata = { title: "Catálogo" };

const ABAS = [
  { id: "produtos", titulo: "Produtos" },
  { id: "servicos", titulo: "Serviços" },
  { id: "peliculas", titulo: "Tabela de películas" },
] as const;

export default async function PaginaCatalogo({ searchParams }: { searchParams: Promise<{ aba?: string; q?: string }> }) {
  const sessao = await exigirSessao("admin", "atendente");
  const { aba: abaParam, q } = await searchParams;
  const aba = ABAS.some((a) => a.id === abaParam) ? (abaParam as (typeof ABAS)[number]["id"]) : "produtos";
  const admin = sessao.perfil.papel === "admin";
  const supabase = await criarClienteServidor();
  const termo = q ? normalizarBusca(q) : null;

  const [{ count: produtosPendentes }, { count: servicosPendentes }] = await Promise.all([
    supabase.from("produtos").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("fiscal_validado", false),
    supabase.from("servicos").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("fiscal_validado", false),
  ]);

  let conteudo: React.ReactNode = null;
  if (aba === "produtos") {
    let consulta = supabase.from("produtos").select("*").is("deleted_at", null).order("nome").limit(1000);
    if (termo) consulta = consulta.ilike("busca", `%${termo}%`);
    const { data } = await consulta;
    conteudo = <TabelaProdutos produtos={data ?? []} />;
  } else if (aba === "servicos") {
    let consulta = supabase.from("servicos").select("*").is("deleted_at", null).order("nome").limit(1000);
    if (termo) consulta = consulta.ilike("busca", `%${termo}%`);
    const { data } = await consulta;
    conteudo = <TabelaServicos servicos={data ?? []} />;
  } else {
    const [{ data: linhas }, { data: categorias }, { data: tabela }, { data: rolos }, { data: servicos }] = await Promise.all([
      supabase.from("linhas_pelicula").select("*").is("deleted_at", null).order("ordem").order("nome"),
      supabase.from("categorias_veiculo").select("id, nome").is("deleted_at", null).eq("ativo", true).order("ordem"),
      supabase.from("tabela_precos_pelicula").select("*"),
      supabase.from("produtos").select("id, nome").is("deleted_at", null).eq("tipo_controle", "metro").order("nome"),
      supabase.from("servicos").select("id, nome").is("deleted_at", null).eq("tipo_preco", "pelicula").order("nome"),
    ]);
    conteudo = (
      <TabelaPeliculas linhas={linhas ?? []} categorias={categorias ?? []} tabela={tabela ?? []} rolos={rolos ?? []} servicos={servicos ?? []} podeEditar={admin} />
    );
  }

  return (
    <>
      <Cabecalho titulo="Catálogo" descricao="Produtos, serviços e a tabela de preços de películas.">
        {aba !== "peliculas" && <BotaoCSV href={`/api/csv/${aba}`} />}
        {admin && aba === "produtos" && (
          <Button asChild>
            <Link href="/catalogo/produtos/novo">
              <PlusIcon /> Novo produto
            </Link>
          </Button>
        )}
        {admin && aba === "servicos" && (
          <Button asChild>
            <Link href="/catalogo/servicos/novo">
              <PlusIcon /> Novo serviço
            </Link>
          </Button>
        )}
      </Cabecalho>

      {(produtosPendentes ?? 0) + (servicosPendentes ?? 0) > 0 && (
        <Alert variant="warning" className="mb-4">
          <AlertTriangleIcon />
          <AlertTitle>Dados fiscais aguardando validação do contador</AlertTitle>
          <AlertDescription>
            {produtosPendentes ?? 0} produto(s) e {servicosPendentes ?? 0} serviço(s) estão com NCM, CFOP, CSOSN ou código de serviço
            preenchidos com valores sugeridos. Peça ao contador para conferir e marque &quot;Dados fiscais validados&quot; em cada item.
          </AlertDescription>
        </Alert>
      )}

      <nav className="mb-4 flex gap-1 overflow-x-auto border-b" aria-label="Seções do catálogo">
        {ABAS.map((a) => (
          <Link
            key={a.id}
            href={`/catalogo?aba=${a.id}`}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap",
              aba === a.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {a.titulo}
          </Link>
        ))}
      </nav>
      {aba !== "peliculas" && (
        <div className="mb-4">
          <CampoBusca placeholder={aba === "produtos" ? "Nome, código, código de barras ou marca" : "Nome ou código do serviço"} />
        </div>
      )}
      {conteudo}
    </>
  );
}
