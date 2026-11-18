import "server-only";
import { EVENTOS_POR_PAGINA, type FiltrosAuditoria } from "@/lib/portal/filtros-auditoria";
import { api, type Esquemas } from "./cliente";
import { conSesion, intentar, tokenDeSesion } from "./con-sesion";
import { comoLista, type ResultadoDeLista } from "./lista";

export type EventoDeAuditoria = Esquemas["AuditoriaResponse"];

export async function listarEventosDeAuditoria(
  filtros: FiltrosAuditoria,
): Promise<ResultadoDeLista<EventoDeAuditoria>> {
  const token = await tokenDeSesion();

  return comoLista<EventoDeAuditoria>(
    await intentar(
      api.GET("/api/auditoria", {
        ...conSesion(token),
        params: {
          query: {
            usuario: filtros.q || undefined,
            entidad: filtros.entidad ?? undefined,
            entidadId: filtros.entidad ? (filtros.registro ?? undefined) : undefined,
            accion: filtros.accion ?? undefined,
            desde: filtros.desde ?? undefined,
            hasta: filtros.hasta ?? undefined,
            pagina: filtros.pagina - 1,
            tamano: EVENTOS_POR_PAGINA,
          },
        },
      }),
    ),
  );
}
