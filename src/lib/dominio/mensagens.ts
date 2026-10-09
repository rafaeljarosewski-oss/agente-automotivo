import { formatarData } from "./datas";
import { formatarMoeda } from "./dinheiro";

const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] ?? nome;

export function mensagemOrcamento(d: { cliente: string; numero: number; empresa: string; total: number; validade: string; link: string; veiculo?: string | null }) {
  return [
    `Olá, ${primeiroNome(d.cliente)}! Tudo bem?`,
    ``,
    `Segue o orçamento nº ${d.numero} da ${d.empresa}${d.veiculo ? ` para o ${d.veiculo}` : ""}.`,
    `Valor total: *${formatarMoeda(d.total)}* — válido até ${formatarData(d.validade)}.`,
    ``,
    `Veja os detalhes e baixe o PDF: ${d.link}`,
    ``,
    `Qualquer dúvida, é só responder esta mensagem.`,
  ].join("\n");
}

export function mensagemNota(d: { cliente: string; tipo: string; numero: string | null; empresa: string; link: string }) {
  return [
    `Olá, ${primeiroNome(d.cliente)}!`,
    ``,
    `Sua ${d.tipo}${d.numero ? ` nº ${d.numero}` : ""} da ${d.empresa} está disponível.`,
    `Baixe aqui: ${d.link}`,
    ``,
    `Obrigado pela preferência!`,
  ].join("\n");
}

export function mensagemOS(d: { cliente: string; numero: number; empresa: string; status: string; link: string }) {
  return [`Olá, ${primeiroNome(d.cliente)}!`, ``, `Sua ordem de serviço nº ${d.numero} na ${d.empresa} está: *${d.status}*.`, `Acompanhe: ${d.link}`].join("\n");
}
