"use client";

import { useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { CheckCircle2Icon, FileKeyIcon, Loader2Icon, MapPinnedIcon, RefreshCwIcon, SaveIcon, ShieldAlertIcon } from "lucide-react";

import { Campo } from "@/components/formulario/campo";
import { useAcao } from "@/components/formulario/usar-acao";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { formatarData, formatarDataHora } from "@/lib/dominio/datas";
import type { Tabela } from "@/lib/supabase/tipos";
import { enviarCertificado, salvarConfigFiscal, sincronizarApi, verificarMunicipio, type ConfigFiscalEntrada } from "./actions";

type Config = Omit<Tabela<"empresa_config_fiscal">, "nfce_csc_cifrado">;

function Certificado({ config }: { config: Config }) {
  const ref = useRef<HTMLFormElement>(null);
  const { pendente, executar } = useAcao();
  const [agora] = useState(() => Date.now());
  const validade = config.certificado_validade ? new Date(config.certificado_validade).getTime() : null;
  const vencido = validade !== null && validade < agora;
  const venceEmBreve = validade !== null && !vencido && validade - agora < 30 * 86_400_000;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Certificado digital A1</CardTitle>
        <CardDescription>
          O arquivo e a senha são enviados direto para a API fiscal e <strong>não ficam guardados</strong> no sistema.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {config.certificado_enviado_em ? (
          <Alert variant={vencido ? "destructive" : venceEmBreve ? "warning" : "success"}>
            {vencido ? <ShieldAlertIcon /> : <CheckCircle2Icon />}
            <AlertTitle>{vencido ? "Certificado vencido" : venceEmBreve ? "Certificado vence em breve" : "Certificado enviado"}</AlertTitle>
            <AlertDescription>
              {config.certificado_titular && <span>{config.certificado_titular}</span>}
              <span>
                Validade: {formatarData(config.certificado_validade)} · enviado em {formatarDataHora(config.certificado_enviado_em)}
              </span>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="warning">
            <ShieldAlertIcon />
            <AlertTitle>Nenhum certificado enviado</AlertTitle>
            <AlertDescription>Sem o certificado A1 não é possível emitir NF-e/NFC-e (e a maioria das NFS-e).</AlertDescription>
          </Alert>
        )}
        <form
          ref={ref}
          className="grid gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            const dados = new FormData(e.currentTarget);
            executar(() => enviarCertificado(dados), { aoConcluir: () => ref.current?.reset() });
          }}
        >
          <Campo rotulo="Arquivo (.pfx ou .p12)" nome="certificado">
            <Input type="file" name="certificado" accept=".pfx,.p12,application/x-pkcs12" required />
          </Campo>
          <Campo rotulo="Senha do certificado" nome="senha-certificado">
            <Input type="password" name="senha" autoComplete="off" required />
          </Campo>
          <Button type="submit" disabled={pendente}>
            {pendente ? <Loader2Icon className="animate-spin" /> : <FileKeyIcon />} Enviar
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function FormularioFiscal({
  config,
  cscConfigurado,
  provedor,
  enderecoCompleto,
}: {
  config: Config;
  cscConfigurado: boolean;
  provedor: string;
  enderecoCompleto: boolean;
}) {
  const form = useForm<ConfigFiscalEntrada>({
    defaultValues: {
      ambiente: config.ambiente,
      nfse_serie: config.nfse_serie,
      nfse_proximo_numero: config.nfse_proximo_numero,
      nfse_provedor: config.nfse_provedor as ConfigFiscalEntrada["nfse_provedor"],
      nfse_codigo_tributacao_municipal: config.nfse_codigo_tributacao_municipal ?? "",
      nfse_aliquota_iss: config.nfse_aliquota_iss != null ? String(config.nfse_aliquota_iss).replace(".", ",") : "",
      nfse_regime_especial: config.nfse_regime_especial ?? "",
      nfse_incentivo_fiscal: config.nfse_incentivo_fiscal,
      nfce_serie: config.nfce_serie,
      nfce_proximo_numero: config.nfce_proximo_numero,
      nfce_csc_id: config.nfce_csc_id ?? "",
      nfce_csc: "",
      nfe_serie: config.nfe_serie,
      nfe_proximo_numero: config.nfe_proximo_numero,
      natureza_operacao: config.natureza_operacao,
      informar_ibs_cbs: config.informar_ibs_cbs,
      aliquota_ibs_uf: String(config.aliquota_ibs_uf).replace(".", ","),
      aliquota_ibs_mun: String(config.aliquota_ibs_mun).replace(".", ","),
      aliquota_cbs: String(config.aliquota_cbs).replace(".", ","),
    },
  });
  const { pendente, executar } = useAcao();
  const sincronizacao = useAcao();
  const municipio = useAcao();
  const [infoMunicipio, setInfoMunicipio] = useState<string | null>(null);
  const ambiente = useWatch({ control: form.control, name: "ambiente" });

  return (
    <div className="grid gap-6">
      <Alert variant={provedor === "mock" ? "info" : "default"}>
        <AlertTitle>
          Emissor: {provedor === "mock" ? "simulado (sem credenciais)" : provedor === "acbr" ? "ACBr API" : "Nuvem Fiscal (legado)"}
        </AlertTitle>
        <AlertDescription>
          {provedor === "mock"
            ? "As notas são simuladas: nada é enviado à SEFAZ ou à prefeitura. Configure as credenciais da API fiscal para emitir de verdade (veja docs/PENDENCIAS.md)."
            : config.empresa_cadastrada_api
              ? `Empresa cadastrada na API fiscal. Última sincronização: ${formatarDataHora(config.ultima_sincronizacao_api) || "—"}.`
              : "A empresa ainda não foi cadastrada na API fiscal. Salve as configurações para cadastrar."}
        </AlertDescription>
      </Alert>
      {!enderecoCompleto && (
        <Alert variant="warning">
          <ShieldAlertIcon />
          <AlertDescription>Complete o endereço da empresa (com código IBGE) em Configurações › Empresa antes de emitir notas.</AlertDescription>
        </Alert>
      )}

      <form className="grid gap-6" onSubmit={form.handleSubmit((v) => executar(() => salvarConfigFiscal(v), { form }))}>
        <Card>
          <CardHeader>
            <CardTitle>Ambiente</CardTitle>
            <CardDescription>Homologação é o ambiente de testes: as notas não têm valor fiscal.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Campo rotulo="Ambiente de emissão" nome="ambiente">
              <NativeSelect {...form.register("ambiente")}>
                <option value="homologacao">Homologação (testes)</option>
                <option value="producao">Produção (valor fiscal)</option>
              </NativeSelect>
            </Campo>
            <Campo rotulo="Natureza da operação (NF-e/NFC-e)" nome="natureza_operacao">
              <Input {...form.register("natureza_operacao")} />
            </Campo>
            {ambiente === "producao" && (
              <Alert variant="warning" className="sm:col-span-2">
                <ShieldAlertIcon />
                <AlertDescription>Em produção as notas têm valor fiscal. Confirme com o contador que os dados fiscais do catálogo estão validados.</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>NFS-e (serviços)</CardTitle>
            <CardDescription>A API escolhe entre o Sistema Nacional NFS-e e o provedor da prefeitura.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-4">
            <Campo rotulo="Série (DPS)" nome="nfse_serie">
              <Input {...form.register("nfse_serie")} />
            </Campo>
            <Campo rotulo="Próximo número" nome="nfse_proximo_numero">
              <Input inputMode="numeric" {...form.register("nfse_proximo_numero")} />
            </Campo>
            <Campo rotulo="Padrão do município" nome="nfse_provedor" className="sm:col-span-2">
              <NativeSelect {...form.register("nfse_provedor")}>
                <option value="auto">Automático (consulta a API)</option>
                <option value="nacional">Sistema Nacional NFS-e</option>
                <option value="padrao">Provedor da prefeitura</option>
              </NativeSelect>
            </Campo>
            <Campo rotulo="Código de tributação municipal" nome="nfse_codigo_tributacao_municipal" ajuda="Opcional, padrão para serviços sem código próprio.">
              <Input {...form.register("nfse_codigo_tributacao_municipal")} />
            </Campo>
            <Campo rotulo="Alíquota ISS padrão (%)" nome="nfse_aliquota_iss">
              <Input inputMode="decimal" {...form.register("nfse_aliquota_iss")} />
            </Campo>
            <Campo rotulo="Regime especial (código)" nome="nfse_regime_especial" ajuda="Deixe em branco se não houver.">
              <Input inputMode="numeric" {...form.register("nfse_regime_especial")} />
            </Campo>
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <Controller
                control={form.control}
                name="nfse_incentivo_fiscal"
                render={({ field }) => <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />}
              />
              Incentivo fiscal
            </label>
            <div className="flex flex-wrap items-center gap-2 sm:col-span-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={municipio.pendente}
                onClick={() =>
                  municipio.executar(verificarMunicipio, {
                    aoConcluir: (m) => setInfoMunicipio(`${m.municipio ?? m.codigo_ibge}: ${m.nacional ? "padrão nacional" : `provedor ${m.provedor}`}`),
                  })
                }
              >
                {municipio.pendente ? <Loader2Icon className="animate-spin" /> : <MapPinnedIcon />} Verificar município
              </Button>
              {infoMunicipio && <Badge variant="info">{infoMunicipio}</Badge>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>NFC-e e NF-e (produtos)</CardTitle>
            <CardDescription>NFC-e para consumidor final pessoa física; NF-e para empresas ou quando escolhido.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-4">
            <Campo rotulo="Série NFC-e" nome="nfce_serie">
              <Input inputMode="numeric" {...form.register("nfce_serie")} />
            </Campo>
            <Campo rotulo="Próximo nº NFC-e" nome="nfce_proximo_numero">
              <Input inputMode="numeric" {...form.register("nfce_proximo_numero")} />
            </Campo>
            <Campo rotulo="Série NF-e" nome="nfe_serie">
              <Input inputMode="numeric" {...form.register("nfe_serie")} />
            </Campo>
            <Campo rotulo="Próximo nº NF-e" nome="nfe_proximo_numero">
              <Input inputMode="numeric" {...form.register("nfe_proximo_numero")} />
            </Campo>
            <Campo rotulo="ID do CSC (NFC-e)" nome="nfce_csc_id" ajuda="Ex.: 1 ou 000001">
              <Input inputMode="numeric" {...form.register("nfce_csc_id")} />
            </Campo>
            <Campo
              rotulo="Código CSC (token)"
              nome="nfce_csc"
              className="sm:col-span-3"
              ajuda={cscConfigurado ? "Já configurado (guardado criptografado). Preencha só para trocar." : "Obtido no portal da SEFAZ do seu estado."}
            >
              <Input type="password" autoComplete="off" placeholder={cscConfigurado ? "••••••••••••" : ""} {...form.register("nfce_csc")} />
            </Campo>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reforma tributária (IBS/CBS)</CardTitle>
            <CardDescription>
              Em 2026 os valores são informativos (IBS 0,1% e CBS 0,9%). Confirme com o contador se a oficina deve informar.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-4">
            <label className="flex items-center gap-2 text-sm sm:col-span-4">
              <Controller
                control={form.control}
                name="informar_ibs_cbs"
                render={({ field }) => <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />}
              />
              Informar IBS/CBS nas notas
            </label>
            <Campo rotulo="IBS estadual (%)" nome="aliquota_ibs_uf">
              <Input inputMode="decimal" {...form.register("aliquota_ibs_uf")} />
            </Campo>
            <Campo rotulo="IBS municipal (%)" nome="aliquota_ibs_mun">
              <Input inputMode="decimal" {...form.register("aliquota_ibs_mun")} />
            </Campo>
            <Campo rotulo="CBS (%)" nome="aliquota_cbs">
              <Input inputMode="decimal" {...form.register("aliquota_cbs")} />
            </Campo>
          </CardContent>
        </Card>

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" disabled={sincronizacao.pendente} onClick={() => sincronizacao.executar(sincronizarApi)}>
            {sincronizacao.pendente ? <Loader2Icon className="animate-spin" /> : <RefreshCwIcon />} Reenviar para a API
          </Button>
          <Button type="submit" disabled={pendente}>
            {pendente ? <Loader2Icon className="animate-spin" /> : <SaveIcon />} Salvar configurações
          </Button>
        </div>
      </form>

      <Certificado config={config} />
    </div>
  );
}
