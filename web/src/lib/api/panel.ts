import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { RUTA_SESION_EXPIRADA } from "@/lib/sesion/cookie";
import { leerToken } from "@/lib/sesion/usuario";
import { api, type Esquemas } from "./cliente";

export type ResumenPanel = Esquemas["PanelResumenResponse"];
export type IndicadoresActividad = Esquemas["IndicadoresSeguimiento"];

export type ActividadPanel = {
  indicadores: IndicadoresActividad | null;
  estudiantesActivos: number | null;
  inscripcionesActivas: number | null;
};

type Resultado<T> = { datos: T | null; estado: number };

const ESPERA_MAXIMA_MS = 10000;
const NO_AUTENTICADO = 401;

async function tokenDeSesion(): Promise<string> {
  const token = await leerToken();
  if (!token) {
    redirect(RUTA_SESION_EXPIRADA);
  }
  return token;
}

function conSesion(token: string) {
  return {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store" as const,
    signal: AbortSignal.timeout(ESPERA_MAXIMA_MS),
  };
}

async function intentar<T>(
  peticion: Promise<{ data?: T; response: Response }>,
): Promise<Resultado<T>> {
  try {
    const { data, response } = await peticion;
    return { datos: data ?? null, estado: response.status };
  } catch {
    return { datos: null, estado: 0 };
  }
}

export const obtenerResumenPanel = cache(async (): Promise<ResumenPanel | null> => {
  const token = await tokenDeSesion();
  const resumen = await intentar(api.GET("/api/panel/resumen", conSesion(token)));

  if (resumen.estado === NO_AUTENTICADO) {
    redirect(RUTA_SESION_EXPIRADA);
  }
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

  const estados = [seguimiento.estado, estudiantes.estado, inscripciones.estado];
  if (estados.includes(NO_AUTENTICADO)) {
    redirect(RUTA_SESION_EXPIRADA);
  }

  return {
    indicadores: seguimiento.datos?.totales ?? null,
    estudiantesActivos: estudiantes.datos?.totalElementos ?? null,
    inscripcionesActivas: inscripciones.datos?.totalElementos ?? null,
  };
});
