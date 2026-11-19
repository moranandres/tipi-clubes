import type { NextRequest } from "next/server";
import { api } from "@/lib/api/cliente";
import { RUTA_EVIDENCIAS, rutaDeEvidenciasDeSesion } from "@/lib/portal/filtros-evidencias";
import { idDe } from "@/lib/portal/validacion";
import { redirigir, reenviarArchivo } from "@/lib/sesion/descarga";

const AVISO_SIN_ARCHIVO = "archivo-no-disponible";

export async function GET(
  request: NextRequest,
  { params }: RouteContext<"/portal/evidencias/[actividadId]/archivo/[evidenciaId]">,
) {
  const { actividadId: segmentoDeActividad, evidenciaId: segmentoDeEvidencia } = await params;
  const actividadId = idDe(segmentoDeActividad);
  const evidenciaId = idDe(segmentoDeEvidencia);

  if (!actividadId || !evidenciaId) {
    return redirigir(RUTA_EVIDENCIAS);
  }

  return reenviarArchivo(request, {
    rutaDeVuelta: rutaDeEvidenciasDeSesion(actividadId, AVISO_SIN_ARCHIVO),
    pedir: (opciones) =>
      api.GET("/api/evidencias/{id}/archivo", {
        ...opciones,
        params: { path: { id: evidenciaId } },
      }),
  });
}
