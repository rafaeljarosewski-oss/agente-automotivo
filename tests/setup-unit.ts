import { vi } from "vitest";

// Módulos "server-only" lançam erro fora do Next; nos testes unitários podem ser importados normalmente.
vi.mock("server-only", () => ({}));

process.env.TZ = "America/Sao_Paulo";
process.env.APP_ENCRYPTION_KEY ??= "dGVzdGUtY2hhdmUtZGUtMzItYnl0ZXMtcGFyYS10ZXN0ZXM=";
