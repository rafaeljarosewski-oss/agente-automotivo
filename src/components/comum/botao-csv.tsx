import { DownloadIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Link para exportar a listagem atual em CSV (abre no Excel/Planilhas) */
export function BotaoCSV({ href }: { href: string }) {
  return (
    <Button variant="outline" asChild>
      <a href={href} download>
        <DownloadIcon /> Exportar CSV
      </a>
    </Button>
  );
}
