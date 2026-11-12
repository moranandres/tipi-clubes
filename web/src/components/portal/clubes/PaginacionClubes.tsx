"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useBusqueda } from "@/components/portal/Busqueda";
import { Boton } from "@/components/ui/Boton";
import { rutaConFiltros, type FiltrosClubes } from "@/lib/portal/filtros-clubes";

type Props = {
  filtros: FiltrosClubes;
  pagina: number;
  totalPaginas: number;
};

export function PaginacionClubes({ filtros, pagina, totalPaginas }: Props) {
  const { navegar } = useBusqueda();

  if (totalPaginas <= 1) {
    return null;
  }

  function irA(destino: number) {
    navegar(rutaConFiltros({ ...filtros, pagina: destino }));
  }

  return (
    <nav
      aria-label="Páginas de la lista de clubes"
      className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-3"
    >
      <p className="cifras text-[0.9375rem] text-tenue">
        Página {pagina} de {totalPaginas}
      </p>
      <div className="flex gap-2">
        <Boton
          variante="secundario"
          textoCargando=""
          disabled={pagina <= 1}
          onClick={() => irA(pagina - 1)}
        >
          <ArrowLeft aria-hidden="true" size={16} />
          Anterior
        </Boton>
        <Boton
          variante="secundario"
          textoCargando=""
          disabled={pagina >= totalPaginas}
          onClick={() => irA(pagina + 1)}
        >
          Siguiente
          <ArrowRight aria-hidden="true" size={16} />
        </Boton>
      </div>
    </nav>
  );
}
