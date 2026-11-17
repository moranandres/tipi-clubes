import "server-only";
import type { NivelCurso } from "@/lib/portal/filtros-cursos";
import {
  ESTADOS_DE_SOLICITUD,
  SOLICITUDES_POR_PAGINA,
  type EstadoSolicitud,
  type FiltrosSolicitudes,
} from "@/lib/portal/filtros-solicitudes";
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

export type Solicitud = Esquemas["SolicitudResponse"];
export type Verificacion = Esquemas["VerificacionResponse"];
export type ControlDeVerificacion = Esquemas["ControlVerificacion"];

const ESTADOS_DE_CURSO_ABIERTO: readonly string[] = ["PLANIFICADO", "EN_CURSO"];

function consultaDe(filtros: FiltrosSolicitudes, estado: EstadoSolicitud | null) {
  return {
    q: filtros.q || undefined,
    estado: estado ?? undefined,
    institucionId: filtros.institucion ?? undefined,
  };
}

export async function listarSolicitudes(
  filtros: FiltrosSolicitudes,
): Promise<ResultadoDeLista<Solicitud>> {
  const token = await tokenDeSesion();

  return comoLista<Solicitud>(
    await intentar(
      api.GET("/api/solicitudes-inscripcion", {
        ...conSesion(token),
        params: {
          query: {
            ...consultaDe(filtros, filtros.estado),
            pagina: filtros.pagina - 1,
            tamano: SOLICITUDES_POR_PAGINA,
          },
        },
      }),
    ),
  );
}

export async function contarSolicitudesPorEstado(
  filtros: FiltrosSolicitudes,
): Promise<ConteosDe<EstadoSolicitud>> {
  const token = await tokenDeSesion();

  return contarPorEstado(ESTADOS_DE_SOLICITUD, (estado) =>
    intentar(
      api.GET("/api/solicitudes-inscripcion", {
        ...conSesion(token),
        params: { query: { ...consultaDe(filtros, estado), pagina: 0, tamano: 1 } },
      }),
    ),
  );
}

export async function obtenerSolicitud(id: number): Promise<ResultadoDeDetalle<Solicitud>> {
  const token = await tokenDeSesion();

  return comoDetalle(
    await intentar(
      api.GET("/api/solicitudes-inscripcion/{id}", {
        ...conSesion(token),
        params: { path: { id } },
      }),
    ),
  ) as ResultadoDeDetalle<Solicitud>;
}

export async function verificarSolicitud(
  id: number,
  cursoId: number | null,
  nivelAsignado: NivelCurso | null,
): Promise<Verificacion | null> {
  const token = await tokenDeSesion();

  const respuesta = await intentar(
    api.GET("/api/solicitudes-inscripcion/{id}/verificacion", {
      ...conSesion(token),
      params: {
        path: { id },
        query: { cursoId: cursoId ?? undefined, nivelAsignado: nivelAsignado ?? undefined },
      },
    }),
  );

  exigirAutenticacion(respuesta);
  return respuesta.datos;
}

export async function listarCursosAbiertos(clubId: number): Promise<Curso[] | null> {
  const token = await tokenDeSesion();

  const cursos = await reunirPaginas((pagina) =>
    intentar(
      api.GET("/api/cursos", {
        ...conSesion(token),
        params: { query: { clubId, pagina, tamano: TAMANO_MAXIMO_DE_PAGINA } },
      }),
    ),
  );

  return cursos
    ? cursos.filter((curso) => ESTADOS_DE_CURSO_ABIERTO.includes(curso.estado ?? ""))
    : null;
}
