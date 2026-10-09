/**
 * Tradução das rejeições mais comuns da SEFAZ e das prefeituras para linguagem simples,
 * com a orientação do que corrigir no sistema.
 */
import type { MensagemFiscal } from "./tipos";

interface Regra {
  codigos?: string[];
  padrao?: RegExp;
  texto: string;
}

const REGRAS: Regra[] = [
  { codigos: ["539", "204"], texto: "Esta nota já foi enviada antes (número repetido). Atualize o status ou ajuste o próximo número nas configurações fiscais." },
  { codigos: ["206", "563"], texto: "O número da nota já foi usado ou inutilizado. Ajuste o próximo número nas configurações fiscais e reenvie." },
  { codigos: ["225", "215"], texto: "O arquivo da nota tem um erro de formato. Confira os dados fiscais dos produtos (NCM, CFOP, CSOSN) e reenvie." },
  { codigos: ["778", "777"], padrao: /NCM/i, texto: "O NCM de algum produto é inválido ou não existe. Corrija o NCM no cadastro do produto (peça ao contador) e reenvie." },
  { codigos: ["209", "210", "232", "233"], padrao: /IE.*(destinat|emitente)|inscri[cç][aã]o estadual/i, texto: "A inscrição estadual (IE) está inválida. Confira a IE da oficina ou do cliente." },
  { codigos: ["207", "208", "237", "640"], padrao: /CNPJ|CPF/i, texto: "O CPF/CNPJ do cliente está inválido. Corrija no cadastro do cliente e reenvie." },
  { codigos: ["213", "212"], texto: "O CNPJ da oficina não confere com o certificado digital. Envie o certificado correto em Configurações › Fiscal." },
  { codigos: ["280", "281", "282", "283", "284", "285", "286", "290", "291", "292", "293"], padrao: /certificado/i, texto: "Há um problema com o certificado digital (vencido, inválido ou de outra empresa). Envie um certificado válido em Configurações › Fiscal." },
  { codigos: ["301", "302", "303"], texto: "Uso denegado: a SEFAZ encontrou irregularidade no cadastro da oficina ou do cliente. Fale com o contador." },
  { codigos: ["462", "464", "465"], padrao: /CSC|QR.?Code/i, texto: "O CSC da NFC-e está incorreto ou não foi cadastrado. Confira o ID e o código CSC em Configurações › Fiscal." },
  { codigos: ["598"], texto: "Em homologação, o nome do cliente precisa ser o texto padrão de teste. O sistema já ajusta isso; reenvie a nota." },
  { codigos: ["373", "374"], padrao: /homologa/i, texto: "Em homologação, o primeiro item precisa ter o texto padrão de teste. O sistema já ajusta isso; reenvie a nota." },
  { codigos: ["694"], texto: "Faltou informar o grupo de ICMS para consumidor final. Confira o CSOSN/CST do produto com o contador." },
  { codigos: ["217", "561", "562"], texto: "A nota referenciada não foi encontrada ou a chave está incorreta." },
  { codigos: ["220", "501"], padrao: /prazo|cancelamento/i, texto: "O prazo legal de cancelamento já passou. Fale com o contador sobre como regularizar (nota de devolução ou estorno)." },
  { codigos: ["228", "703"], padrao: /data de emiss/i, texto: "A data de emissão está muito atrasada ou adiantada. Confira a data/hora do servidor e reenvie." },
  { codigos: ["999"], texto: "A SEFAZ está com instabilidade. Aguarde alguns minutos e reenvie a nota." },
  { padrao: /CFOP/i, texto: "O CFOP de algum produto não é válido para esta operação. Peça ao contador o CFOP correto e atualize o produto." },
  { padrao: /CSOSN|CST/i, texto: "A situação tributária (CSOSN/CST) de algum produto não é aceita. Peça ao contador o código correto e atualize o produto." },
  { padrao: /c[oó]digo (de )?(tributa[cç][aã]o|servi[cç]o)|cTribNac|item da lista/i, texto: "O código do serviço (LC 116 / tributação nacional) não é aceito pela prefeitura. Peça ao contador o código correto e atualize o serviço." },
  { padrao: /al[ií]quota/i, texto: "A alíquota informada não é aceita. Peça ao contador a alíquota correta de ISS/ICMS e atualize o cadastro." },
  { padrao: /inscri[cç][aã]o municipal|\bIM\b/i, texto: "A inscrição municipal da oficina está incorreta ou não habilitada para emitir NFS-e. Confira com a prefeitura/contador." },
  { padrao: /tomador/i, texto: "Há um problema nos dados do cliente (tomador do serviço). Confira nome, CPF/CNPJ e endereço do cliente." },
  { padrao: /timeout|tempo limite|indispon[ií]vel|instabilidade|servi[cç]o paralisado/i, texto: "O serviço da SEFAZ/prefeitura está indisponível no momento. A nota será consultada de novo automaticamente; se não autorizar, reenvie mais tarde." },
  { padrao: /endere[cç]o|munic[ií]pio|CEP/i, texto: "O endereço (cidade/CEP/código IBGE) está incompleto ou inválido. Confira o endereço do cliente ou da oficina." },
];

export function traduzirRejeicao(mensagens: MensagemFiscal[], motivo?: string | null, codigo?: string | null): string {
  const candidatos: { codigo?: string | null; texto: string }[] = [
    ...(codigo || motivo ? [{ codigo, texto: motivo ?? "" }] : []),
    ...mensagens.map((m) => ({ codigo: m.codigo, texto: `${m.descricao} ${m.correcao ?? ""}` })),
  ];
  // 1ª passada: pelo código oficial da rejeição; 2ª passada: pelo texto da mensagem
  for (const c of candidatos) {
    const cod = c.codigo?.replace(/\D/g, "") ?? "";
    const regra = cod ? REGRAS.find((r) => r.codigos?.includes(cod)) : undefined;
    if (regra) return regra.texto;
  }
  for (const c of candidatos) {
    const regra = REGRAS.find((r) => r.padrao?.test(c.texto));
    if (regra) return regra.texto;
  }
  const original = candidatos.find((c) => c.texto.trim())?.texto.trim();
  return original
    ? `A nota foi recusada: ${original}. Corrija os dados indicados e reenvie; em caso de dúvida, consulte o contador.`
    : "A nota foi recusada sem motivo informado. Tente reenviar; se persistir, consulte o suporte.";
}
