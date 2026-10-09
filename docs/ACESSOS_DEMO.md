# Acessos de demonstração

> **Somente para o ambiente local ou de demonstração.** Estes usuários são criados pelo
> `npm run setup` (ou `npm run db:seed`) no Supabase **local**. O seed se recusa a rodar
> num banco remoto, a não ser que você force com `SEED_PERMITIR_REMOTO=1`. Nunca use estas
> senhas em produção.

Endereço: <http://localhost:3000> — senha de todos: **`Demo@2026`**

## Loja 1 — Prime Películas e Acessórios Automotivos (Porto Alegre/RS)

| Papel | E-mail | O que pode fazer |
|---|---|---|
| Administrador | `admin@demo.orion.app` | Tudo: configurações, usuários, fiscal, financeiro completo, relatórios, cancelar notas |
| Atendente | `atendente@demo.orion.app` | Clientes, orçamentos, OS, estoque, emitir notas, caixa do dia e contas a receber. Não vê contas a pagar, relatórios nem configurações |
| Instalador | `instalador@demo.orion.app` (Diego Becker) | Só as OS atribuídas a ele: iniciar, pausar, concluir, ver as próprias comissões. Não vê valores das OS nem o financeiro |
| Instalador | `instalador2@demo.orion.app` (Marcos Weber) | Igual ao anterior |

O que já vem cadastrado:

- 27 produtos (películas G5 a G50, nano cerâmica, segurança, residencial espelhada, lâmpadas, alarmes com número de série, acessórios, itens de ar-condicionado), com rolos de película e alguns itens abaixo do estoque mínimo.
- 14 serviços (preço fixo, por categoria de veículo e por m²) e a tabela de preços de película por linha × categoria.
- 30 clientes (pessoas físicas e empresas) com veículos de placa antiga e Mercosul.
- Orçamentos e OS em todos os status, notas fiscais simuladas (uma delas rejeitada, para ver a tela de correção), contas a receber e a pagar, e o caixa de ontem fechado.

## Loja 2 — Serra Insulfilm (para testar o isolamento entre empresas)

| Papel | E-mail |
|---|---|
| Administrador | `admin@serra.demo.orion.app` |

Entre com este usuário e confira: nenhum cliente, orçamento, OS, nota ou valor da Loja 1 aparece.

## Notas fiscais na demonstração

Com `FISCAL_PROVIDER=mock` (padrão do `.env.local` gerado pelo setup), as notas são **simuladas**:
ficam "Em processamento" por ~1,5 s e depois são autorizadas, com XML e PDF de exemplo.

- A nota rejeitada que vem no seed pode ser reenviada direto (botão **Reenviar nota**): o reenvio
  usa os cadastros atuais, que já estão corretos.
- Para provocar uma rejeição nova: em **Catálogo**, mude o NCM de um produto para `00000000`,
  conclua uma OS com ele e emita. Depois corrija o NCM e use **Reenviar nota**.
