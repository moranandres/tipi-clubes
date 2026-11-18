import { EsqueletoFichasPorEstado, FichasPorEstado } from "@/components/portal/FichasPorEstado";
import type { ConteosDe } from "@/lib/api/lista";
import {
  ESTADOS_DE_PROYECTO,
  PLURALES_DE_ESTADO_DE_PROYECTO,
  PUNTOS_DE_ESTADO_DE_PROYECTO,
  rutaDeProyectos,
  type EstadoProyecto,
  type FiltrosProyectos,
} from "@/lib/portal/filtros-proyectos";

type Props = {
  filtros: FiltrosProyectos;
  conteos: ConteosDe<EstadoProyecto>;
};

const COLUMNAS = "sm:grid-cols-3 lg:max-w-[54rem]";

export function ResumenDeProyectos({ filtros, conteos }: Props) {
  return (
    <FichasPorEstado
      etiqueta="Proyectos por estado"
      elegido={filtros.estado}
      columnas={COLUMNAS}
      fichas={ESTADOS_DE_PROYECTO.map((estado) => ({
        valor: estado,
        nombre: PLURALES_DE_ESTADO_DE_PROYECTO[estado],
        punto: PUNTOS_DE_ESTADO_DE_PROYECTO[estado],
        cantidad: conteos[estado],
        ruta: rutaDeProyectos({ ...filtros, estado: filtros.estado === estado ? null : estado, pagina: 1 }),
      }))}
    />
  );
}

export function EsqueletoResumenDeProyectos() {
  return <EsqueletoFichasPorEstado cantidad={ESTADOS_DE_PROYECTO.length} columnas={COLUMNAS} />;
}
