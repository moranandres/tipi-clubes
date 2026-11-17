import {
  EsqueletoFichasPorEstado,
  FichasPorEstado,
} from "@/components/portal/FichasPorEstado";
import type { ConteosDe } from "@/lib/api/lista";
import {
  ESTADOS_DE_DOCENTE,
  NOMBRES_DE_ESTADO_DE_DOCENTE,
  PUNTOS_DE_ESTADO_DE_DOCENTE,
  rutaDeDocentes,
  type EstadoDocente,
  type FiltrosDocentes,
} from "@/lib/portal/filtros-docentes";

type Props = {
  filtros: FiltrosDocentes;
  conteos: ConteosDe<EstadoDocente>;
};

const COLUMNAS_DE_DOS_FICHAS = "sm:max-w-[30rem]";

export function ResumenDeDocentes({ filtros, conteos }: Props) {
  return (
    <FichasPorEstado
      etiqueta="Docentes por estado"
      elegido={filtros.estado}
      columnas={COLUMNAS_DE_DOS_FICHAS}
      fichas={ESTADOS_DE_DOCENTE.map((estado) => ({
        valor: estado,
        nombre: NOMBRES_DE_ESTADO_DE_DOCENTE[estado],
        punto: PUNTOS_DE_ESTADO_DE_DOCENTE[estado],
        cantidad: conteos[estado],
        ruta: rutaDeDocentes({
          ...filtros,
          estado: filtros.estado === estado ? null : estado,
          pagina: 1,
        }),
      }))}
    />
  );
}

export function EsqueletoResumenDeDocentes() {
  return (
    <EsqueletoFichasPorEstado cantidad={ESTADOS_DE_DOCENTE.length} columnas={COLUMNAS_DE_DOS_FICHAS} />
  );
}
