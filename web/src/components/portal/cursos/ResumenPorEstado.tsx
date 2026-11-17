import {
  EsqueletoFichasPorEstado,
  FichasPorEstado,
} from "@/components/portal/FichasPorEstado";
import type { ConteosPorEstado } from "@/lib/api/cursos";
import {
  ESTADOS_DE_CURSO,
  NOMBRES_DE_ESTADO_DE_CURSO,
  PUNTOS_DE_ESTADO_DE_CURSO,
  rutaDeCursos,
  type FiltrosCursos,
} from "@/lib/portal/filtros-cursos";

type Props = {
  filtros: FiltrosCursos;
  conteos: ConteosPorEstado;
};

export function ResumenPorEstado({ filtros, conteos }: Props) {
  return (
    <FichasPorEstado
      etiqueta="Cursos por estado"
      elegido={filtros.estado}
      fichas={ESTADOS_DE_CURSO.map((estado) => ({
        valor: estado,
        nombre: NOMBRES_DE_ESTADO_DE_CURSO[estado],
        punto: PUNTOS_DE_ESTADO_DE_CURSO[estado],
        cantidad: conteos[estado],
        ruta: rutaDeCursos({
          ...filtros,
          estado: filtros.estado === estado ? null : estado,
          pagina: 1,
        }),
      }))}
    />
  );
}

export function EsqueletoResumenPorEstado() {
  return <EsqueletoFichasPorEstado cantidad={ESTADOS_DE_CURSO.length} />;
}
