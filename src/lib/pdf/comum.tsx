/* eslint-disable jsx-a11y/alt-text -- Image do react-pdf não é <img> HTML */
import { Image, StyleSheet, Text, View } from "@react-pdf/renderer";

import { formatarCEP, formatarTelefone } from "@/lib/dominio/contato";
import { formatarCNPJ } from "@/lib/dominio/documentos";

export const COR_PRIMARIA = "#1e3a8a";

export const estilos = StyleSheet.create({
  pagina: { padding: 32, paddingBottom: 48, fontSize: 9.5, fontFamily: "Helvetica", color: "#1f2937" },
  cabecalho: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: 2, borderBottomColor: COR_PRIMARIA, paddingBottom: 10, marginBottom: 14 },
  logo: { width: 110, height: 55, objectFit: "contain" },
  empresaNome: { fontSize: 13, fontFamily: "Helvetica-Bold", color: COR_PRIMARIA },
  textoPequeno: { fontSize: 8, color: "#4b5563", marginTop: 1 },
  titulo: { fontSize: 16, fontFamily: "Helvetica-Bold", textAlign: "right", color: COR_PRIMARIA },
  caixa: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 4, padding: 8, marginBottom: 10 },
  rotulo: { fontSize: 7.5, color: "#6b7280", textTransform: "uppercase", marginBottom: 2 },
  negrito: { fontFamily: "Helvetica-Bold" },
  linhaTabela: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e5e7eb", paddingVertical: 5 },
  cabecalhoTabela: { flexDirection: "row", backgroundColor: "#eef2ff", paddingVertical: 5, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  celula: { paddingHorizontal: 4 },
  direita: { textAlign: "right" },
  totais: { marginLeft: "auto", width: 220, marginTop: 8 },
  linhaTotal: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  totalFinal: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, marginTop: 4, borderTopWidth: 1, borderTopColor: COR_PRIMARIA },
  rodape: { position: "absolute", bottom: 20, left: 32, right: 32, fontSize: 7.5, color: "#9ca3af", flexDirection: "row", justifyContent: "space-between" },
});

export interface DadosEmpresaPdf {
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  logo?: { data: Buffer; format: "png" | "jpg" } | null;
}

export function CabecalhoEmpresa({ empresa, titulo, subtitulo }: { empresa: DadosEmpresaPdf; titulo: string; subtitulo?: string }) {
  const endereco = [empresa.logradouro, empresa.numero].filter(Boolean).join(", ");
  return (
    <View style={estilos.cabecalho} fixed>
      <View style={{ flexDirection: "row", gap: 10, maxWidth: "65%" }}>
        {empresa.logo && <Image src={empresa.logo} style={estilos.logo} />}
        <View>
          <Text style={estilos.empresaNome}>{empresa.nome_fantasia ?? empresa.razao_social}</Text>
          <Text style={estilos.textoPequeno}>
            {empresa.razao_social} · CNPJ {formatarCNPJ(empresa.cnpj)}
          </Text>
          {endereco && (
            <Text style={estilos.textoPequeno}>
              {endereco} · {[empresa.bairro, empresa.cidade, empresa.uf].filter(Boolean).join(" · ")} {formatarCEP(empresa.cep)}
            </Text>
          )}
          <Text style={estilos.textoPequeno}>{[formatarTelefone(empresa.whatsapp ?? empresa.telefone), empresa.email].filter(Boolean).join(" · ")}</Text>
        </View>
      </View>
      <View>
        <Text style={estilos.titulo}>{titulo}</Text>
        {subtitulo && <Text style={[estilos.textoPequeno, { textAlign: "right" }]}>{subtitulo}</Text>}
      </View>
    </View>
  );
}

export function Rodape({ texto }: { texto: string }) {
  return (
    <View style={estilos.rodape} fixed>
      <Text>{texto}</Text>
      <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
    </View>
  );
}
