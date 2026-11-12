import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FormularioAcceso } from "@/components/acceso/FormularioAcceso";
import { Marca } from "@/components/ui/Marca";
import { SelectorTema } from "@/components/ui/SelectorTema";

export const metadata: Metadata = {
  title: "Acceso al portal",
};

export default function PaginaLogin() {
  return (
    <>
      <header className="border-b border-linea">
        <div className="contenedor flex h-16 items-center justify-between gap-6">
          <Marca />
          <SelectorTema />
        </div>
      </header>
      <main id="contenido" className="flex flex-1 items-center py-16 lg:py-24">
        <div className="contenedor grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-6">
          <div className="lg:col-span-5">
            <h1 id="titulo-acceso" className="text-seccion">
              Acceso al portal
            </h1>
            <p className="mt-5 max-w-[44ch] text-tenue">
              Entra con el usuario o el correo de tu cuenta. Si todavía no tienes una, pídela a la
              coordinación de TIPI 3.0 o al responsable de tu institución.
            </p>
            <Link
              href="/"
              className="group mt-8 inline-flex items-center gap-2 text-[0.9375rem] font-medium text-acento"
            >
              <ArrowLeft
                aria-hidden="true"
                size={16}
                className="transition-transform duration-150 ease-salida group-hover:-translate-x-0.5"
              />
              Volver al inicio
            </Link>
          </div>
          <div className="lg:col-span-5 lg:col-start-8">
            <FormularioAcceso />
          </div>
        </div>
      </main>
    </>
  );
}
