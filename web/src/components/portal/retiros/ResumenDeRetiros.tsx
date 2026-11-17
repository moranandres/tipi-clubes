import {
  EsqueletoFichasPorEstado,
  FichasPorEstado,
} from "@/components/portal/FichasPorEstado";
import type { ConteosDe } from "@/lib/api/lista";
import {
  ESTADOS_DE_RETIRO,
  NOMBRES_DE_ESTADO_DE_RETIRO,
  PUNTOS_DE_ESTADO_DE_RETIRO,
  rutaDeRetiros,
  type EstadoRetiro,
  type FiltrosRetiros,
} from "@/lib/portal/filtros-retiros";

type Props = {
  filtros: FiltrosRetiros;
  conteos: ConteosDe<EstadoRetiro>;
};

export function ResumenDeRetiros({ filtros, conteos }: Props) {
  return (
    <FichasPorEstado
      etiqueta="Solicitudes de retiro por estado"
      elegido={filtros.estado}
      fichas={ESTADOS_DE_RETIRO.map((estado) => ({
        valor: estado,
        nombre: NOMBRES_DE_ESTADO_DE_RETIRO[estado],
        punto: PUNTOS_DE_ESTADO_DE_RETIRO[estado],
        cantidad: conteos[estado],
        ruta: rutaDeRetiros({
          ...filtros,
          estado: filtros.estado === estado ? null : estado,
          pagina: 1,
        }),
      }))}
    />
  );
}

export function EsqueletoResumenDeRetiros() {
  return <EsqueletoFichasPorEstado cantidad={ESTADOS_DE_RETIRO.length} />;
}
