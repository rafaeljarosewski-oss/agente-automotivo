import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Select nativo estilizado. Preferimos o nativo por ser mais confiável no celular
 * (abre o seletor do sistema) e por funcionar sem JavaScript.
 */
function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="select"
      className={cn(
        "flex h-9 w-full min-w-0 appearance-none rounded-md border border-input bg-transparent bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236b7280%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:1rem] bg-[right_0.6rem_center] bg-no-repeat py-1 pr-8 pl-3 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive md:text-sm dark:bg-input/30",
        className,
      )}
      {...props}
    />
  );
}

export { NativeSelect };
