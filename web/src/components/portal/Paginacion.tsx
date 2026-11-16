"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { Boton } from "@/components/ui/Boton";
import { useBusqueda } from "./Busqueda";

type Props = {
  etiqueta: string;
  pagina: number;
  totalPaginas: number;
  rutaAnterior: string | null;
  rutaSiguiente: string | null;
};

export function Paginacion({ etiqueta, pagina, totalPaginas, rutaAnterior, rutaSiguiente }: Props) {
  const { navegar } = useBusqueda();

  if (totalPaginas <= 1) {
    return null;
  }

  return (
    <nav
      aria-label={etiqueta}
      className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-3"
    >
      <p className="cifras text-[0.9375rem] text-tenue">
        Página {pagina} de {totalPaginas}
      </p>
      <div className="flex gap-2">
        <Boton
          variante="secundario"
          textoCargando=""
          disabled={!rutaAnterior}
          onClick={() => rutaAnterior && navegar(rutaAnterior)}
        >
          <ArrowLeft aria-hidden="true" size={16} />
          Anterior
        </Boton>
        <Boton
          variante="secundario"
          textoCargando=""
          disabled={!rutaSiguiente}
          onClick={() => rutaSiguiente && navegar(rutaSiguiente)}
        >
          Siguiente
          <ArrowRight aria-hidden="true" size={16} />
        </Boton>
      </div>
    </nav>
  );
}
