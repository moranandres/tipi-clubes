import Link from "next/link";
import { ArrowLeft, CircleCheck } from "lucide-react";
import type { ReactNode } from "react";

export const CONTENEDOR_DE_GESTION =
  "mx-auto w-full max-w-[78rem] px-4 py-8 sm:px-6 lg:px-10 lg:py-10";

export const COLUMNAS_DE_GESTION =
  "mt-8 grid gap-10 xl:grid-cols-[minmax(0,1fr)_21rem] xl:items-start xl:gap-12";

export function EnlaceVolver({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2 text-[0.9375rem] font-medium text-acento"
    >
      <ArrowLeft
        aria-hidden="true"
        size={16}
        className="transition-transform duration-150 ease-salida group-hover:-translate-x-0.5 motion-reduce:transform-none"
      />
      {children}
    </Link>
  );
}

export function AvisoDeResultado({ children }: { children: ReactNode }) {
  return (
    <p
      role="status"
      className="entrada-mensaje mt-6 flex items-start gap-2.5 rounded-control bg-superficie px-4 py-3 text-[0.9375rem]"
    >
      <CircleCheck aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-exito" />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

export function EsqueletoDeGestion({
  mensaje,
  conEncabezado = false,
}: {
  mensaje: string;
  conEncabezado?: boolean;
}) {
  return (
    <div aria-busy="true">
      <p className="sr-only" role="status">
        {mensaje}
      </p>
      <div aria-hidden="true" className="motion-safe:animate-pulse">
        {conEncabezado ? (
          <>
            <div className="mt-6 h-9 w-72 max-w-full rounded-[8px] bg-superficie" />
            <div className="mt-3 h-6 w-96 max-w-full rounded-[8px] bg-superficie" />
          </>
        ) : null}
        <div className={COLUMNAS_DE_GESTION}>
          <div className="flex flex-col gap-6">
            <div className="h-12 rounded-control bg-superficie" />
            <div className="h-28 rounded-control bg-superficie" />
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="h-12 rounded-control bg-superficie" />
              <div className="h-12 rounded-control bg-superficie" />
              <div className="h-12 rounded-control bg-superficie" />
              <div className="h-12 rounded-control bg-superficie" />
            </div>
          </div>
          <div className="h-72 rounded-pieza bg-superficie" />
        </div>
      </div>
    </div>
  );
}

export function EncabezadoDeGestion({
  titulo,
  detalle,
}: {
  titulo: string;
  detalle?: string;
}) {
  return (
    <>
      <h1 className="mt-6 break-words text-3xl font-medium tracking-tight">{titulo}</h1>
      {detalle ? <p className="mt-3 max-w-[70ch] text-tenue">{detalle}</p> : null}
    </>
  );
}
