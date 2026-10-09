"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3Icon,
  BoxesIcon,
  FileTextIcon,
  HomeIcon,
  LogOutIcon,
  MenuIcon,
  ReceiptIcon,
  SettingsIcon,
  TagsIcon,
  UsersIcon,
  WalletIcon,
  WrenchIcon,
  ArrowDownCircleIcon,
  ArrowUpCircleIcon,
} from "lucide-react";

import { sair } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ROTULO_PAPEL } from "@/lib/dominio/rotulos";
import { cn } from "@/lib/utils";
import type { PapelUsuario } from "@/lib/supabase/tipos";
import { Logo } from "./logo";
import { menuDoPapel, type ItemMenu } from "./navegacao";

const ICONES: Record<ItemMenu["icone"], React.ComponentType<{ className?: string }>> = {
  painel: HomeIcon,
  clientes: UsersIcon,
  orcamentos: FileTextIcon,
  os: WrenchIcon,
  estoque: BoxesIcon,
  catalogo: TagsIcon,
  notas: ReceiptIcon,
  caixa: WalletIcon,
  receber: ArrowDownCircleIcon,
  pagar: ArrowUpCircleIcon,
  relatorios: BarChart3Icon,
  configuracoes: SettingsIcon,
};

interface ShellProps {
  nomeUsuario: string;
  papel: PapelUsuario;
  nomeEmpresa: string;
  ambienteFiscal: "homologacao" | "producao" | null;
  children: React.ReactNode;
}

function ativo(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function Menu({ papel, aoNavegar }: { papel: PapelUsuario; aoNavegar?: () => void }) {
  const pathname = usePathname();
  const itens = menuDoPapel(papel);
  return (
    <nav className="grid gap-0.5 px-3 text-sm" aria-label="Menu principal">
      {itens.map((item, i) => {
        const Icone = ICONES[item.icone];
        const mostrarGrupo = item.grupo && item.grupo !== itens[i - 1]?.grupo;
        return (
          <div key={item.href}>
            {mostrarGrupo && (
              <div className="mt-4 mb-1 px-3 text-[11px] font-semibold tracking-wider text-sidebar-foreground/50 uppercase">
                {item.grupo}
              </div>
            )}
            <Link
              href={item.href}
              onClick={aoNavegar}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sidebar-foreground/85 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                ativo(pathname, item.href) && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
              )}
            >
              <Icone className="size-4" />
              {papel === "instalador" && item.href === "/os" ? "Minhas OS" : item.titulo}
            </Link>
          </div>
        );
      })}
    </nav>
  );
}

function Rodape({ nomeUsuario, papel }: { nomeUsuario: string; papel: PapelUsuario }) {
  return (
    <div className="border-t border-sidebar-border p-3">
      <div className="mb-2 px-2 text-sm">
        <div className="truncate font-medium text-sidebar-foreground">{nomeUsuario}</div>
        <div className="text-xs text-sidebar-foreground/60">{ROTULO_PAPEL[papel]}</div>
      </div>
      <form action={sair}>
        <Button
          type="submit"
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOutIcon /> Sair
        </Button>
      </form>
    </div>
  );
}

export function Shell({ nomeUsuario, papel, nomeEmpresa, ambienteFiscal, children }: ShellProps) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      {/* Barra lateral (computador) */}
      <aside className="sticky top-0 hidden h-dvh flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <div className="px-5 py-5">
          <Logo className="text-white" />
          <div className="mt-1 truncate text-xs text-sidebar-foreground/60">{nomeEmpresa}</div>
        </div>
        <div className="flex-1 overflow-y-auto pb-4">
          <Menu papel={papel} />
        </div>
        <Rodape nomeUsuario={nomeUsuario} papel={papel} />
      </aside>

      {/* Barra superior (celular) */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-sidebar px-3 text-sidebar-foreground lg:hidden">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Abrir menu"
          className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-white"
          onClick={() => setAberto(true)}
        >
          <MenuIcon className="size-5" />
        </Button>
        <Logo className="text-white" compacto />
        <span className="truncate text-sm font-medium">{nomeEmpresa}</span>
      </header>
      <Sheet open={aberto} onOpenChange={setAberto}>
        <SheetContent side="left" className="flex w-72 flex-col gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground">
          <SheetTitle className="px-5 py-5 text-sidebar-foreground">
            <Logo className="text-white" />
            <div className="mt-1 truncate text-xs font-normal text-sidebar-foreground/60">{nomeEmpresa}</div>
          </SheetTitle>
          <div className="flex-1 overflow-y-auto pb-4">
            <Menu papel={papel} aoNavegar={() => setAberto(false)} />
          </div>
          <Rodape nomeUsuario={nomeUsuario} papel={papel} />
        </SheetContent>
      </Sheet>

      <div className="min-w-0">
        {ambienteFiscal === "homologacao" && papel !== "instalador" && (
          <div className="bg-warning/30 px-4 py-1.5 text-center text-xs text-warning-foreground">
            Notas fiscais em <strong>homologação</strong> (sem valor fiscal).{" "}
            {papel === "admin" && (
              <Link href="/configuracoes/fiscal" className="underline">
                Configurar
              </Link>
            )}
          </div>
        )}
        <main className="mx-auto w-full max-w-7xl p-4 pb-16 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

