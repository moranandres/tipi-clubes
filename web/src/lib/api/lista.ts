import "server-only";
import { exigirAutenticacion, type Resultado } from "./con-sesion";

export type PaginaDe<T> = {
  elementos: T[];
  total: number;
  pagina: number;
  totalPaginas: number;
};

export type ResultadoDeLista<T> =
  | { estado: "ok"; datos: PaginaDe<T> }
  | { estado: "denegado"; mensaje: string }
  | { estado: "sin-servicio" };

export type ConteosDe<E extends string> = Record<E, number | null>;

type PaginaDeApi = {
  contenido?: unknown[];
  totalElementos?: number;
  pagina?: number;
  totalPaginas?: number;
};

const ACCESO_DENEGADO = 403;
const MENSAJE_DENEGADO = "Tu cuenta no tiene permiso para ver esta lista.";

export function comoLista<T>(respuesta: Resultado<PaginaDeApi>): ResultadoDeLista<T> {
  exigirAutenticacion(respuesta);

  if (respuesta.estado === ACCESO_DENEGADO) {
    return { estado: "denegado", mensaje: respuesta.detalle ?? MENSAJE_DENEGADO };
  }
  if (!respuesta.datos) {
    return { estado: "sin-servicio" };
  }

  return {
    estado: "ok",
    datos: {
      elementos: (respuesta.datos.contenido ?? []) as T[],
      total: respuesta.datos.totalElementos ?? 0,
      pagina: (respuesta.datos.pagina ?? 0) + 1,
      totalPaginas: Math.max(respuesta.datos.totalPaginas ?? 1, 1),
    },
  };
}

export async function contarPorEstado<E extends string>(
  estados: readonly E[],
  pedir: (estado: E) => Promise<Resultado<PaginaDeApi>>,
): Promise<ConteosDe<E>> {
  const respuestas = await Promise.all(estados.map((estado) => pedir(estado)));

  exigirAutenticacion(...respuestas);

  return Object.fromEntries(
    estados.map((estado, indice) => [estado, respuestas[indice].datos?.totalElementos ?? null]),
  ) as ConteosDe<E>;
}
