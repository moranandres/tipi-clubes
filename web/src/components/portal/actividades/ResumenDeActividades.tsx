import {
  EsqueletoFichasPorEstado,
  FichasPorEstado,
} from "@/components/portal/FichasPorEstado";
import type { ConteosDe } from "@/lib/api/lista";
import {
  FICHAS_DE_ACTIVIDAD,
  NOMBRES_DE_FICHA_DE_ACTIVIDAD,
  PUNTOS_DE_FICHA_DE_ACTIVIDAD,
  rutaDeActividades,
  type FichaDeActividad,
  type FiltrosActividades,
} from "@/lib/portal/filtros-actividades";

type Props = {
  filtros: FiltrosActividades;
  conteos: ConteosDe<FichaDeActividad>;
};

export function ResumenDeActividades({ filtros, conteos }: Props) {
  return (
    <FichasPorEstado
      etiqueta="Actividades por estado"
      elegido={filtros.estado}
      fichas={FICHAS_DE_ACTIVIDAD.map((ficha) => ({
        valor: ficha,
        nombre: NOMBRES_DE_FICHA_DE_ACTIVIDAD[ficha],
        punto: PUNTOS_DE_FICHA_DE_ACTIVIDAD[ficha],
        cantidad: conteos[ficha],
        ruta: rutaDeActividades({
          ...filtros,
          estado: filtros.estado === ficha ? null : ficha,
          pagina: 1,
        }),
      }))}
    />
  );
}

export function EsqueletoResumenDeActividades() {
  return <EsqueletoFichasPorEstado cantidad={FICHAS_DE_ACTIVIDAD.length} />;
}
