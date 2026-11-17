import {
  EsqueletoFichasPorEstado,
  FichasPorEstado,
} from "@/components/portal/FichasPorEstado";
import type { ConteosDe } from "@/lib/api/lista";
import {
  ESTADOS_DE_ESTUDIANTE,
  NOMBRES_DE_ESTADO_DE_ESTUDIANTE,
  PUNTOS_DE_ESTADO_DE_ESTUDIANTE,
  rutaDeEstudiantes,
  type EstadoEstudiante,
  type FiltrosEstudiantes,
} from "@/lib/portal/filtros-estudiantes";

type Props = {
  filtros: FiltrosEstudiantes;
  conteos: ConteosDe<EstadoEstudiante>;
};

const COLUMNAS_DE_TRES_FICHAS = "sm:grid-cols-3";

export function ResumenDeEstudiantes({ filtros, conteos }: Props) {
  return (
    <FichasPorEstado
      etiqueta="Estudiantes por estado"
      elegido={filtros.estado}
      columnas={COLUMNAS_DE_TRES_FICHAS}
      fichas={ESTADOS_DE_ESTUDIANTE.map((estado) => ({
        valor: estado,
        nombre: NOMBRES_DE_ESTADO_DE_ESTUDIANTE[estado],
        punto: PUNTOS_DE_ESTADO_DE_ESTUDIANTE[estado],
        cantidad: conteos[estado],
        ruta: rutaDeEstudiantes({
          ...filtros,
          estado: filtros.estado === estado ? null : estado,
          pagina: 1,
        }),
      }))}
    />
  );
}

export function EsqueletoResumenDeEstudiantes() {
  return (
    <EsqueletoFichasPorEstado
      cantidad={ESTADOS_DE_ESTUDIANTE.length}
      columnas={COLUMNAS_DE_TRES_FICHAS}
    />
  );
}
