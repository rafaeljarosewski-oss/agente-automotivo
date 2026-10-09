import "server-only";

function obrigatoria(nome: string): string {
  const valor = process.env[nome];
  if (!valor) {
    throw new Error(`Variável de ambiente ${nome} não configurada. Veja o arquivo .env.example.`);
  }
  return valor;
}

export const envServidor = {
  get supabaseSecretKey() {
    return obrigatoria("SUPABASE_SECRET_KEY");
  },
  get chaveCriptografia() {
    return obrigatoria("APP_ENCRYPTION_KEY");
  },
  get cronSecret() {
    return process.env.CRON_SECRET ?? "";
  },
  fiscal: {
    get provedor() {
      return (process.env.FISCAL_PROVIDER ?? "mock") as "mock" | "acbr" | "nuvemfiscal";
    },
    get clientId() {
      return process.env.FISCAL_CLIENT_ID ?? "";
    },
    get clientSecret() {
      return process.env.FISCAL_CLIENT_SECRET ?? "";
    },
    get webhookSecret() {
      return process.env.FISCAL_WEBHOOK_SECRET ?? "";
    },
    get escopos() {
      return process.env.FISCAL_SCOPES ?? "empresa cep cnpj nfse nfe nfce";
    },
  },
};
