import "server-only";
import { api, type Esquemas } from "./cliente";
import { conSesion, exigirAutenticacion, intentar, tokenDeSesion } from "./con-sesion";
import { comoDetalle, type ResultadoDeDetalle } from "./detalle";

export type ResumenDeSeguimiento = Esquemas["ResumenSeguimientoResponse"];
export type SeguimientoDeClub = Esquemas["SeguimientoClubResponse"];
export type ClubEnSeguimiento = Esquemas["ClubSeguimientoResponse"];
export type Indicadores = Esquemas["IndicadoresSeguimiento"];
export type ParametrosDeSeguimiento = Esquemas["ParametrosSeguimientoResponse"];

type ConsultaDeSeguimiento = {
  periodo: number | null;
  institucion: number | null;
  desde: string | null;
  hasta: string | null;
};

export async function obtenerResumenDeSeguimiento(
  consulta: ConsultaDeSeguimiento,
): Promise<{ datos: ResumenDeSeguimiento | null; detalle: string | null }> {
  const token = await tokenDeSesion();

  const respuesta = await intentar(
    api.GET("/api/seguimiento/resumen", {
      ...conSesion(token),
      params: {
        query: {
          periodoId: consulta.periodo ?? undefined,
          institucionId: consulta.institucion ?? undefined,
          desde: consulta.desde ?? undefined,
          hasta: consulta.hasta ?? undefined,
        },
      },
    }),
  );

  exigirAutenticacion(respuesta);
  return { datos: respuesta.datos, detalle: respuesta.detalle };
}

export async function obtenerSeguimientoDeClub(
  clubId: number,
  desde: string | null,
  hasta: string | null,
): Promise<ResultadoDeDetalle<SeguimientoDeClub>> {
  const token = await tokenDeSesion();

  return comoDetalle(
    await intentar(
      api.GET("/api/seguimiento/clubes/{clubId}", {
        ...conSesion(token),
        params: { path: { clubId }, query: { desde: desde ?? undefined, hasta: hasta ?? undefined } },
      }),
    ),
  );
}
