import { InboxIcon } from "lucide-react";

export function EstadoVazio({ titulo, descricao, children }: { titulo: string; descricao?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-12 text-center">
      <InboxIcon className="size-8 text-muted-foreground" />
      <p className="font-medium">{titulo}</p>
      {descricao && <p className="max-w-md text-sm text-muted-foreground">{descricao}</p>}
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}
