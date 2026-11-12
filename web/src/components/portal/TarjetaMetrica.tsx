import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

export type TonoMetrica = "neutro" | "exito" | "aviso" | "error";

type Props = {
  etiqueta: string;
  valor?: number;
  detalle: string;
  tono?: TonoMetrica;
  href?: string;
};

const FORMATO_NUMERO = new Intl.NumberFormat("es-EC");
const SIN_DATO = "—";

const PUNTOS: Record<TonoMetrica, string> = {
  neutro: "bg-tenue",
  exito: "bg-exito",
  aviso: "bg-aviso",
  error: "bg-error",
};

const BASE =
  "flex h-full items-center justify-between gap-4 rounded-pieza bg-superficie p-4 sm:flex-col sm:items-stretch sm:justify-start sm:gap-0 sm:p-5";

const TEXTOS = "min-w-0 sm:contents";
const FILA_ETIQUETA = "flex items-start justify-between gap-3 sm:order-1";
const FILA_DETALLE = "mt-1 flex items-center gap-2 sm:order-3 sm:mt-3";
const CIFRA = "shrink-0 sm:order-2 sm:mt-4";

export function TarjetaMetrica({ etiqueta, valor, detalle, tono = "neutro", href }: Props) {
  const contenido = (
    <>
      <span className={TEXTOS}>
        <span className={FILA_ETIQUETA}>
          <span className="text-[0.9375rem] text-tinta sm:text-tenue">{etiqueta}</span>
          {href ? (
            <ArrowUpRight
              aria-hidden="true"
              size={16}
              className="mt-0.5 hidden shrink-0 text-tenue transition-[transform,color] duration-150 ease-salida group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-tinta motion-reduce:transform-none sm:block"
            />
          ) : null}
        </span>
        <span className={`${FILA_DETALLE} text-sm text-tenue`}>
          <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${PUNTOS[tono]}`} />
          {detalle}
        </span>
      </span>
      <span className={`cifras ${CIFRA} text-3xl font-medium leading-none tracking-tight sm:text-4xl`}>
        {typeof valor === "number" ? FORMATO_NUMERO.format(valor) : SIN_DATO}
      </span>
    </>
  );

  if (!href) {
    return <div className={BASE}>{contenido}</div>;
  }

  return (
    <Link
      href={href}
      className={`group ${BASE} select-none transition-[transform,background-color] duration-150 ease-salida hover:bg-superficie-alta active:scale-[0.98]`}
    >
      {contenido}
    </Link>
  );
}

export function EsqueletoTarjeta() {
  return (
    <div aria-hidden="true" className={`${BASE} motion-safe:animate-pulse`}>
      <span className={TEXTOS}>
        <span className={`${FILA_ETIQUETA} h-[1.40625rem] items-center`}>
          <span className="h-3.5 w-32 max-w-full rounded-full bg-superficie-alta" />
        </span>
        <span className={`${FILA_DETALLE} h-5`}>
          <span className="h-3 w-24 rounded-full bg-superficie-alta" />
        </span>
      </span>
      <span className={`${CIFRA} h-[1.875rem] w-12 rounded-[8px] bg-superficie-alta sm:h-9 sm:w-16`} />
    </div>
  );
}
