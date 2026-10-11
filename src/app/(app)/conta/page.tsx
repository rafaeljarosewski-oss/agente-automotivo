import { Cabecalho } from "@/components/comum/cabecalho";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ROTULO_PAPEL } from "@/lib/dominio/rotulos";
import { exigirSessao } from "@/lib/servidor/sessao";
import { FormularioSenha } from "./formulario-senha";

export const metadata = { title: "Minha conta" };

export default async function PaginaConta() {
  const { perfil, empresa } = await exigirSessao();
  return (
    <>
      <Cabecalho titulo="Minha conta" descricao={`${perfil.nome} · ${ROTULO_PAPEL[perfil.papel]} em ${empresa.nome_fantasia || empresa.razao_social}`} />
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Alterar senha</CardTitle>
          <CardDescription>Entrou com uma senha temporária? Troque por uma só sua. Esqueceu a senha? Peça ao administrador da loja para redefinir.</CardDescription>
        </CardHeader>
        <CardContent>
          <FormularioSenha />
        </CardContent>
      </Card>
    </>
  );
}
