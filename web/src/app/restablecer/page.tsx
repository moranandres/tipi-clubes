import type { Metadata } from "next";
import { FormularioRestablecimiento } from "@/components/acceso/FormularioRestablecimiento";
import { MarcoDeAcceso } from "@/components/acceso/MarcoDeAcceso";

export const metadata: Metadata = {
  title: "Restablecer contraseña",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default function PaginaRestablecer() {
  return (
    <MarcoDeAcceso
      idTitulo="titulo-restablecer"
      titulo="Restablecer contraseña"
      descripcion={
        <p>
          Define la contraseña nueva de tu cuenta. Al guardarla se cierran todas las sesiones
          abiertas y tendrás que entrar de nuevo.
        </p>
      }
      vuelta={{ href: "/login", texto: "Volver al acceso" }}
    >
      <FormularioRestablecimiento idTitulo="titulo-restablecer" />
    </MarcoDeAcceso>
  );
}
