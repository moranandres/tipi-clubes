import {
  EsqueletoFichasPorEstado,
  FichasPorEstado,
} from "@/components/portal/FichasPorEstado";
import type { ConteosDe } from "@/lib/api/lista";
import {
  ESTADOS_DE_CONTENIDO,
  NOMBRES_DE_ESTADO_DE_CONTENIDO,
  PUNTOS_DE_ESTADO_DE_CONTENIDO,
  rutaDeContenidos,
  type EstadoContenido,
  type FiltrosContenidos,
} from "@/lib/portal/filtros-contenidos";

type Props = {
  filtros: FiltrosContenidos;
  conteos: ConteosDe<EstadoContenido>;
};

const COLUMNAS_DE_DOS_FICHAS = "sm:max-w-[30rem]";

export function ResumenDeContenidos({ filtros, conteos }: Props) {
  return (
    <FichasPorEstado
      etiqueta="Contenidos por estado"
      elegido={filtros.estado}
      columnas={COLUMNAS_DE_DOS_FICHAS}
      fichas={ESTADOS_DE_CONTENIDO.map((estado) => ({
        valor: estado,
        nombre: NOMBRES_DE_ESTADO_DE_CONTENIDO[estado],
        punto: PUNTOS_DE_ESTADO_DE_CONTENIDO[estado],
        cantidad: conteos[estado],
        ruta: rutaDeContenidos({
          ...filtros,
          estado: filtros.estado === estado ? null : estado,
        }),
      }))}
    />
  );
}

export function EsqueletoResumenDeContenidos() {
  return (
    <EsqueletoFichasPorEstado
      cantidad={ESTADOS_DE_CONTENIDO.length}
      columnas={COLUMNAS_DE_DOS_FICHAS}
    />
  );
}
