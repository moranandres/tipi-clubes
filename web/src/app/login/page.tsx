import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";

export const metadata: Metadata = {
  title: "Acceso al portal",
};

export default function PaginaLogin() {
  return (
    <main id="contenido" className="flex flex-1 items-center py-24">
      <div className="contenedor">
        <div className="max-w-[34rem]">
          <h1 className="text-seccion">Acceso al portal</h1>
          <p className="mt-5 text-tenue">
            El inicio de sesión del nuevo portal se construye en el siguiente bloque. Mientras
            tanto, el sistema actual sigue funcionando en su dirección habitual.
          </p>
          <EnlaceBoton href="/" variante="secundario" className="mt-10">
            <ArrowLeft aria-hidden="true" size={18} />
            Volver al inicio
          </EnlaceBoton>
        </div>
      </div>
    </main>
  );
}
