import { expect, test } from "@playwright/test";

import { entrar } from "./ajuda";

/** O instalador usa o sistema no celular: vê só as próprias OS e consegue abrir cada uma. */
test("instalador no celular vê e abre as próprias OS", async ({ page }) => {
  await entrar(page, "instalador");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Olá, Diego");

  const cartoes = page.getByRole("link", { name: /OS nº \d+/ });
  await expect(cartoes.first()).toBeVisible();

  // Sem rolagem horizontal na largura de celular
  const transborda = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(transborda).toBe(false);

  await cartoes.first().click();
  await page.waitForURL(/\/os\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("OS nº");
  await expect(page.getByText("Ações")).toBeVisible();
});
