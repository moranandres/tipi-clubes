import { api, type Esquemas } from "./cliente";

export type EstadisticasPublicas = Esquemas["EstadisticasPublicasResponse"];

const ESPERA_MAXIMA_MS = 4000;

export async function obtenerEstadisticasPublicas(): Promise<EstadisticasPublicas | null> {
  try {
    const { data } = await api.GET("/api/publico/estadisticas", {
      signal: AbortSignal.timeout(ESPERA_MAXIMA_MS),
    });
    return data ?? null;
  } catch {
    return null;
  }
}
