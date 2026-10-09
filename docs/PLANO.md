# Plano de execução — Fase 1

Sistema de gestão para oficinas de películas, lâmpadas, alarmes, acessórios e ar-condicionado veicular.
Desenvolvido pela **Órion Automação Inteligente**, multiempresa desde o primeiro dia.

Cada etapa termina com: `npm run lint`, `npm run typecheck`, `npm test` verdes e um commit com mensagem clara.

| # | Etapa | Entregas principais | Status |
|---|-------|---------------------|--------|
| 0 | Planejamento | `docs/PLANO.md`, `docs/DECISOES.md`, `docs/PENDENCIAS.md` | ✅ |
| 1 | Fundação | Next.js (App Router, TS estrito), Tailwind + componentes shadcn/ui, ESLint, Vitest, Playwright, Supabase CLI, `npm run setup`, `.env.example`, GitHub Actions | ⏳ |
| 2 | Banco de dados | Migrações: multiempresa, perfis, auditoria, soft delete, RLS em todas as tabelas de negócio, funções de apoio; testes automatizados de isolamento (RLS) | ⏳ |
| 3 | Autenticação e layout | Login, `proxy.ts` de sessão, papéis (admin/atendente/instalador), menu responsivo (celular), gestão de usuários pelo admin | ⏳ |
| 4 | Empresa e configurações | Dados da empresa + logo, busca CNPJ/CEP, configurações fiscais (ambiente, séries, CSC criptografado), upload do certificado A1 direto para a API fiscal, categorias de veículo | ⏳ |
| 5 | Clientes e veículos | PF/PJ, WhatsApp, vários veículos, validação CPF/CNPJ/placa, busca única, histórico do veículo, CSV | ⏳ |
| 6 | Catálogo | Produtos (unidade/metro, série), serviços (fixo/categoria/m²), tabela de película linha × categoria com consumo, comissão, dados fiscais com aviso `fiscal_validado` | ⏳ |
| 7 | Orçamentos | Montagem rápida com preço por categoria, m² por vidro, descontos, validade, PDF com logo, link público com token, botão WhatsApp, status | ⏳ |
| 8 | Ordens de serviço | Orçamento → OS em um clique, OS direta, instalador por item/OS, status, conclusão atômica (baixa de estoque + contas a receber + comissões), PDF | ⏳ |
| 9 | Estoque | Entradas manuais, importação de XML de NF-e de compra, rolos de película, ajustes com motivo, mínimo, histórico | ⏳ |
| 10 | Notas fiscais | `FiscalProvider` + `FiscalProviderMock` + provedor real (API ACBr/Nuvem Fiscal), NFS-e (nacional e municipal), NFC-e, NF-e, webhook assinado + sincronização periódica, XML/PDF no Storage, cancelamento, CC-e, reenvio, link + WhatsApp, campos IBS/CBS | ⏳ |
| 11 | Financeiro | Contas a receber (formas e parcelas), contas a pagar, caixa do dia (abertura, sangria, reforço, fechamento com conferência), baixas, vencidos | ⏳ |
| 12 | Painel e relatórios | Indicadores do dia/mês, OS por status, contas vencendo, estoque mínimo, notas rejeitadas; relatórios com período e CSV | ⏳ |
| 13 | Dados de exemplo | Seed rico (oficina no RS, ~30 clientes, películas, lâmpadas, alarmes, ar-condicionado, orçamentos/OS em vários status), usuários demo e `docs/ACESSOS_DEMO.md` | ⏳ |
| 14 | Testes ponta a ponta | Playwright: cliente → veículo → orçamento → aprovação → OS → conclusão → notas (mock) → recebimento | ⏳ |
| 15 | Deploy e documentação | Scripts Supabase Cloud e Vercel, cron de sincronização fiscal, `README.md`, revisão final de `docs/PENDENCIAS.md` | ⏳ |

## Fora do escopo (portas deixadas abertas no modelo de dados)

Agenda de instalações, checklist com fotos, controle de garantia, API oficial de WhatsApp e lembretes de pós-venda.
O modelo já prevê: datas previstas na OS, tabela genérica de anexos por empresa no Storage, campo de garantia (dias) em serviços/produtos e telefone WhatsApp normalizado em clientes.
