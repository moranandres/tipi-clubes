import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import { Collage } from "./Collage";

export function Hero() {
  return (
    <section
      aria-labelledby="titulo-principal"
      className="relative flex min-h-[calc(100svh-4rem)] items-center overflow-hidden py-12 lg:py-10"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[60%] bg-[radial-gradient(60%_100%_at_50%_0%,color-mix(in_oklch,var(--acento)_16%,transparent),transparent)]"
      />
      <div className="contenedor relative grid items-center gap-10 lg:grid-cols-12 lg:gap-6">
        <div className="entrada-titular lg:col-span-4">
          <h1 id="titulo-principal" className="text-titular">
            Clubes de robótica escolar, al día
          </h1>
          <p className="mt-5 max-w-[36ch] text-tenue">
            TIPI 3.0 registra cada institución, club, sesión y evidencia de las unidades educativas
            fiscales de la Zona 8.
          </p>
          <Link
            href="#como-funciona"
            className="group mt-6 inline-flex items-center gap-2 text-[0.9375rem] font-medium text-acento"
          >
            Ver cómo funciona
            <ArrowDown
              aria-hidden="true"
              size={16}
              className="transition-transform duration-150 ease-salida group-hover:translate-y-0.5"
            />
          </Link>
        </div>
        <div className="lg:col-span-5">
          <Collage />
        </div>
        <div className="entrada-titular flex flex-col gap-4 lg:col-span-3 lg:items-end lg:text-right">
          <EnlaceBoton href="/login" tamano="grande" className="w-full lg:w-auto">
            Entrar al portal
            <ArrowRight aria-hidden="true" size={20} />
          </EnlaceBoton>
          <p className="max-w-[26ch] text-sm text-tenue">
            Para docentes, responsables institucionales y coordinación del proyecto.
          </p>
        </div>
      </div>
    </section>
  );
}
