import { NextResponse, type NextRequest } from "next/server";

const RUTA_VERIFICAR = "/verificar";
const LONGITUD_MAXIMA_DE_CODIGO = 40;
const REDIRECCION_PERMANENTE = 308;

export function GET(request: NextRequest) {
  const codigo = request.nextUrl.searchParams.get("codigo");
  const destino = codigo
    ? `${RUTA_VERIFICAR}?${new URLSearchParams({ codigo: codigo.slice(0, LONGITUD_MAXIMA_DE_CODIGO) })}`
    : RUTA_VERIFICAR;
  return new NextResponse(null, { status: REDIRECCION_PERMANENTE, headers: { Location: destino } });
}
