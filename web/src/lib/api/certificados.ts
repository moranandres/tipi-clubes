import "server-only";
import { cache } from "react";
import {
  CERTIFICADOS_POR_PAGINA,
  ESTADOS_DE_CERTIFICADO,
  type EstadoCertificado,
  type FiltrosCertificados,
} from "@/lib/portal/filtros-certificados";
import { api, type Esquemas } from "./cliente";
import {
  TAMANO_MAXIMO_DE_PAGINA,
  conSesion,
  intentar,
  reunirPaginas,
  tokenDeSesion,
} from "./con-sesion";
import type { Curso } from "./cursos";
import { comoDetalle, type ResultadoDeDetalle } from "./detalle";
import { comoLista, contarPorEstado, type ConteosDe, type ResultadoDeLista } from "./lista";

export type Certificado = Esquemas["CertificadoResponse"];
export type ParticipanteDeCurso = Esquemas["ParticipanteCursoResponse"];

const CERTIFICADO_VIGENTE: EstadoCertificado = "EMITIDO";
const CURSO_FINALIZADO = "FINALIZADO";

function consultaDe(filtros: FiltrosCertificados, estado: EstadoCertificado | null) {
  return {
    q: filtros.q || undefined,
    estado: estado ?? undefined,
    tipo: filtros.tipo ?? undefined,
    institucionId: filtros.institucion ?? undefined,
    clubId: filtros.club ?? undefined,
    desde: filtros.desde ?? undefined,
    hasta: filtros.hasta ?? undefined,
  };
}

export async function listarCertificados(
  filtros: FiltrosCertificados,
): Promise<ResultadoDeLista<Certificado>> {
  const token = await tokenDeSesion();

  return comoLista<Certificado>(
    await intentar(
      api.GET("/api/certificados", {
        ...conSesion(token),
        params: {
          query: {
            ...consultaDe(filtros, filtros.estado),
            pagina: filtros.pagina - 1,
            tamano: CERTIFICADOS_POR_PAGINA,
          },
        },
      }),
    ),
  );
}

export async function contarCertificadosPorEstado(
  filtros: FiltrosCertificados,
): Promise<ConteosDe<EstadoCertificado>> {
  const token = await tokenDeSesion();

  return contarPorEstado(ESTADOS_DE_CERTIFICADO, (estado) =>
    intentar(
      api.GET("/api/certificados", {
        ...conSesion(token),
        params: { query: { ...consultaDe(filtros, estado), pagina: 0, tamano: 1 } },
      }),
    ),
  );
}

export const obtenerCertificado = cache(
  async (id: number): Promise<ResultadoDeDetalle<Certificado>> => {
    const token = await tokenDeSesion();

    return comoDetalle(
      await intentar(
        api.GET("/api/certificados/{id}", { ...conSesion(token), params: { path: { id } } }),
      ),
    ) as ResultadoDeDetalle<Certificado>;
  },
);

export async function listarCertificadosDeEstudiante(
  estudianteId: number,
  soloVigentes: boolean,
): Promise<Certificado[] | null> {
  const token = await tokenDeSesion();

  const certificados = await reunirPaginas((pagina) =>
    intentar(
      api.GET("/api/certificados", {
        ...conSesion(token),
        params: {
          query: {
            estudianteId,
            estado: soloVigentes ? CERTIFICADO_VIGENTE : undefined,
            pagina,
            tamano: TAMANO_MAXIMO_DE_PAGINA,
          },
        },
      }),
    ),
  );

  return certificados as Certificado[] | null;
}

export const listarParticipantesDeCurso = cache(
  async (cursoId: number): Promise<ResultadoDeDetalle<ParticipanteDeCurso[]>> => {
    const token = await tokenDeSesion();

    return comoDetalle(
      await intentar(
        api.GET("/api/cursos/{cursoId}/participantes", {
          ...conSesion(token),
          params: { path: { cursoId } },
        }),
      ),
    ) as ResultadoDeDetalle<ParticipanteDeCurso[]>;
  },
);

export async function listarCursosParaCertificar(): Promise<Curso[] | null> {
  const token = await tokenDeSesion();

  const cursos = await reunirPaginas((pagina) =>
    intentar(
      api.GET("/api/cursos", {
        ...conSesion(token),
        params: { query: { pagina, tamano: TAMANO_MAXIMO_DE_PAGINA } },
      }),
    ),
  );

  if (!cursos) {
    return null;
  }
  return [...cursos].sort((a, b) => {
    const finalizadoA = a.estado === CURSO_FINALIZADO ? 0 : 1;
    const finalizadoB = b.estado === CURSO_FINALIZADO ? 0 : 1;
    return finalizadoA - finalizadoB || (a.nombre ?? "").localeCompare(b.nombre ?? "", "es");
  });
}
