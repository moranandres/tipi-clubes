import {
  EsqueletoFichasPorEstado,
  FichasPorEstado,
} from "@/components/portal/FichasPorEstado";
import type { ConteosDe } from "@/lib/api/lista";
import {
  rutaDeAutorizaciones,
  type FiltrosAutorizaciones,
} from "@/lib/portal/filtros-autorizaciones";
import {
  ESTADOS_DE_AUTORIZACION,
  NOMBRES_DE_AUTORIZACION,
  PUNTOS_DE_AUTORIZACION,
  type EstadoAutorizacion,
} from "@/lib/portal/filtros-estudiantes";

type Props = {
  filtros: FiltrosAutorizaciones;
  conteos: ConteosDe<EstadoAutorizacion>;
};

export function ResumenDeAutorizaciones({ filtros, conteos }: Props) {
  return (
    <FichasPorEstado
      etiqueta="Autorizaciones por estado"
      elegido={filtros.estado}
      fichas={ESTADOS_DE_AUTORIZACION.map((estado) => ({
        valor: estado,
        nombre: NOMBRES_DE_AUTORIZACION[estado],
        punto: PUNTOS_DE_AUTORIZACION[estado],
        cantidad: conteos[estado],
        ruta: rutaDeAutorizaciones({
          ...filtros,
          estado: filtros.estado === estado ? null : estado,
          pagina: 1,
        }),
      }))}
    />
  );
}

export function EsqueletoResumenDeAutorizaciones() {
  return <EsqueletoFichasPorEstado cantidad={ESTADOS_DE_AUTORIZACION.length} />;
}
