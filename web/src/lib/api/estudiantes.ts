import "server-only";
import { cache } from "react";
import {
  ESTADOS_DE_ESTUDIANTE,
  ESTUDIANTES_POR_PAGINA,
  type EstadoEstudiante,
  type FiltrosEstudiantes,
} from "@/lib/portal/filtros-estudiantes";
import { api, type Esquemas } from "./cliente";
import {
  TAMANO_MAXIMO_DE_PAGINA,
  conSesion,
  intentar,
  reunirPaginas,
  tokenDeSesion,
} from "./con-sesion";
import { comoDetalle, type ResultadoDeDetalle } from "./detalle";
import { comoLista, contarPorEstado, type ConteosDe, type ResultadoDeLista } from "./lista";

export type Estudiante = Esquemas["EstudianteResponse"];
export type InscripcionDeClub = Esquemas["InscripcionResponse"];
export type InscripcionDeCurso = Esquemas["InscripcionCursoResponse"];
export type Participacion = Esquemas["ParticipacionResponse"];
export type Certificado = Esquemas["CertificadoResponse"];
export type EventoDeHistorial = Esquemas["EventoHistorialResponse"];
export type ResumenDeHistorial = Esquemas["ResumenHistorial"];
export type AlcanceDeHistorial = NonNullable<Esquemas["HistorialResponse"]["alcance"]>;

export type Historial = {
  estudiante: Estudiante;
  alcance: AlcanceDeHistorial;
  resumen: ResumenDeHistorial;
  clubes: InscripcionDeClub[];
  competencias: Participacion[];
  certificados: Certificado[];
  lineaDeTiempo: EventoDeHistorial[];
};

const ESTADO_ACTIVO = "ACTIVO";
const ALCANCE_COMPLETO: AlcanceDeHistorial = "COMPLETO";

function consultaDe(filtros: FiltrosEstudiantes, estado: EstadoEstudiante | null) {
  return {
    q: filtros.q || undefined,
    curso: filtros.curso ?? undefined,
    estado: estado ?? undefined,
    institucionId: filtros.institucion ?? undefined,
  };
}

export async function listarEstudiantes(
  filtros: FiltrosEstudiantes,
): Promise<ResultadoDeLista<Estudiante>> {
  const token = await tokenDeSesion();

  return comoLista<Estudiante>(
    await intentar(
      api.GET("/api/estudiantes", {
        ...conSesion(token),
        params: {
          query: {
            ...consultaDe(filtros, filtros.estado),
            pagina: filtros.pagina - 1,
            tamano: ESTUDIANTES_POR_PAGINA,
          },
        },
      }),
    ),
  );
}

export async function contarEstudiantesPorEstado(
  filtros: FiltrosEstudiantes,
): Promise<ConteosDe<EstadoEstudiante>> {
  const token = await tokenDeSesion();

  return contarPorEstado(ESTADOS_DE_ESTUDIANTE, (estado) =>
    intentar(
      api.GET("/api/estudiantes", {
        ...conSesion(token),
        params: { query: { ...consultaDe(filtros, estado), pagina: 0, tamano: 1 } },
      }),
    ),
  );
}

export const obtenerEstudiante = cache(
  async (id: number): Promise<ResultadoDeDetalle<Estudiante>> => {
    const token = await tokenDeSesion();

    return comoDetalle(
      await intentar(
        api.GET("/api/estudiantes/{id}", { ...conSesion(token), params: { path: { id } } }),
      ),
    ) as ResultadoDeDetalle<Estudiante>;
  },
);

export const obtenerHistorial = cache(async (id: number): Promise<ResultadoDeDetalle<Historial>> => {
  const token = await tokenDeSesion();

  const resultado = comoDetalle(
    await intentar(
      api.GET("/api/estudiantes/{id}/historial", { ...conSesion(token), params: { path: { id } } }),
    ),
  );

  if (resultado.estado !== "ok") {
    return resultado;
  }

  const datos = resultado.datos;
  return {
    estado: "ok",
    datos: {
      estudiante: (datos.estudiante ?? {}) as Estudiante,
      alcance: datos.alcance ?? ALCANCE_COMPLETO,
      resumen: datos.resumen ?? {},
      clubes: (datos.clubes ?? []) as InscripcionDeClub[],
      competencias: (datos.competencias ?? []) as Participacion[],
      certificados: (datos.certificados ?? []) as Certificado[],
      lineaDeTiempo: datos.lineaDeTiempo ?? [],
    },
  };
});

export async function listarEstudiantesActivos(institucionId: number): Promise<Estudiante[] | null> {
  const token = await tokenDeSesion();

  const estudiantes = await reunirPaginas((pagina) =>
    intentar(
      api.GET("/api/estudiantes", {
        ...conSesion(token),
        params: {
          query: { institucionId, estado: ESTADO_ACTIVO, pagina, tamano: TAMANO_MAXIMO_DE_PAGINA },
        },
      }),
    ),
  );

  return estudiantes as Estudiante[] | null;
}
