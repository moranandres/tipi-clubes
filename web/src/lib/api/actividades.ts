import "server-only";
import { cache } from "react";
import {
  ACTIVIDADES_POR_PAGINA,
  ESTADOS_DE_ACTIVIDAD,
  FICHAS_DE_ACTIVIDAD,
  type EstadoActividad,
  type FichaDeActividad,
  type FiltrosActividades,
} from "@/lib/portal/filtros-actividades";
import { api, type Esquemas } from "./cliente";
import {
  TAMANO_MAXIMO_DE_PAGINA,
  conSesion,
  exigirAutenticacion,
  intentar,
  reunirPaginas,
  tokenDeSesion,
} from "./con-sesion";
import type { Curso } from "./cursos";
import { comoDetalle, type ResultadoDeDetalle } from "./detalle";
import { comoLista, contarPorEstado, type ConteosDe, type ResultadoDeLista } from "./lista";

export type Actividad = Esquemas["ActividadResponse"];
export type Reprogramacion = Esquemas["ReprogramacionResponse"];
export type Contenido = Esquemas["ContenidoResponse"];
export type ContenidoAsignado = Esquemas["ContenidoResumen"];
export type OpcionDeClub = Esquemas["ClubOpcionResponse"];

export type ConsultaDeSesiones = {
  club: number | null;
  institucion: number | null;
  desde: string | null;
  hasta: string | null;
  pagina: number;
};

const LIMITE_DE_CLUBES = 50;
const ESTADO_EJECUTADA: EstadoActividad = "EJECUTADA";
const FICHA_POR_REGISTRAR: FichaDeActividad = "POR_REGISTRAR";

function estadoDe(ficha: FichaDeActividad | null): EstadoActividad | undefined {
  return ESTADOS_DE_ACTIVIDAD.find((estado) => estado === ficha);
}

function consultaDe(filtros: FiltrosActividades, ficha: FichaDeActividad | null) {
  return {
    q: filtros.q || undefined,
    estado: estadoDe(ficha),
    pendientes: ficha === FICHA_POR_REGISTRAR ? true : undefined,
    clubId: filtros.club ?? undefined,
    cursoId: filtros.club ? (filtros.curso ?? undefined) : undefined,
    institucionId: filtros.institucion ?? undefined,
    desde: filtros.desde ?? undefined,
    hasta: filtros.hasta ?? undefined,
  };
}

export async function listarActividades(
  filtros: FiltrosActividades,
): Promise<ResultadoDeLista<Actividad>> {
  const token = await tokenDeSesion();

  return comoLista<Actividad>(
    await intentar(
      api.GET("/api/actividades", {
        ...conSesion(token),
        params: {
          query: {
            ...consultaDe(filtros, filtros.estado),
            pagina: filtros.pagina - 1,
            tamano: ACTIVIDADES_POR_PAGINA,
          },
        },
      }),
    ),
  );
}

export async function contarActividadesPorFicha(
  filtros: FiltrosActividades,
): Promise<ConteosDe<FichaDeActividad>> {
  const token = await tokenDeSesion();

  return contarPorEstado(FICHAS_DE_ACTIVIDAD, (ficha) =>
    intentar(
      api.GET("/api/actividades", {
        ...conSesion(token),
        params: { query: { ...consultaDe(filtros, ficha), pagina: 0, tamano: 1 } },
      }),
    ),
  );
}

export async function listarSesionesEjecutadas(
  consulta: ConsultaDeSesiones,
  porPagina: number,
): Promise<ResultadoDeLista<Actividad>> {
  const token = await tokenDeSesion();

  return comoLista<Actividad>(
    await intentar(
      api.GET("/api/actividades", {
        ...conSesion(token),
        params: {
          query: {
            estado: ESTADO_EJECUTADA,
            clubId: consulta.club ?? undefined,
            institucionId: consulta.institucion ?? undefined,
            desde: consulta.desde ?? undefined,
            hasta: consulta.hasta ?? undefined,
            pagina: consulta.pagina - 1,
            tamano: porPagina,
          },
        },
      }),
    ),
  );
}

export const obtenerActividad = cache(
  async (id: number): Promise<ResultadoDeDetalle<Actividad>> => {
    const token = await tokenDeSesion();

    return comoDetalle(
      await intentar(
        api.GET("/api/actividades/{id}", { ...conSesion(token), params: { path: { id } } }),
      ),
    );
  },
);

export async function listarReprogramaciones(id: number): Promise<Reprogramacion[] | null> {
  const token = await tokenDeSesion();

  const respuesta = await intentar(
    api.GET("/api/actividades/{id}/reprogramaciones", {
      ...conSesion(token),
      params: { path: { id } },
    }),
  );

  exigirAutenticacion(respuesta);
  return respuesta.datos;
}

export const listarContenidosActivos = cache(async (): Promise<Contenido[] | null> => {
  const token = await tokenDeSesion();

  const respuesta = await intentar(
    api.GET("/api/contenidos", { ...conSesion(token), params: { query: { activo: true } } }),
  );

  exigirAutenticacion(respuesta);
  return respuesta.datos;
});

export const listarOpcionesDeClubes = cache(
  async (institucion: number | null): Promise<OpcionDeClub[]> => {
    const token = await tokenDeSesion();

    const respuesta = await intentar(
      api.GET("/api/opciones/clubes", {
        ...conSesion(token),
        params: {
          query: { institucionId: institucion ?? undefined, limite: LIMITE_DE_CLUBES },
        },
      }),
    );

    exigirAutenticacion(respuesta);
    return respuesta.datos?.opciones ?? [];
  },
);

export const listarCursosDeClub = cache(async (clubId: number): Promise<Curso[] | null> => {
  const token = await tokenDeSesion();

  return reunirPaginas((pagina) =>
    intentar(
      api.GET("/api/cursos", {
        ...conSesion(token),
        params: { query: { clubId, pagina, tamano: TAMANO_MAXIMO_DE_PAGINA } },
      }),
    ),
  );
});

export async function listarCursosDelAlcance(): Promise<Curso[] | null> {
  const token = await tokenDeSesion();

  return reunirPaginas((pagina) =>
    intentar(
      api.GET("/api/cursos", {
        ...conSesion(token),
        params: { query: { pagina, tamano: TAMANO_MAXIMO_DE_PAGINA } },
      }),
    ),
  );
}
