import type { ReactNode } from "react";

type Props = {
  punto: string;
  children: ReactNode;
};

export function PuntoDeEstado({ punto, children }: Props) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${punto}`} />
      {children}
    </span>
  );
}
