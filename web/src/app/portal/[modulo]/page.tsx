import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Suspense } from "react";
import { MODULOS_DEL_PORTAL, buscarModulo, rolPuedeVer, type ModuloPortal } from "@/lib/portal/menu";
import { exigirSesion } from "@/lib/sesion/usuario";

export function generateStaticParams() {
  return MODULOS_DEL_PORTAL.map((modulo) => ({ modulo: modulo.id }));
}

export async function generateMetadata({ params }: PageProps<"/portal/[modulo]">): Promise<Metadata> {
  const { modulo } = await params;
  return { title: buscarModulo(modulo)?.etiqueta ?? "Página no encontrada" };
}

async function EstadoDelModulo({ modulo }: { modulo: ModuloPortal }) {
  const usuario = await exigirSesion();

  if (usuario && !rolPuedeVer(modulo, usuario.rol)) {
    return (
      <p role="alert" className="mt-4 max-w-[60ch] text-tenue">
        Tu rol no tiene acceso a esta sección. Si crees que es un error, avisa a la coordinación de
        TIPI 3.0.
      </p>
    );
  }

  return (
    <p className="mt-4 max-w-[60ch] text-tenue">
      Esta pantalla del nuevo portal se construye en un bloque posterior. Mientras tanto, la misma
      función sigue disponible en el sistema actual.
    </p>
  );
}

function EsqueletoEstado() {
  return (
    <div
      aria-hidden="true"
      className="mt-5 h-4 w-[26rem] max-w-full rounded-full bg-superficie motion-safe:animate-pulse"
    />
  );
}

export default async function PaginaModulo({ params }: PageProps<"/portal/[modulo]">) {
  const { modulo: id } = await params;
  const modulo = buscarModulo(id);

  if (!modulo) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-[78rem] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <h1 className="text-3xl font-medium tracking-tight">{modulo.etiqueta}</h1>
      <Suspense fallback={<EsqueletoEstado />}>
        <EstadoDelModulo modulo={modulo} />
      </Suspense>
      <Link
        href="/portal"
        className="group mt-8 inline-flex items-center gap-2 text-[0.9375rem] font-medium text-acento"
      >
        <ArrowLeft
          aria-hidden="true"
          size={16}
          className="transition-transform duration-150 ease-salida group-hover:-translate-x-0.5 motion-reduce:transform-none"
        />
        Volver al panel principal
      </Link>
    </div>
  );
}
