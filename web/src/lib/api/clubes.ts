import "server-only";
import { cache } from "react";
import { CLUBES_POR_PAGINA, type FiltrosClubes } from "@/lib/portal/filtros-clubes";
import { api, type Esquemas } from "./cliente";
import {
  TAMANO_MAXIMO_DE_PAGINA,
  conSesion,
  exigirAutenticacion,
  intentar,
  reunirPaginas,
  tokenDeSesion,
} from "./con-sesion";
import { comoDetalle, type ResultadoDeDetalle } from "./detalle";

export type Club = Esquemas["ClubResponse"];
export type CierreDeClub = Esquemas["CierreClubResponse"];
export type Docente = Esquemas["DocenteResponse"];
export type Periodo = Esquemas["PeriodoResponse"];
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

export const obtenerClub = cache(async (id: number): Promise<ResultadoDeDetalle<Club>> => {
  const token = await tokenDeSesion();

  return comoDetalle(
    await intentar(
      api.GET("/api/clubes/{id}", { ...conSesion(token), params: { path: { id } } }),
    ),
  );
});

export async function previsualizarCierreDeClub(id: number): Promise<CierreDeClub | null> {
  const token = await tokenDeSesion();

  const respuesta = await intentar(
    api.GET("/api/clubes/{id}/cierre", { ...conSesion(token), params: { path: { id } } }),
  );

  exigirAutenticacion(respuesta);
  return respuesta.datos;
}

export const listarPeriodos = cache(async (): Promise<Periodo[] | null> => {
  const token = await tokenDeSesion();

  const respuesta = await intentar(api.GET("/api/periodos", conSesion(token)));

  exigirAutenticacion(respuesta);
  return respuesta.datos;
});

export async function listarDocentesActivos(institucionId: number): Promise<Docente[] | null> {
  const token = await tokenDeSesion();

  return reunirPaginas((pagina) =>
    intentar(
      api.GET("/api/docentes", {
        ...conSesion(token),
        params: {
          query: { institucionId, activo: true, pagina, tamano: TAMANO_MAXIMO_DE_PAGINA },
        },
      }),
    ),
  );
}

export async function listarInstitucionesParaFormulario(): Promise<OpcionDeInstitucion[] | null> {
  const token = await tokenDeSesion();

  const instituciones = await reunirPaginas((pagina) =>
    intentar(
      api.GET("/api/instituciones", {
        ...conSesion(token),
        params: { query: { pagina, tamano: TAMANO_MAXIMO_DE_PAGINA } },
      }),
    ),
  );

  return instituciones
    ? instituciones.map((institucion) => ({ id: institucion.id, nombre: institucion.nombre }))
    : null;
}

export async function listarClubesParaFormulario(): Promise<Club[] | null> {
  const token = await tokenDeSesion();

  return reunirPaginas((pagina) =>
    intentar(
      api.GET("/api/clubes", {
        ...conSesion(token),
        params: { query: { pagina, tamano: TAMANO_MAXIMO_DE_PAGINA } },
      }),
    ),
  );
}
