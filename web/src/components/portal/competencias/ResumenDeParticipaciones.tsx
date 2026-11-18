import { EsqueletoFichasPorEstado, FichasPorEstado } from "@/components/portal/FichasPorEstado";
import type { ConteosDe } from "@/lib/api/lista";
import {
  NIVELES_DE_CATEGORIA,
  PLURALES_DE_NIVEL_DE_CATEGORIA,
  PUNTOS_DE_NIVEL_DE_CATEGORIA,
  rutaDeParticipaciones,
  type FiltrosParticipaciones,
  type NivelCategoria,
} from "@/lib/portal/filtros-competencias";

type Props = {
  filtros: FiltrosParticipaciones;
  conteos: ConteosDe<NivelCategoria>;
};

const COLUMNAS = "sm:grid-cols-2 lg:max-w-[36rem]";

export function ResumenDeParticipaciones({ filtros, conteos }: Props) {
  return (
    <FichasPorEstado
      etiqueta="Participaciones por nivel de categoría"
      elegido={filtros.nivel}
      columnas={COLUMNAS}
      fichas={NIVELES_DE_CATEGORIA.map((nivel) => ({
        valor: nivel,
        nombre: PLURALES_DE_NIVEL_DE_CATEGORIA[nivel],
        punto: PUNTOS_DE_NIVEL_DE_CATEGORIA[nivel],
        cantidad: conteos[nivel],
        ruta: rutaDeParticipaciones({
          ...filtros,
          nivel: filtros.nivel === nivel ? null : nivel,
          pagina: 1,
        }),
      }))}
    />
  );
}

export function EsqueletoResumenDeParticipaciones() {
  return <EsqueletoFichasPorEstado cantidad={NIVELES_DE_CATEGORIA.length} columnas={COLUMNAS} />;
}
