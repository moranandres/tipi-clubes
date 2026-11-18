import type { Metadata } from "next";
import { FormularioAcceso } from "@/components/acceso/FormularioAcceso";
import { MarcoDeAcceso } from "@/components/acceso/MarcoDeAcceso";

export const metadata: Metadata = {
  title: "Acceso al portal",
};

export default function PaginaLogin() {
  return (
    <MarcoDeAcceso
      idTitulo="titulo-acceso"
      titulo="Acceso al portal"
      descripcion={
        <p>
          Entra con el usuario o el correo de tu cuenta. Si todavía no tienes una, pídela a la
          coordinación de TIPI 3.0 o al responsable de tu institución.
        </p>
      }
      vuelta={{ href: "/", texto: "Volver al inicio" }}
    >
      <FormularioAcceso />
    </MarcoDeAcceso>
  );
}
