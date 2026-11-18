import { NextResponse, type NextRequest } from "next/server";

export function GET(request: NextRequest) {
  const destino = new URL("/verificar", request.url);
  const codigo = request.nextUrl.searchParams.get("codigo");
  if (codigo) {
    destino.searchParams.set("codigo", codigo.slice(0, 40));
  }
  return NextResponse.redirect(destino, 308);
}
