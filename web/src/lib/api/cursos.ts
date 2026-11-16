import "server-only";
import {
  CURSOS_POR_PAGINA,
  ESTADOS_DE_CURSO,
  type EstadoCurso,
  type FiltrosCursos,
} from "@/lib/portal/filtros-cursos";
import { api, type Esquemas } from "./cliente";
import { conSesion, exigirAutenticacion, intentar, tokenDeSesion } from "./con-sesion";

export type Curso = Esquemas["CursoResponse"];
export type HorarioDeCurso = Esquemas["HorarioResponse"];

export type PaginaDeCursos = {
  cursos: Curso[];
  total: number;
  pagina: number;
  totalPaginas: number;
};

export type ResultadoDeCursos =
  | { estado: "ok"; datos: PaginaDeCursos }
  | { estado: "denegado"; mensaje: string }
  | { estado: "sin-servicio" };

export type ConteosPorEstado = Record<EstadoCurso, number | null>;

const ACCESO_DENEGADO = 403;
const MENSAJE_DENEGADO = "Tu cuenta no tiene permiso para ver esta lista.";

function consultaDe(filtros: FiltrosCursos, estado: EstadoCurso | null) {
  return {
    q: filtros.q || undefined,
    estado: estado ?? undefined,
    nivel: filtros.nivel ?? undefined,
    modalidad: filtros.modalidad ?? undefined,
    institucionId: filtros.institucion ?? undefined,
  };
}

export async function listarCursos(filtros: FiltrosCursos): Promise<ResultadoDeCursos> {
  const token = await tokenDeSesion();

  const respuesta = await intentar(
    api.GET("/api/cursos", {
      ...conSesion(token),
      params: {
        query: {
          ...consultaDe(filtros, filtros.estado),
          pagina: filtros.pagina - 1,
          tamano: CURSOS_POR_PAGINA,
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
      cursos: respuesta.datos.contenido ?? [],
      total: respuesta.datos.totalElementos ?? 0,
      pagina: (respuesta.datos.pagina ?? 0) + 1,
      totalPaginas: Math.max(respuesta.datos.totalPaginas ?? 1, 1),
    },
  };
}

export async function contarCursosPorEstado(filtros: FiltrosCursos): Promise<ConteosPorEstado> {
  const token = await tokenDeSesion();

  const respuestas = await Promise.all(
    ESTADOS_DE_CURSO.map((estado) =>
      intentar(
        api.GET("/api/cursos", {
          ...conSesion(token),
          params: { query: { ...consultaDe(filtros, estado), pagina: 0, tamano: 1 } },
        }),
      ),
    ),
  );

  exigirAutenticacion(...respuestas);

  return Object.fromEntries(
    ESTADOS_DE_CURSO.map((estado, indice) => [
      estado,
      respuestas[indice].datos?.totalElementos ?? null,
    ]),
  ) as ConteosPorEstado;
}
