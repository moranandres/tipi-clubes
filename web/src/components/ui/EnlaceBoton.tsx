import Link from "next/link";
import type { ReactNode } from "react";
import {
  BASE_BOTON,
  TAMANOS_BOTON,
  VARIANTES_BOTON,
  type TamanoBoton,
  type VarianteBoton,
} from "./estilos-boton";

type Props = {
  href: string;
  children: ReactNode;
  tamano?: TamanoBoton;
  variante?: VarianteBoton;
  className?: string;
};

export function EnlaceBoton({
  href,
  children,
  tamano = "normal",
  variante = "primario",
  className = "",
}: Props) {
  return (
    <Link
      href={href}
      className={`${BASE_BOTON} ${TAMANOS_BOTON[tamano]} ${VARIANTES_BOTON[variante]} ${className}`}
    >
      {children}
    </Link>
  );
}
