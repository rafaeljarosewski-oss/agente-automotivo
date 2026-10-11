import { Cabecalho } from "@/components/comum/cabecalho";
import { Card, CardContent } from "@/components/ui/card";
import { exigirSessao } from "@/lib/servidor/sessao";
import { FormularioCliente } from "../formulario-cliente";

export const metadata = { title: "Novo cliente" };

export default async function NovoCliente() {
  await exigirSessao("admin", "atendente");
  return (
    <>
      <Cabecalho titulo="Novo cliente" voltar={{ href: "/clientes", rotulo: "Clientes" }} />
      <Card>
        <CardContent>
          <FormularioCliente />
        </CardContent>
      </Card>
    </>
  );
}
