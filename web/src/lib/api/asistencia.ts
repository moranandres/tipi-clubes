import "server-only";
import { cache } from "react";
import { api, type Esquemas } from "./cliente";
import { conSesion, exigirAutenticacion, intentar, tokenDeSesion } from "./con-sesion";
import { comoDetalle, type ResultadoDeDetalle } from "./detalle";

export type FilaDePlanilla = Esquemas["FilaPlanillaResponse"];
export type Correccion = Esquemas["CorreccionAsistenciaResponse"];
export type AsistenciaDeEstudiante = Esquemas["EstudianteAsistenciaResponse"];
export type ConteoDeAsistencia = Esquemas["ConteoAsistencia"];

export type Planilla = Omit<Esquemas["PlanillaAsistenciaResponse"], "estudiantes"> & {
  estudiantes?: FilaDePlanilla[];
};

export type ResumenDeAsistencia = Omit<Esquemas["ResumenAsistenciaResponse"], "estudiantes"> & {
  estudiantes?: AsistenciaDeEstudiante[];
};

export type ConsultaDeResumen = {
  club: number;
  desde: string | null;
  hasta: string | null;
};

export const obtenerPlanilla = cache(
  async (actividadId: number): Promise<ResultadoDeDetalle<Planilla>> => {
    const token = await tokenDeSesion();

    return comoDetalle(
      await intentar(
        api.GET("/api/actividades/{id}/asistencia", {
          ...conSesion(token),
          params: { path: { id: actividadId } },
        }),
      ),
    ) as ResultadoDeDetalle<Planilla>;
  },
);

export async function listarCorrecciones(actividadId: number): Promise<Correccion[] | null> {
  const token = await tokenDeSesion();

  const respuesta = await intentar(
    api.GET("/api/actividades/{id}/asistencia/correcciones", {
      ...conSesion(token),
      params: { path: { id: actividadId } },
    }),
  );

  exigirAutenticacion(respuesta);
  return respuesta.datos as Correccion[] | null;
}

export async function obtenerResumenDeAsistencia(
  consulta: ConsultaDeResumen,
): Promise<ResultadoDeDetalle<ResumenDeAsistencia>> {
  const token = await tokenDeSesion();

  return comoDetalle(
    await intentar(
      api.GET("/api/asistencias/resumen", {
        ...conSesion(token),
        params: {
          query: {
            clubId: consulta.club,
            desde: consulta.desde ?? undefined,
            hasta: consulta.hasta ?? undefined,
          },
        },
      }),
    ),
  ) as ResultadoDeDetalle<ResumenDeAsistencia>;
}
