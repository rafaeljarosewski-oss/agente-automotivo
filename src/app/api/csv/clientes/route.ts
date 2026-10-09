import { listarClientes } from "@/lib/consultas/clientes";
import { formatarTelefone } from "@/lib/dominio/contato";
import { formatarCpfCnpj } from "@/lib/dominio/documentos";
import { hojeISO } from "@/lib/dominio/datas";
import { gerarCSV, respostaCSV } from "@/lib/servidor/csv";
import { obterSessao } from "@/lib/servidor/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const sessao = await obterSessao();
  if (!sessao || sessao.perfil.papel === "instalador") return new Response("Não autorizado", { status: 401 });
  const q = new URL(request.url).searchParams.get("q") ?? undefined;
  const supabase = await criarClienteServidor();
  const clientes = await listarClientes(supabase, q, 10000);
  const ids = clientes.map((c) => c.id);
  const { data: completos } = await supabase.from("clientes").select("*").in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  const porId = new Map((completos ?? []).map((c) => [c.id, c]));
  const csv = gerarCSV(
    [
      { titulo: "Nome / Razão social", valor: (c) => c.nome },
      { titulo: "Tipo", valor: (c) => c.tipo_pessoa },
      { titulo: "CPF/CNPJ", valor: (c) => formatarCpfCnpj(c.cpf_cnpj) },
      { titulo: "WhatsApp", valor: (c) => formatarTelefone(c.whatsapp) },
      { titulo: "Telefone", valor: (c) => formatarTelefone(c.telefone) },
      { titulo: "E-mail", valor: (c) => porId.get(c.id)?.email },
      { titulo: "Endereço", valor: (c) => [porId.get(c.id)?.logradouro, porId.get(c.id)?.numero].filter(Boolean).join(", ") },
      { titulo: "Bairro", valor: (c) => porId.get(c.id)?.bairro },
      { titulo: "Cidade", valor: (c) => c.cidade },
      { titulo: "UF", valor: (c) => porId.get(c.id)?.uf },
      { titulo: "CEP", valor: (c) => porId.get(c.id)?.cep },
      { titulo: "Placas", valor: (c) => c.placas },
    ],
    clientes,
  );
  return respostaCSV(`clientes-${hojeISO()}.csv`, csv);
}
