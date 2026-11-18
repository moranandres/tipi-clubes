import "server-only";
import { cache } from "react";
import {
  NIVELES_DE_CATEGORIA,
  PARTICIPACIONES_POR_PAGINA,
  type FiltrosParticipaciones,
  type NivelCategoria,
} from "@/lib/portal/filtros-competencias";
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
import type { InscripcionDeClub } from "./estudiantes";
import { comoLista, contarPorEstado, type ConteosDe, type ResultadoDeLista } from "./lista";

export type Participacion = Esquemas["ParticipacionResponse"];
export type Competencia = Esquemas["CompetenciaResponse"];
export type Edicion = Esquemas["EdicionResponse"];
export type Categoria = Esquemas["CategoriaResponse"];

export type CompetenciaConCatalogo = {
  competencia: Competencia;
  ediciones: Edicion[];
  categorias: Categoria[];
};

const INSCRIPCION_ACTIVA = "ACTIVA";
const TIPO_PARTICIPACION = "PARTICIPACION";
const AUTORIZACION_OTORGADA = "OTORGADA";
const PAGINAS_DE_AUTORIZACIONES = 5;

function consultaDe(filtros: FiltrosParticipaciones, nivel: NivelCategoria | null) {
  return {
    q: filtros.q || undefined,
    nivel: nivel ?? undefined,
    institucionId: filtros.institucion ?? undefined,
    clubId: filtros.club ?? undefined,
    competenciaId: filtros.competencia ?? undefined,
    edicionId: filtros.competencia ? (filtros.edicion ?? undefined) : undefined,
  };
}

export async function listarParticipaciones(
  filtros: FiltrosParticipaciones,
): Promise<ResultadoDeLista<Participacion>> {
  const token = await tokenDeSesion();

  return comoLista<Participacion>(
    await intentar(
      api.GET("/api/participaciones-competencia", {
        ...conSesion(token),
        params: {
          query: {
            ...consultaDe(filtros, filtros.nivel),
            pagina: filtros.pagina - 1,
            tamano: PARTICIPACIONES_POR_PAGINA,
          },
        },
      }),
    ),
  );
}

export async function contarParticipacionesPorNivel(
  filtros: FiltrosParticipaciones,
): Promise<ConteosDe<NivelCategoria>> {
  const token = await tokenDeSesion();

  return contarPorEstado(NIVELES_DE_CATEGORIA, (nivel) =>
    intentar(
      api.GET("/api/participaciones-competencia", {
        ...conSesion(token),
        params: { query: { ...consultaDe(filtros, nivel), pagina: 0, tamano: 1 } },
      }),
    ),
  );
}

export const obtenerParticipacion = cache(
  async (id: number): Promise<ResultadoDeDetalle<Participacion>> => {
    const token = await tokenDeSesion();

    return comoDetalle(
      await intentar(
        api.GET("/api/participaciones-competencia/{id}", {
          ...conSesion(token),
          params: { path: { id } },
        }),
      ),
    ) as ResultadoDeDetalle<Participacion>;
  },
);

export const listarCompetencias = cache(async (activa?: boolean): Promise<Competencia[] | null> => {
  const token = await tokenDeSesion();

  const respuesta = await intentar(
    api.GET("/api/competencias", { ...conSesion(token), params: { query: { activa } } }),
  );

  exigirAutenticacion(respuesta);
  return respuesta.datos;
});

export const obtenerCompetencia = cache(
  async (id: number): Promise<ResultadoDeDetalle<Competencia>> => {
    const token = await tokenDeSesion();

    return comoDetalle(
      await intentar(
        api.GET("/api/competencias/{id}", { ...conSesion(token), params: { path: { id } } }),
      ),
    );
  },
);

export const listarEdiciones = cache(
  async (competenciaId: number, activa?: boolean): Promise<Edicion[] | null> => {
    const token = await tokenDeSesion();

    const respuesta = await intentar(
      api.GET("/api/competencias/{competenciaId}/ediciones", {
        ...conSesion(token),
        params: { path: { competenciaId }, query: { activa } },
      }),
    );

    exigirAutenticacion(respuesta);
    return respuesta.datos;
  },
);

export const listarCategorias = cache(
  async (competenciaId: number, activa?: boolean): Promise<Categoria[] | null> => {
    const token = await tokenDeSesion();

    const respuesta = await intentar(
      api.GET("/api/competencias/{competenciaId}/categorias", {
        ...conSesion(token),
        params: { path: { competenciaId }, query: { activa } },
      }),
    );

    exigirAutenticacion(respuesta);
    return respuesta.datos;
  },
);

export async function obtenerCatalogoActivo(): Promise<CompetenciaConCatalogo[] | null> {
  const competencias = await listarCompetencias(true);
  if (!competencias) {
    return null;
  }

  const catalogo = await Promise.all(
    competencias
      .filter((competencia): competencia is Competencia & { id: number } => typeof competencia.id === "number")
      .map(async (competencia) => {
        const [ediciones, categorias] = await Promise.all([
          listarEdiciones(competencia.id, true),
          listarCategorias(competencia.id, true),
        ]);
        return ediciones && categorias ? { competencia, ediciones, categorias } : null;
      }),
  );

  return catalogo.some((entrada) => entrada === null)
    ? null
    : (catalogo as CompetenciaConCatalogo[]);
}

export async function listarIntegrantesActivos(): Promise<InscripcionDeClub[] | null> {
  const token = await tokenDeSesion();

  const inscripciones = await reunirPaginas((pagina) =>
    intentar(
      api.GET("/api/inscripciones", {
        ...conSesion(token),
        params: {
          query: { estado: INSCRIPCION_ACTIVA, pagina, tamano: TAMANO_MAXIMO_DE_PAGINA },
        },
      }),
    ),
  );

  return inscripciones as InscripcionDeClub[] | null;
}

export async function listarAutorizadosDeParticipacion(): Promise<Set<number> | null> {
  const token = await tokenDeSesion();

  const primera = await intentar(
    api.GET("/api/autorizaciones", {
      ...conSesion(token),
      params: {
        query: {
          tipo: TIPO_PARTICIPACION,
          estado: AUTORIZACION_OTORGADA,
          pagina: 0,
          tamano: TAMANO_MAXIMO_DE_PAGINA,
        },
      },
    }),
  );
  exigirAutenticacion(primera);
  if (!primera.datos || (primera.datos.totalPaginas ?? 1) > PAGINAS_DE_AUTORIZACIONES) {
    return null;
  }

  const autorizaciones = await reunirPaginas((pagina) =>
    pagina === 0
      ? Promise.resolve(primera)
      : intentar(
          api.GET("/api/autorizaciones", {
            ...conSesion(token),
            params: {
              query: {
                tipo: TIPO_PARTICIPACION,
                estado: AUTORIZACION_OTORGADA,
                pagina,
                tamano: TAMANO_MAXIMO_DE_PAGINA,
              },
            },
          }),
        ),
  );

  if (!autorizaciones) {
    return null;
  }
  return new Set(
    autorizaciones
      .map((autorizacion) => autorizacion.estudianteId)
      .filter((id): id is number => typeof id === "number"),
  );
}

export async function listarParticipacionesDelAlcance(): Promise<Participacion[] | null> {
  const token = await tokenDeSesion();

  const participaciones = await reunirPaginas((pagina) =>
    intentar(
      api.GET("/api/participaciones-competencia", {
        ...conSesion(token),
        params: { query: { pagina, tamano: TAMANO_MAXIMO_DE_PAGINA } },
      }),
    ),
  );

  return participaciones as Participacion[] | null;
}
