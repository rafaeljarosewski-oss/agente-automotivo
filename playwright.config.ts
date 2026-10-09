import { defineConfig, devices } from "@playwright/test";

/**
 * Testes ponta a ponta. Exigem o Supabase local com o seed de demonstração
 * (`npm run setup`) e FISCAL_PROVIDER=mock no .env.local.
 *
 * - Localmente: usa o `npm run dev` que já estiver rodando, ou sobe um.
 * - No CI: roda o build de produção (`npm start`), gerado no passo anterior.
 */
const URL_BASE = process.env.E2E_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: URL_BASE,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /celular/ },
    { name: "celular", use: { ...devices["Pixel 7"] }, testMatch: /celular/ },
  ],
  webServer: {
    command: process.env.CI ? "npm start" : "npm run dev",
    url: `${URL_BASE}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
