import { NextResponse, type NextRequest } from "next/server";
import { api } from "@/lib/api/cliente";
import {
  RUTA_AUTORIZACIONES,
  rutaDeGestion,
  tipoDeSegmento,
} from "@/lib/portal/filtros-autorizaciones";
import { idDe } from "@/lib/portal/validacion";
import { COOKIE_SESION, RUTA_SESION_EXPIRADA } from "@/lib/sesion/cookie";
import { cabecerasDeCliente } from "@/lib/sesion/peticion";

const ESPERA_MAXIMA_MS = 20000;
const NO_AUTENTICADO = 401;
const AVISO_SIN_DOCUMENTO = "documento-no-disponible";
const PARAMETRO_DE_DESCARGA = "descargar";
const TIPO_GENERICO = "application/octet-stream";
const DISPOSICION_ADJUNTA = /^\s*attachment/i;

function redirigir(request: NextRequest, ruta: string): NextResponse {
  return NextResponse.redirect(new URL(ruta, request.url));
}

function disposicionDe(original: string | null, descargar: boolean): string {
  const base = original ?? "attachment";
  return descargar ? base : base.replace(DISPOSICION_ADJUNTA, "inline");
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext<"/portal/autorizaciones/[estudianteId]/[tipo]/documento">,
) {
  const { estudianteId: segmentoDeId, tipo: segmentoDeTipo } = await params;
  const estudianteId = idDe(segmentoDeId);
  const tipo = tipoDeSegmento(segmentoDeTipo);

  if (!estudianteId || !tipo) {
    return redirigir(request, RUTA_AUTORIZACIONES);
  }

  const token = request.cookies.get(COOKIE_SESION)?.value;
  if (!token) {
    return redirigir(request, RUTA_SESION_EXPIRADA);
  }

  const gestion = rutaDeGestion(estudianteId, tipo, { desde: "ficha" }, AVISO_SIN_DOCUMENTO);

  let respuesta: Response;
  try {
    const { response } = await api.GET(
      "/api/estudiantes/{estudianteId}/autorizaciones/{tipo}/documento",
      {
        headers: { ...cabecerasDeCliente(request), Authorization: `Bearer ${token}` },
        params: { path: { estudianteId, tipo } },
        parseAs: "stream",
        cache: "no-store",
        signal: AbortSignal.timeout(ESPERA_MAXIMA_MS),
      },
    );
    respuesta = response;
  } catch {
    return redirigir(request, gestion);
  }

  if (respuesta.status === NO_AUTENTICADO) {
    return redirigir(request, RUTA_SESION_EXPIRADA);
  }
  if (!respuesta.ok || !respuesta.body) {
    return redirigir(request, gestion);
  }

  const descargar = request.nextUrl.searchParams.has(PARAMETRO_DE_DESCARGA);
  const cabeceras = new Headers({
    "Content-Type": respuesta.headers.get("content-type") ?? TIPO_GENERICO,
    "Content-Disposition": disposicionDe(respuesta.headers.get("content-disposition"), descargar),
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  });
  const longitud = respuesta.headers.get("content-length");
  if (longitud) {
    cabeceras.set("Content-Length", longitud);
  }

  return new NextResponse(respuesta.body, { status: 200, headers: cabeceras });
}
