import "server-only";
import { cache } from "react";
import { api, type Esquemas } from "./cliente";
import { conSesion, exigirAutenticacion, intentar, tokenDeSesion } from "./con-sesion";

export type ResumenPanel = Esquemas["PanelResumenResponse"];
export type IndicadoresActividad = Esquemas["IndicadoresSeguimiento"];

export type ActividadPanel = {
  indicadores: IndicadoresActividad | null;
  estudiantesActivos: number | null;
  inscripcionesActivas: number | null;
};

export const obtenerResumenPanel = cache(async (): Promise<ResumenPanel | null> => {
  const token = await tokenDeSesion();
  const resumen = await intentar(api.GET("/api/panel/resumen", conSesion(token)));

  exigirAutenticacion(resumen);
  return resumen.datos;
});

export const obtenerActividadPanel = cache(async (): Promise<ActividadPanel> => {
  const token = await tokenDeSesion();

  const [seguimiento, estudiantes, inscripciones] = await Promise.all([
    intentar(api.GET("/api/seguimiento/resumen", conSesion(token))),
    intentar(
      api.GET("/api/estudiantes", {
        ...conSesion(token),
        params: { query: { estado: "ACTIVO", tamano: 1 } },
      }),
    ),
    intentar(
      api.GET("/api/inscripciones", {
        ...conSesion(token),
        params: { query: { estado: "ACTIVA", tamano: 1 } },
      }),
    ),
  ]);

  exigirAutenticacion(seguimiento, estudiantes, inscripciones);

  return {
    indicadores: seguimiento.datos?.totales ?? null,
    estudiantesActivos: estudiantes.datos?.totalElementos ?? null,
    inscripcionesActivas: inscripciones.datos?.totalElementos ?? null,
  };
});
