import {
  EsqueletoFichasPorEstado,
  FichasPorEstado,
} from "@/components/portal/FichasPorEstado";
import type { ConteosDe } from "@/lib/api/lista";
import {
  ESTADOS_DE_SOLICITUD,
  NOMBRES_DE_ESTADO_DE_SOLICITUD,
  PUNTOS_DE_ESTADO_DE_SOLICITUD,
  rutaDeSolicitudes,
  type EstadoSolicitud,
  type FiltrosSolicitudes,
} from "@/lib/portal/filtros-solicitudes";

const COLUMNAS_DE_CINCO_FICHAS = "sm:grid-cols-3 xl:grid-cols-5";

type Props = {
  filtros: FiltrosSolicitudes;
  conteos: ConteosDe<EstadoSolicitud>;
};

export function ResumenDeSolicitudes({ filtros, conteos }: Props) {
  return (
    <FichasPorEstado
      etiqueta="Solicitudes por estado"
      elegido={filtros.estado}
      columnas={COLUMNAS_DE_CINCO_FICHAS}
      fichas={ESTADOS_DE_SOLICITUD.map((estado) => ({
        valor: estado,
        nombre: NOMBRES_DE_ESTADO_DE_SOLICITUD[estado],
        punto: PUNTOS_DE_ESTADO_DE_SOLICITUD[estado],
        cantidad: conteos[estado],
        ruta: rutaDeSolicitudes({
          ...filtros,
          estado: filtros.estado === estado ? null : estado,
          pagina: 1,
        }),
      }))}
    />
  );
}

export function EsqueletoResumenDeSolicitudes() {
  return (
    <EsqueletoFichasPorEstado
      cantidad={ESTADOS_DE_SOLICITUD.length}
      columnas={COLUMNAS_DE_CINCO_FICHAS}
    />
  );
}
