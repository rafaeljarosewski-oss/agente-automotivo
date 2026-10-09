import Link from "next/link";

import { StatusNota } from "@/components/comum/status";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatarDataHora } from "@/lib/dominio/datas";
import { formatarMoeda } from "@/lib/dominio/dinheiro";
import { ROTULO_TIPO_NOTA } from "@/lib/dominio/rotulos";
import { planejarNotas } from "@/lib/fiscal/servico";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { Tabela } from "@/lib/supabase/tipos";
import { BotaoEmitirNotas } from "./emitir";

/** Seção "Notas fiscais" da OS concluída */
export async function NotasDaOS({ osId, empresa }: { osId: string; empresa: Tabela<"empresas"> }) {
  const supabase = await criarClienteServidor();
  const [{ data: notas }, plano, { data: os }] = await Promise.all([
    supabase.from("notas_fiscais").select("id, tipo, status, numero, valor_total_centavos, created_at, motivo_amigavel").eq("os_id", osId).order("created_at"),
    planejarNotas(empresa.id, osId),
    supabase.from("ordens_servico").select("clientes(tipo_pessoa)").eq("id", osId).single(),
  ]);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notas fiscais</CardTitle>
        {plano.length > 0 && (
          <CardAction>
            <BotaoEmitirNotas osId={osId} plano={plano} clientePJ={os?.clientes?.tipo_pessoa === "PJ"} />
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="grid gap-2">
        {!notas?.length && plano.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhuma nota emitida. Ao emitir: {plano.map((p) => `${ROTULO_TIPO_NOTA[p.tipo]} (${formatarMoeda(p.total_centavos)})`).join(" + ")}.
          </p>
        )}
        {notas?.map((n) => (
          <Link key={n.id} href={`/notas/${n.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent" data-testid="nota-da-os">
            <span>
              <strong>{ROTULO_TIPO_NOTA[n.tipo]}</strong> {n.numero ? `nº ${n.numero}` : ""} · {formatarDataHora(n.created_at)}
              {n.motivo_amigavel && <span className="block text-xs text-destructive">{n.motivo_amigavel}</span>}
            </span>
            <span className="flex items-center gap-2">
              {formatarMoeda(n.valor_total_centavos)} <StatusNota status={n.status} />
            </span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
