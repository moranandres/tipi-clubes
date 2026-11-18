import type { Metadata } from "next";
import { FormularioRecuperacion } from "@/components/acceso/FormularioRecuperacion";
import { MarcoDeAcceso } from "@/components/acceso/MarcoDeAcceso";

export const metadata: Metadata = {
  title: "Recuperar contraseña",
};

export default function PaginaRecuperar() {
  return (
    <MarcoDeAcceso
      idTitulo="titulo-recuperar"
      titulo="Recuperar contraseña"
      descripcion={
        <p>
          Escribe el usuario o el correo de tu cuenta. Te enviaremos un enlace para definir una
          contraseña nueva; vence en 30 minutos y solo sirve una vez.
        </p>
      }
      vuelta={{ href: "/login", texto: "Volver al acceso" }}
    >
      <FormularioRecuperacion idTitulo="titulo-recuperar" />
    </MarcoDeAcceso>
  );
}
