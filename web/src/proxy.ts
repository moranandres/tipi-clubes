import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION, RUTA_LOGIN, RUTA_PORTAL } from "@/lib/sesion/cookie";

export function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;
  const haySesion = request.cookies.has(COOKIE_SESION);

  if (pathname === RUTA_LOGIN) {
    if (haySesion && searchParams.get("sesion") !== "expirada") {
      return NextResponse.redirect(new URL(RUTA_PORTAL, request.url));
    }
    return NextResponse.next();
  }

  if (haySesion) {
    return NextResponse.next();
  }

  const destino = new URL(RUTA_LOGIN, request.url);
  if (pathname !== RUTA_PORTAL) {
    destino.searchParams.set("destino", `${pathname}${search}`);
  }
  return NextResponse.redirect(destino);
}

export const config = {
  matcher: ["/portal/:path*", "/login"],
};
