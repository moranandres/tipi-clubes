"use client";

import { ClipboardCheck } from "lucide-react";
import { useId } from "react";
import { useEnvio } from "@/components/portal/formularios/ganchos";
import { ZonaDeAviso } from "@/components/portal/formularios/ZonaDeAviso";
import { Boton } from "@/components/ui/Boton";
import { tomarSolicitudEnRevision } from "@/lib/acciones/solicitudes";

type Props = {
  solicitudId: number;
  destino: string;
};

export function TomarEnRevision({ solicitudId, destino }: Props) {
  const idTitulo = useId();
  const { pendiente, aviso, enviar, navegar, avisar, limpiarAviso } = useEnvio();

  function tomar() {
    limpiarAviso();
    enviar(
      () => tomarSolicitudEnRevision(solicitudId),
      (resultado) => {
        if (resultado.ok) {
          navegar(destino);
          return;
        }
        avisar("error", resultado.mensaje);
      },
    );
  }

  return (
    <section aria-labelledby={idTitulo} className="rounded-pieza border border-linea p-5">
      <h2 id={idTitulo} className="text-lg font-medium">
        Paso 1: tomar en revisión
      </h2>
      <p className="mt-2 text-[0.9375rem] text-tenue">
        Al tomarla quedas como responsable de revisarla. En el siguiente paso verás los requisitos
        y podrás aprobarla o rechazarla.
      </p>
      <Boton cargando={pendiente} textoCargando="Tomando" className="mt-4 w-full" onClick={tomar}>
        <ClipboardCheck aria-hidden="true" size={16} />
        Tomar en revisión
      </Boton>
      <ZonaDeAviso aviso={aviso} className="mt-3" />
    </section>
  );
}
