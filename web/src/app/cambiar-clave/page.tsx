import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CircleAlert } from "lucide-react";
import { Suspense } from "react";
import { FormularioCambioDeClave } from "@/components/acceso/FormularioCambioDeClave";
import { MarcoDeAcceso } from "@/components/acceso/MarcoDeAcceso";
import { BotonCerrarSesion } from "@/components/portal/BotonCerrarSesion";
import { BotonRecargar } from "@/components/portal/formularios/BotonRecargar";
import { RUTA_SESION_EXPIRADA } from "@/lib/sesion/cookie";
import { leerSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Cambiar contraseña",
  robots: { index: false, follow: false },
};

const ID_TITULO = "titulo-cambio-clave";

function EsqueletoFormulario() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3 motion-safe:animate-pulse">
      {[0, 1, 2].map((fila) => (
        <div key={fila}>
          <span className="block h-3.5 w-32 rounded-full bg-superficie-alta" />
          <span className="mt-2 block h-12 rounded-control bg-superficie" />
          <span className="mt-2 block h-4" />
        </div>
      ))}
      <span className="mt-3 block h-12 rounded-control bg-superficie-alta" />
    </div>
  );
}

async function Contenido() {
  const sesion = await leerSesion();

  if (sesion.estado === "ausente") {
    redirect(RUTA_SESION_EXPIRADA);
  }

  if (sesion.estado === "sin-servicio") {
    return (
      <div role="alert">
        <p className="flex items-start gap-2 text-error">
          <CircleAlert aria-hidden="true" size={18} className="mt-0.5 shrink-0" />
          El servidor de TIPI 3.0 no responde. Vuelve a intentarlo en unos minutos.
        </p>
        <div className="mt-6">
          <BotonRecargar />
        </div>
      </div>
    );
  }

  return (
    <div>
      {sesion.usuario.debeCambiarPassword ? (
        <p className="mb-6 rounded-pieza bg-superficie p-4 text-[0.9375rem]">
          Hola, {sesion.usuario.nombres}. Tu cuenta tiene una contraseña temporal: define una propia
          para entrar al portal.
        </p>
      ) : null}
      <FormularioCambioDeClave idTitulo={ID_TITULO} usuario={sesion.usuario.username ?? ""} />
      {sesion.usuario.debeCambiarPassword ? (
        <div className="mt-2 flex items-center justify-between gap-4 border-t border-linea pt-5 text-[0.9375rem] text-tenue">
          <span>¿No eres tú o prefieres hacerlo después?</span>
          <BotonCerrarSesion />
        </div>
      ) : null}
    </div>
  );
}

export default function PaginaCambiarClave() {
  return (
    <MarcoDeAcceso
      idTitulo={ID_TITULO}
      titulo="Cambiar contraseña"
      descripcion={
        <p>
          Escribe tu contraseña actual y la nueva. Al guardarla se cierran tus demás sesiones
          abiertas en otros equipos.
        </p>
      }
      vuelta={{ href: "/portal", texto: "Volver al portal" }}
    >
      <Suspense fallback={<EsqueletoFormulario />}>
        <Contenido />
      </Suspense>
    </MarcoDeAcceso>
  );
}
