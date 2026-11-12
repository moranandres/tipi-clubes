import "server-only";
import { cache } from "react";
import { CLUBES_POR_PAGINA, type FiltrosClubes } from "@/lib/portal/filtros-clubes";
import { api, type Esquemas } from "./cliente";
import { conSesion, exigirAutenticacion, intentar, tokenDeSesion } from "./con-sesion";

export type Club = Esquemas["ClubResponse"];
export type OpcionDeInstitucion = Esquemas["OpcionResponse"];

export type PaginaDeClubes = {
  clubes: Club[];
  total: number;
  pagina: number;
  totalPaginas: number;
};

export type ResultadoDeClubes =
  | { estado: "ok"; datos: PaginaDeClubes }
  | { estado: "denegado"; mensaje: string }
  | { estado: "sin-servicio" };

const ACCESO_DENEGADO = 403;
const LIMITE_DE_INSTITUCIONES = 50;
const MENSAJE_DENEGADO = "Tu cuenta no tiene permiso para ver esta lista.";

export async function listarClubes(filtros: FiltrosClubes): Promise<ResultadoDeClubes> {
  const token = await tokenDeSesion();

  const respuesta = await intentar(
    api.GET("/api/clubes", {
      ...conSesion(token),
      params: {
        query: {
          q: filtros.q || undefined,
          estado: filtros.estado ?? undefined,
          institucionId: filtros.institucion ?? undefined,
          pagina: filtros.pagina - 1,
          tamano: CLUBES_POR_PAGINA,
        },
      },
    }),
  );

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
      clubes: respuesta.datos.contenido ?? [],
      total: respuesta.datos.totalElementos ?? 0,
      pagina: (respuesta.datos.pagina ?? 0) + 1,
      totalPaginas: Math.max(respuesta.datos.totalPaginas ?? 1, 1),
    },
  };
}

export const listarInstitucionesParaFiltro = cache(async (): Promise<OpcionDeInstitucion[]> => {
  const token = await tokenDeSesion();

  const respuesta = await intentar(
    api.GET("/api/opciones/instituciones", {
      ...conSesion(token),
      params: { query: { limite: LIMITE_DE_INSTITUCIONES } },
    }),
  );

  exigirAutenticacion(respuesta);
  return respuesta.datos?.opciones ?? [];
});
