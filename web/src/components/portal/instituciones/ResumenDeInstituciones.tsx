import {
  EsqueletoFichasPorEstado,
  FichasPorEstado,
} from "@/components/portal/FichasPorEstado";
import type { ConteosDe } from "@/lib/api/lista";
import {
  ESTADOS_DE_ADHESION,
  NOMBRES_DE_ADHESION,
  PUNTOS_DE_ADHESION,
  rutaDeInstituciones,
  type EstadoAdhesion,
  type FiltrosInstituciones,
} from "@/lib/portal/filtros-instituciones";

type Props = {
  filtros: FiltrosInstituciones;
  conteos: ConteosDe<EstadoAdhesion>;
};

export function ResumenDeInstituciones({ filtros, conteos }: Props) {
  return (
    <FichasPorEstado
      etiqueta="Instituciones por estado de adhesión"
      elegido={filtros.estado}
      fichas={ESTADOS_DE_ADHESION.map((estado) => ({
        valor: estado,
        nombre: NOMBRES_DE_ADHESION[estado],
        punto: PUNTOS_DE_ADHESION[estado],
        cantidad: conteos[estado],
        ruta: rutaDeInstituciones({
          ...filtros,
          estado: filtros.estado === estado ? null : estado,
          pagina: 1,
        }),
      }))}
    />
  );
}

export function EsqueletoResumenDeInstituciones() {
  return <EsqueletoFichasPorEstado cantidad={ESTADOS_DE_ADHESION.length} />;
}
