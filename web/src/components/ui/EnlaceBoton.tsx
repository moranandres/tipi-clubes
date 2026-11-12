import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  href: string;
  children: ReactNode;
  tamano?: "normal" | "grande";
  variante?: "primario" | "secundario";
  className?: string;
};

const BASE =
  "inline-flex select-none items-center justify-center gap-2 rounded-control font-medium transition-[transform,background-color,color] duration-150 ease-salida active:scale-[0.97]";

const TAMANOS = {
  normal: "h-11 px-5 text-[0.9375rem]",
  grande: "h-14 px-7 text-lg lg:h-16 lg:px-8 lg:text-xl",
} as const;

const VARIANTES = {
  primario: "bg-acento text-sobre-acento hover:bg-acento/90",
  secundario: "bg-superficie text-tinta hover:bg-superficie-alta",
} as const;

export function EnlaceBoton({
  href,
  children,
  tamano = "normal",
  variante = "primario",
  className = "",
}: Props) {
  return (
    <Link href={href} className={`${BASE} ${TAMANOS[tamano]} ${VARIANTES[variante]} ${className}`}>
      {children}
    </Link>
  );
}
