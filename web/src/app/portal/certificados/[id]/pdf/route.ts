import type { NextRequest } from "next/server";
import { api } from "@/lib/api/cliente";
import { RUTA_CERTIFICADOS, rutaDeCertificado } from "@/lib/portal/filtros-certificados";
import { idDe } from "@/lib/portal/validacion";
import { redirigir, reenviarArchivo } from "@/lib/sesion/descarga";

const AVISO_SIN_PDF = "pdf-no-disponible";

export async function GET(request: NextRequest, { params }: RouteContext<"/portal/certificados/[id]/pdf">) {
  const { id: segmento } = await params;
  const id = idDe(segmento);

  if (!id) {
    return redirigir(RUTA_CERTIFICADOS);
  }

  return reenviarArchivo(request, {
    rutaDeVuelta: rutaDeCertificado(id, AVISO_SIN_PDF),
    pedir: (opciones) =>
      api.GET("/api/certificados/{id}/pdf", {
        ...opciones,
        params: { path: { id } },
      }),
  });
}
