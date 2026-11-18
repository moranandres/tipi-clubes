import "server-only";
import { cache } from "react";
import type { EstadoClub } from "@/lib/portal/filtros-clubes";
import {
  CLUBES_DEL_CATALOGO_POR_PAGINA,
  type FiltrosCatalogo,
} from "@/lib/portal/filtros-catalogo";
import { api, type Esquemas } from "./cliente";
import { conSesion, exigirAutenticacion, intentar, tokenDeSesion } from "./con-sesion";
import { comoDetalle, type ResultadoDeDetalle } from "./detalle";
import { comoLista, contarPorEstado, type ConteosDe, type ResultadoDeLista } from "./lista";

export type ClubDelCatalogo = Esquemas["CatalogoClubResponse"];
export type DetalleDeClubDelCatalogo = Esquemas["CatalogoClubDetalleResponse"];
export type CursoDelCatalogo = Esquemas["CatalogoCursoResponse"];
export type InstitucionDelCatalogo = Esquemas["CatalogoInstitucionResponse"];

function consultaDe(filtros: FiltrosCatalogo, estado: EstadoClub | null) {
  return {
    q: filtros.q || undefined,
    institucionId: filtros.institucion ?? undefined,
    periodoId: filtros.periodo ?? undefined,
    estado: estado ?? undefined,
    abiertos: filtros.inscripciones ? filtros.inscripciones === "ABIERTAS" : undefined,
    conCupo: filtros.cupo ? filtros.cupo === "CON_CUPO" : undefined,
    nivel: filtros.nivel ?? undefined,
    modalidad: filtros.modalidad ?? undefined,
  };
}

export async function listarClubesDelCatalogo(
  filtros: FiltrosCatalogo,
): Promise<ResultadoDeLista<ClubDelCatalogo>> {
  const token = await tokenDeSesion();

  return comoLista<ClubDelCatalogo>(
    await intentar(
      api.GET("/api/catalogo/clubes", {
        ...conSesion(token),
        params: {
          query: {
            ...consultaDe(filtros, filtros.estado),
            pagina: filtros.pagina - 1,
            tamano: CLUBES_DEL_CATALOGO_POR_PAGINA,
          },
        },
      }),
    ),
  );
}

export async function contarClubesDelCatalogoPorEstado(
  filtros: FiltrosCatalogo,
  estados: readonly EstadoClub[],
): Promise<ConteosDe<EstadoClub>> {
  const token = await tokenDeSesion();

  return contarPorEstado(estados, (estado) =>
    intentar(
      api.GET("/api/catalogo/clubes", {
        ...conSesion(token),
        params: { query: { ...consultaDe(filtros, estado), pagina: 0, tamano: 1 } },
      }),
    ),
  );
}

export const listarInstitucionesDelCatalogo = cache(
  async (periodo: number | null): Promise<InstitucionDelCatalogo[] | null> => {
    const token = await tokenDeSesion();

    const respuesta = await intentar(
      api.GET("/api/catalogo/instituciones", {
        ...conSesion(token),
        params: { query: { periodoId: periodo ?? undefined } },
      }),
    );

    exigirAutenticacion(respuesta);
    return respuesta.datos;
  },
);

export const obtenerClubDelCatalogo = cache(
  async (id: number): Promise<ResultadoDeDetalle<DetalleDeClubDelCatalogo>> => {
    const token = await tokenDeSesion();

    return comoDetalle(
      await intentar(
        api.GET("/api/catalogo/clubes/{id}", { ...conSesion(token), params: { path: { id } } }),
      ),
    );
  },
);
