import {
  EsqueletoFichasPorEstado,
  FichasPorEstado,
} from "@/components/portal/FichasPorEstado";
import type { ConteosDe } from "@/lib/api/lista";
import { rutaDelCatalogo, type FiltrosCatalogo } from "@/lib/portal/filtros-catalogo";
import {
  ESTADOS_DE_CLUB,
  NOMBRES_DE_ESTADO,
  PUNTOS_DE_ESTADO_DE_CLUB,
  type EstadoClub,
} from "@/lib/portal/filtros-clubes";

type Props = {
  filtros: FiltrosCatalogo;
  conteos: ConteosDe<EstadoClub>;
};

export function ResumenDelCatalogo({ filtros, conteos }: Props) {
  return (
    <FichasPorEstado
      etiqueta="Clubes del catálogo por estado"
      elegido={filtros.estado}
      fichas={ESTADOS_DE_CLUB.map((estado) => ({
        valor: estado,
        nombre: NOMBRES_DE_ESTADO[estado],
        punto: PUNTOS_DE_ESTADO_DE_CLUB[estado],
        cantidad: conteos[estado],
        ruta: rutaDelCatalogo({
          ...filtros,
          estado: filtros.estado === estado ? null : estado,
          pagina: 1,
        }),
      }))}
    />
  );
}

export function EsqueletoResumenDelCatalogo() {
  return <EsqueletoFichasPorEstado cantidad={ESTADOS_DE_CLUB.length} />;
}
