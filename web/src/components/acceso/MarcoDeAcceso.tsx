import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Marca } from "@/components/ui/Marca";
import { SelectorTema } from "@/components/ui/SelectorTema";

type Props = {
  idTitulo: string;
  titulo: string;
  descripcion: ReactNode;
  vuelta: { href: string; texto: string };
  children: ReactNode;
};

export function MarcoDeAcceso({ idTitulo, titulo, descripcion, vuelta, children }: Props) {
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
            <h1 id={idTitulo} className="text-seccion">
              {titulo}
            </h1>
            <div className="mt-5 max-w-[44ch] text-tenue">{descripcion}</div>
            <Link
              href={vuelta.href}
              className="group mt-8 inline-flex items-center gap-2 text-[0.9375rem] font-medium text-acento"
            >
              <ArrowLeft
                aria-hidden="true"
                size={16}
                className="transition-transform duration-150 ease-salida group-hover:-translate-x-0.5 motion-reduce:transform-none"
              />
              {vuelta.texto}
            </Link>
          </div>
          <div className="lg:col-span-5 lg:col-start-8">{children}</div>
        </div>
      </main>
    </>
  );
}
