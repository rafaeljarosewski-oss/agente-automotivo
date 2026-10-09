import { Document, Page, Text, View } from "@react-pdf/renderer";

import { formatarTelefone } from "@/lib/dominio/contato";
import { formatarData } from "@/lib/dominio/datas";
import { formatarMoeda } from "@/lib/dominio/dinheiro";
import { formatarCpfCnpj } from "@/lib/dominio/documentos";
import { formatarPlaca } from "@/lib/dominio/placa";
import { CabecalhoEmpresa, estilos, Rodape, type DadosEmpresaPdf } from "./comum";

export interface ItemPdf {
  descricao: string;
  quantidade: number;
  unidade: string;
  preco_unitario_centavos: number;
  desconto_centavos: number;
  total_centavos: number;
  detalhe?: string | null;
}

export interface DocumentoComercialPdf {
  tipo: "orcamento" | "os";
  numero: number;
  data: string;
  validade?: string | null;
  status?: string | null;
  cliente: { nome: string; cpf_cnpj: string | null; telefone: string | null; email: string | null; endereco?: string | null };
  veiculo: { placa: string; descricao: string; categoria?: string | null; km?: number | null } | null;
  itens: ItemPdf[];
  subtotal_centavos: number;
  desconto_centavos: number;
  total_centavos: number;
  observacoes?: string | null;
  instaladores?: string | null;
  formaPagamento?: string | null;
}

const COLUNAS = { descricao: "48%", qtd: "12%", unit: "14%", desc: "12%", total: "14%" } as const;

export function DocumentoComercial({ empresa, doc }: { empresa: DadosEmpresaPdf; doc: DocumentoComercialPdf }) {
  const titulo = doc.tipo === "orcamento" ? `ORÇAMENTO Nº ${doc.numero}` : `ORDEM DE SERVIÇO Nº ${doc.numero}`;
  const subtitulo = doc.tipo === "orcamento" ? `Emitido em ${formatarData(doc.data)} · válido até ${formatarData(doc.validade)}` : `Aberta em ${formatarData(doc.data)}${doc.status ? ` · ${doc.status}` : ""}`;
  return (
    <Document title={titulo} author={empresa.nome_fantasia ?? empresa.razao_social} language="pt-BR">
      <Page size="A4" style={estilos.pagina}>
        <CabecalhoEmpresa empresa={empresa} titulo={titulo} subtitulo={subtitulo} />

        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={[estilos.caixa, { flex: 1 }]}>
            <Text style={estilos.rotulo}>Cliente</Text>
            <Text style={estilos.negrito}>{doc.cliente.nome}</Text>
            {doc.cliente.cpf_cnpj && <Text>{formatarCpfCnpj(doc.cliente.cpf_cnpj)}</Text>}
            <Text>{[formatarTelefone(doc.cliente.telefone), doc.cliente.email].filter(Boolean).join(" · ")}</Text>
            {doc.cliente.endereco && <Text style={estilos.textoPequeno}>{doc.cliente.endereco}</Text>}
          </View>
          {doc.veiculo && (
            <View style={[estilos.caixa, { flex: 1 }]}>
              <Text style={estilos.rotulo}>Veículo</Text>
              <Text style={estilos.negrito}>
                {formatarPlaca(doc.veiculo.placa)} · {doc.veiculo.descricao}
              </Text>
              {doc.veiculo.categoria && <Text>Categoria: {doc.veiculo.categoria}</Text>}
              {doc.veiculo.km ? <Text>Km: {doc.veiculo.km.toLocaleString("pt-BR")}</Text> : null}
            </View>
          )}
        </View>

        <View style={estilos.cabecalhoTabela}>
          <Text style={[estilos.celula, estilos.negrito, { width: COLUNAS.descricao }]}>Descrição</Text>
          <Text style={[estilos.celula, estilos.negrito, estilos.direita, { width: COLUNAS.qtd }]}>Qtd.</Text>
          <Text style={[estilos.celula, estilos.negrito, estilos.direita, { width: COLUNAS.unit }]}>Unitário</Text>
          <Text style={[estilos.celula, estilos.negrito, estilos.direita, { width: COLUNAS.desc }]}>Desconto</Text>
          <Text style={[estilos.celula, estilos.negrito, estilos.direita, { width: COLUNAS.total }]}>Total</Text>
        </View>
        {doc.itens.map((i, idx) => (
          <View key={idx} style={estilos.linhaTabela} wrap={false}>
            <View style={[estilos.celula, { width: COLUNAS.descricao }]}>
              <Text>{i.descricao}</Text>
              {i.detalhe && <Text style={estilos.textoPequeno}>{i.detalhe}</Text>}
            </View>
            <Text style={[estilos.celula, estilos.direita, { width: COLUNAS.qtd }]}>
              {Number(i.quantidade).toLocaleString("pt-BR", { maximumFractionDigits: 3 })} {i.unidade === "M2" ? "m²" : i.unidade}
            </Text>
            <Text style={[estilos.celula, estilos.direita, { width: COLUNAS.unit }]}>{formatarMoeda(i.preco_unitario_centavos)}</Text>
            <Text style={[estilos.celula, estilos.direita, { width: COLUNAS.desc }]}>{i.desconto_centavos ? formatarMoeda(i.desconto_centavos) : "—"}</Text>
            <Text style={[estilos.celula, estilos.direita, { width: COLUNAS.total }]}>{formatarMoeda(i.total_centavos)}</Text>
          </View>
        ))}

        <View style={estilos.totais} wrap={false}>
          <View style={estilos.linhaTotal}>
            <Text>Subtotal</Text>
            <Text>{formatarMoeda(doc.subtotal_centavos)}</Text>
          </View>
          {doc.desconto_centavos > 0 && (
            <View style={estilos.linhaTotal}>
              <Text>Descontos</Text>
              <Text>- {formatarMoeda(doc.desconto_centavos)}</Text>
            </View>
          )}
          <View style={estilos.totalFinal}>
            <Text style={[estilos.negrito, { fontSize: 12 }]}>Total</Text>
            <Text style={[estilos.negrito, { fontSize: 12 }]}>{formatarMoeda(doc.total_centavos)}</Text>
          </View>
          {doc.formaPagamento && <Text style={estilos.textoPequeno}>Pagamento: {doc.formaPagamento}</Text>}
        </View>

        {doc.instaladores && (
          <View style={[estilos.caixa, { marginTop: 12 }]}>
            <Text style={estilos.rotulo}>Responsável técnico</Text>
            <Text>{doc.instaladores}</Text>
          </View>
        )}
        {doc.observacoes && (
          <View style={[estilos.caixa, { marginTop: 12 }]}>
            <Text style={estilos.rotulo}>Observações</Text>
            <Text>{doc.observacoes}</Text>
          </View>
        )}
        {doc.tipo === "os" && (
          <View style={{ flexDirection: "row", gap: 40, marginTop: 40 }} wrap={false}>
            <View style={{ flex: 1, borderTopWidth: 0.5, borderTopColor: "#6b7280", paddingTop: 4 }}>
              <Text style={{ textAlign: "center", fontSize: 8 }}>Assinatura do cliente</Text>
            </View>
            <View style={{ flex: 1, borderTopWidth: 0.5, borderTopColor: "#6b7280", paddingTop: 4 }}>
              <Text style={{ textAlign: "center", fontSize: 8 }}>Responsável pela oficina</Text>
            </View>
          </View>
        )}

        <Rodape texto={`${empresa.nome_fantasia ?? empresa.razao_social} · documento gerado pelo Órion Oficina`} />
      </Page>
    </Document>
  );
}
