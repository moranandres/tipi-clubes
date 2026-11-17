import "server-only";
import { listarPeriodos, type Periodo } from "./clubes";
import type { ResultadoDeDetalle } from "./detalle";

export async function obtenerPeriodo(id: number): Promise<ResultadoDeDetalle<Periodo>> {
  const periodos = await listarPeriodos();

  if (!periodos) {
    return { estado: "sin-servicio" };
  }

  const periodo = periodos.find((candidato) => candidato.id === id);
  return periodo ? { estado: "ok", datos: periodo } : { estado: "no-encontrado" };
}
