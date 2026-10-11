import { Badge } from "@/components/ui/badge";
import {
  ROTULO_STATUS_NOTA,
  ROTULO_STATUS_ORCAMENTO,
  ROTULO_STATUS_OS,
  ROTULO_STATUS_TITULO,
} from "@/lib/dominio/rotulos";

type Variante = "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" | "muted" | "danger";

const COR_ORCAMENTO: Record<keyof typeof ROTULO_STATUS_ORCAMENTO, Variante> = {
  rascunho: "muted",
  enviado: "info",
  aprovado: "success",
  recusado: "danger",
  expirado: "warning",
};

const COR_OS: Record<keyof typeof ROTULO_STATUS_OS, Variante> = {
  aberta: "info",
  em_execucao: "default",
  aguardando_peca: "warning",
  concluida: "success",
  entregue: "muted",
  cancelada: "danger",
};

const COR_NOTA: Record<keyof typeof ROTULO_STATUS_NOTA, Variante> = {
  rascunho: "muted",
  processando: "warning",
  autorizada: "success",
  rejeitada: "danger",
  cancelada: "muted",
  erro: "danger",
};

const COR_TITULO: Record<keyof typeof ROTULO_STATUS_TITULO, Variante> = {
  aberto: "info",
  pago: "success",
  cancelado: "muted",
};

export function StatusOrcamento({ status }: { status: keyof typeof ROTULO_STATUS_ORCAMENTO }) {
  return <Badge variant={COR_ORCAMENTO[status]}>{ROTULO_STATUS_ORCAMENTO[status]}</Badge>;
}

export function StatusOS({ status }: { status: keyof typeof ROTULO_STATUS_OS }) {
  return <Badge variant={COR_OS[status]}>{ROTULO_STATUS_OS[status]}</Badge>;
}

export function StatusNota({ status }: { status: keyof typeof ROTULO_STATUS_NOTA }) {
  return <Badge variant={COR_NOTA[status]}>{ROTULO_STATUS_NOTA[status]}</Badge>;
}

export function StatusTitulo({ status, vencido }: { status: keyof typeof ROTULO_STATUS_TITULO; vencido?: boolean }) {
  if (status === "aberto" && vencido) return <Badge variant="danger">Vencido</Badge>;
  return <Badge variant={COR_TITULO[status]}>{ROTULO_STATUS_TITULO[status]}</Badge>;
}
