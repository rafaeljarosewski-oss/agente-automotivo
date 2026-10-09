import { expect, type Page } from "@playwright/test";

/** Logins criados pelo seed de demonstração (ver docs/ACESSOS_DEMO.md) */
export const USUARIOS = {
  admin: "admin@demo.orion.app",
  atendente: "atendente@demo.orion.app",
  instalador: "instalador@demo.orion.app",
} as const;
export const SENHA_DEMO = "Demo@2026";

export async function entrar(page: Page, papel: keyof typeof USUARIOS) {
  await page.goto("/login");
  await page.locator("#email").fill(USUARIOS[papel]);
  await page.locator("#senha").fill(SENHA_DEMO);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

/** CPF válido aleatório (apenas dígitos) */
export function gerarCPF(): string {
  const base = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  if (new Set(base).size === 1) base[0] = (base[0]! + 1) % 10;
  const dv = (nums: number[]) => {
    const soma = nums.reduce((s, n, i) => s + n * (nums.length + 1 - i), 0);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  const d1 = dv(base);
  const d2 = dv([...base, d1]);
  return [...base, d1, d2].join("");
}

/** Placa Mercosul aleatória (AAA9A99) */
export function gerarPlaca(): string {
  const letra = () => String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const num = () => String(Math.floor(Math.random() * 10));
  return `${letra()}${letra()}${letra()}${num()}${letra()}${num()}${num()}`;
}

/** Converte "R$ 1.234,56" em centavos */
export function centavos(texto: string | null): number {
  const limpo = (texto ?? "").replace(/[^\d,]/g, "").replace(",", ".");
  return Math.round(Number(limpo) * 100);
}

/** Espera a mensagem de sucesso (toast) de uma ação */
export async function esperarSucesso(page: Page, texto?: string | RegExp) {
  const toast = page.locator("[data-sonner-toast][data-type=success]");
  await expect(texto ? toast.filter({ hasText: texto }).first() : toast.first()).toBeVisible();
}
