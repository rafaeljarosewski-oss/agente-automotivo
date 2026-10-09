import Link from "next/link";
import { Building2Icon, CarIcon, FileBadgeIcon, UsersIcon } from "lucide-react";

import { Cabecalho } from "@/components/comum/cabecalho";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { exigirSessao } from "@/lib/servidor/sessao";

export const metadata = { title: "Configurações" };

const ITENS = [
  { href: "/configuracoes/empresa", titulo: "Dados da empresa", descricao: "Razão social, CNPJ, endereço e logotipo", icone: Building2Icon },
  { href: "/configuracoes/fiscal", titulo: "Fiscal", descricao: "Ambiente, séries, CSC e certificado digital A1", icone: FileBadgeIcon },
  { href: "/configuracoes/usuarios", titulo: "Usuários", descricao: "Acessos da equipe e perfis", icone: UsersIcon },
  { href: "/configuracoes/categorias", titulo: "Categorias de veículo", descricao: "Hatch, Sedan, SUV... usadas nos preços", icone: CarIcon },
];

export default async function PaginaConfiguracoes() {
  await exigirSessao("admin");
  return (
    <>
      <Cabecalho titulo="Configurações" descricao="Ajustes da oficina e da equipe." />
      <div className="grid gap-4 sm:grid-cols-2">
        {ITENS.map(({ href, titulo, descricao, icone: Icone }) => (
          <Link key={href} href={href} className="group">
            <Card className="h-full transition-colors group-hover:border-primary">
              <CardHeader className="grid-cols-[auto_1fr] gap-x-4">
                <Icone className="row-span-2 size-8 text-primary" />
                <CardTitle>{titulo}</CardTitle>
                <CardDescription>{descricao}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
