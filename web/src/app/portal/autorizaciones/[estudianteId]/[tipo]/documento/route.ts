import type { NextRequest } from "next/server";
import { api } from "@/lib/api/cliente";
import {
  RUTA_AUTORIZACIONES,
  rutaDeGestion,
  tipoDeSegmento,
} from "@/lib/portal/filtros-autorizaciones";
import { idDe } from "@/lib/portal/validacion";
import { redirigir, reenviarArchivo } from "@/lib/sesion/descarga";

const AVISO_SIN_DOCUMENTO = "documento-no-disponible";

export async function GET(
  request: NextRequest,
  { params }: RouteContext<"/portal/autorizaciones/[estudianteId]/[tipo]/documento">,
) {
  const { estudianteId: segmentoDeId, tipo: segmentoDeTipo } = await params;
  const estudianteId = idDe(segmentoDeId);
  const tipo = tipoDeSegmento(segmentoDeTipo);

  if (!estudianteId || !tipo) {
    return redirigir(RUTA_AUTORIZACIONES);
  }

  return reenviarArchivo(request, {
    rutaDeVuelta: rutaDeGestion(estudianteId, tipo, { desde: "ficha" }, AVISO_SIN_DOCUMENTO),
    pedir: (opciones) =>
      api.GET("/api/estudiantes/{estudianteId}/autorizaciones/{tipo}/documento", {
        ...opciones,
        params: { path: { estudianteId, tipo } },
      }),
  });
}
