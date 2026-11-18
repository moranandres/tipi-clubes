import {
  EsqueletoFichasPorEstado,
  FichasPorEstado,
} from "@/components/portal/FichasPorEstado";
import type { ConteosDe } from "@/lib/api/lista";
import {
  ESTADOS_DE_USUARIO,
  NOMBRES_DE_ESTADO_DE_USUARIO,
  PUNTOS_DE_ESTADO_DE_USUARIO,
  rutaDeUsuarios,
  type EstadoUsuario,
  type FiltrosUsuarios,
} from "@/lib/portal/filtros-usuarios";

type Props = {
  filtros: FiltrosUsuarios;
  conteos: ConteosDe<EstadoUsuario>;
};

const COLUMNAS_DE_DOS_FICHAS = "sm:max-w-[30rem]";

export function ResumenDeUsuarios({ filtros, conteos }: Props) {
  return (
    <FichasPorEstado
      etiqueta="Cuentas por estado"
      elegido={filtros.estado}
      columnas={COLUMNAS_DE_DOS_FICHAS}
      fichas={ESTADOS_DE_USUARIO.map((estado) => ({
        valor: estado,
        nombre: NOMBRES_DE_ESTADO_DE_USUARIO[estado],
        punto: PUNTOS_DE_ESTADO_DE_USUARIO[estado],
        cantidad: conteos[estado],
        ruta: rutaDeUsuarios({
          ...filtros,
          estado: filtros.estado === estado ? null : estado,
          pagina: 1,
        }),
      }))}
    />
  );
}

export function EsqueletoResumenDeUsuarios() {
  return (
    <EsqueletoFichasPorEstado cantidad={ESTADOS_DE_USUARIO.length} columnas={COLUMNAS_DE_DOS_FICHAS} />
  );
}
