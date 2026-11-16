import type { ReactNode } from "react";

type Props = {
  icono: ReactNode;
  titulo: string;
  children: ReactNode;
  accion?: ReactNode;
  urgente?: boolean;
};

export function AvisoDeLista({ icono, titulo, children, accion, urgente = false }: Props) {
  return (
    <div
      role={urgente ? "alert" : undefined}
      className="flex flex-col items-start gap-4 rounded-pieza bg-superficie p-6 sm:flex-row sm:p-8"
    >
      <span
        aria-hidden="true"
        className="grid size-10 shrink-0 place-items-center rounded-control bg-superficie-alta text-tenue"
      >
        {icono}
      </span>
      <div className="min-w-0">
        <h2 className="text-lg font-medium">{titulo}</h2>
        <p className="mt-1.5 max-w-[60ch] text-tenue">{children}</p>
        {accion ? <div className="mt-5">{accion}</div> : null}
      </div>
    </div>
  );
}
