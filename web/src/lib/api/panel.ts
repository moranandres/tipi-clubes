import "server-only";
import { redirect } from "next/navigation";
import { RUTA_SESION_EXPIRADA } from "@/lib/sesion/cookie";
import { leerToken } from "@/lib/sesion/usuario";
import { api, type Esquemas } from "./cliente";

export type ResumenPanel = Esquemas["PanelResumenResponse"];

const ESPERA_MAXIMA_MS = 10000;

async function pedirResumen(token: string) {
  try {
    const { data, response } = await api.GET("/api/panel/resumen", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(ESPERA_MAXIMA_MS),
    });
    return { resumen: data ?? null, estado: response.status };
  } catch {
    return { resumen: null, estado: 0 };
  }
}

export async function obtenerResumenPanel(): Promise<ResumenPanel | null> {
  const token = await leerToken();
  if (!token) {
    redirect(RUTA_SESION_EXPIRADA);
  }

  const { resumen, estado } = await pedirResumen(token);
  if (estado === 401) {
    redirect(RUTA_SESION_EXPIRADA);
  }
  return resumen;
}
