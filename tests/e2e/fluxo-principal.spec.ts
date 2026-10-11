import { expect, test } from "@playwright/test";

import { centavos, entrar, esperarSucesso, gerarCPF, gerarPlaca } from "./ajuda";

/**
 * Fluxo principal da loja, como a atendente faz no balcão:
 * cliente + veículo → orçamento → aprovação → OS → conclusão → notas (mock) → recebimento no caixa.
 */
test("do cadastro do cliente ao recebimento", async ({ page }) => {
  const sufixo = Date.now().toString(36).toUpperCase();
  const nomeCliente = `Cliente Teste E2E ${sufixo}`;
  const placa = gerarPlaca();

  await entrar(page, "atendente");

  await test.step("cadastrar cliente", async () => {
    await page.goto("/clientes/novo");
    await page.locator("#nome").fill(nomeCliente);
    await page.locator("#cpf_cnpj").fill(gerarCPF());
    await page.locator("#whatsapp").fill("51999887766");
    await page.getByRole("button", { name: "Cadastrar cliente" }).click();
    await page.waitForURL(/\/clientes\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(nomeCliente);
  });

  await test.step("cadastrar veículo", async () => {
    await page.getByRole("button", { name: "Adicionar" }).click();
    const dialogo = page.getByRole("dialog");
    await dialogo.locator("#placa").fill(placa);
    await dialogo.locator("#categoria_id").selectOption({ label: "SUV" });
    await dialogo.locator("#marca").fill("Jeep");
    await dialogo.locator("#modelo").fill("Compass Longitude");
    await dialogo.getByRole("button", { name: "Salvar veículo" }).click();
    await expect(dialogo).toBeHidden();
    await expect(page.getByText("Compass Longitude")).toBeVisible();
  });

  let totalOrcamento = 0;
  await test.step("montar orçamento", async () => {
    await page.goto("/orcamentos/novo");
    await page.locator("#busca-cliente").fill(nomeCliente);
    await page.getByRole("button", { name: new RegExp(nomeCliente) }).click();
    await expect(page.getByTestId("cliente-selecionado")).toContainText(nomeCliente);
    // Cliente com um único veículo: ele é selecionado automaticamente
    await expect(page.locator("#veiculo")).not.toHaveValue("");

    for (const busca of ["G20", "H7", "Troca de lâmpada"]) {
      await page.locator("#adicionar-item").click();
      await page.getByPlaceholder("Buscar serviço, película ou produto...").fill(busca);
      await page.keyboard.press("Enter");
      await expect(page.getByPlaceholder("Buscar serviço, película ou produto...")).toBeHidden();
    }
    totalOrcamento = centavos(await page.getByTestId("total-geral").textContent());
    expect(totalOrcamento).toBeGreaterThan(0);

    await page.getByRole("button", { name: "Salvar orçamento" }).click();
    await page.waitForURL(/\/orcamentos\/[0-9a-f-]{36}$/);
  });

  await test.step("aprovar e gerar OS", async () => {
    await page.getByRole("button", { name: "Aprovar e gerar OS" }).click();
    const dialogo = page.getByRole("dialog");
    await dialogo.locator("#instalador-os").selectOption({ label: "Diego Becker" });
    await dialogo.getByRole("button", { name: "Gerar OS" }).click();
    await page.waitForURL(/\/os\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Aberta");
  });

  await test.step("executar e concluir a OS", async () => {
    await page.getByRole("button", { name: "Iniciar serviço" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Em execução");

    await page.getByRole("button", { name: "Concluir OS" }).click();
    const dialogo = page.getByRole("dialog");
    await dialogo.locator("#forma-conclusao").selectOption("dinheiro");
    await expect(dialogo.getByText(/vence/).first()).toBeVisible();
    await dialogo.getByRole("button", { name: "Concluir OS" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Concluída");
    await expect(page.getByText("Parcela 1/1")).toBeVisible();
  });

  await test.step("emitir notas fiscais (provedor simulado)", async () => {
    await page.getByRole("button", { name: "Emitir notas" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Emitir agora" }).click();
    const notas = page.getByTestId("nota-da-os");
    // Serviços → NFS-e; lâmpada (produto) para pessoa física → NFC-e
    await expect(notas).toHaveCount(2);
    await expect(notas.filter({ hasText: "NFS-e" })).toHaveCount(1);
    await expect(notas.filter({ hasText: "NFC-e" })).toHaveCount(1);

    const urlOS = page.url();
    for (let i = 0; i < 2; i++) {
      await page.getByTestId("nota-da-os").nth(i).click();
      await page.waitForURL(/\/notas\/[0-9a-f-]{36}$/);
      // A tela consulta o provedor sozinha enquanto a nota está em processamento
      await expect(page.getByRole("heading", { level: 1 })).toContainText("Autorizada", { timeout: 45_000 });
      await expect(page.getByRole("link", { name: /Baixar PDF/ })).toBeVisible();
      await page.goto(urlOS);
    }
  });

  await test.step("receber no caixa", async () => {
    await page.goto("/financeiro/caixa");
    const abrir = page.getByRole("button", { name: "Abrir caixa" });
    if (await abrir.isVisible()) {
      await page.getByLabel("Fundo de troco").fill("10000");
      await abrir.click();
    }
    await expect(page.getByRole("button", { name: "Fechar caixa" })).toBeVisible();
    const saldoAntes = centavos(await page.getByTestId("saldo-dinheiro").textContent());

    await page.goto(`/financeiro/receber?q=${encodeURIComponent(nomeCliente)}`);
    const linha = page.getByRole("row").filter({ hasText: nomeCliente });
    await expect(linha).toHaveCount(1);
    await linha.getByRole("button", { name: "Receber" }).click();
    const dialogo = page.getByRole("dialog");
    await expect(dialogo.locator("#forma-recebimento")).toHaveValue("dinheiro");
    await dialogo.getByRole("button", { name: "Confirmar recebimento" }).click();
    await esperarSucesso(page);
    await expect(dialogo).toBeHidden();

    await page.goto(`/financeiro/receber?filtro=pagos&q=${encodeURIComponent(nomeCliente)}`);
    await expect(page.getByRole("row").filter({ hasText: nomeCliente })).toHaveCount(1);

    await page.goto("/financeiro/caixa");
    expect(centavos(await page.getByTestId("saldo-dinheiro").textContent())).toBe(saldoAntes + totalOrcamento);
  });
});

test("instalador não acessa o financeiro", async ({ page }) => {
  await entrar(page, "instalador");
  await page.goto("/financeiro/caixa");
  await expect(page).toHaveURL(/\/sem-permissao/);
});
