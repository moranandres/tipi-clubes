"use client";

import { Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { Boton } from "@/components/ui/Boton";
import type { ResultadoDeAccion } from "@/lib/acciones/resultado";
import { useAlOcultar, useEnvio } from "./ganchos";
import { ZonaDeAviso } from "./ZonaDeAviso";

type Props = {
  titulo: string;
  descripcion: string;
  etiqueta: string;
  etiquetaDeConfirmacion: string;
  eliminar: () => Promise<ResultadoDeAccion>;
};

export function ConfirmarEliminacion({
  titulo,
  descripcion,
  etiqueta,
  etiquetaDeConfirmacion,
  eliminar,
}: Props) {
  const idTitulo = useId();
  const [confirmando, setConfirmando] = useState(false);
  const { pendiente, aviso, enviar, navegar, avisar, limpiarAviso } = useEnvio();

  useAlOcultar(() => setConfirmando(false));

  function alConfirmar() {
    limpiarAviso();
    enviar(eliminar, (resultado) => {
      if (resultado.ok && resultado.destino) {
        navegar(resultado.destino);
        return;
      }
      setConfirmando(false);
      if (!resultado.ok) {
        avisar("error", resultado.mensaje);
      }
    });
  }

  return (
    <section aria-labelledby={idTitulo} className="rounded-pieza border border-linea p-5">
      <h2 id={idTitulo} className="text-lg font-medium">
        {titulo}
      </h2>
      <p className="mt-2 text-[0.9375rem] text-tenue">{descripcion}</p>
      <div className="mt-4 flex h-11 items-center gap-2">
        {confirmando ? (
          <div role="group" aria-label={etiquetaDeConfirmacion} className="flex w-full gap-2">
            <Boton
              variante="peligro"
              cargando={pendiente}
              textoCargando="Eliminando"
              className="flex-1"
              onClick={alConfirmar}
            >
              Sí, eliminar
            </Boton>
            <Boton
              variante="secundario"
              disabled={pendiente}
              className="flex-1"
              onClick={() => setConfirmando(false)}
            >
              No, conservar
            </Boton>
          </div>
        ) : (
          <Boton variante="peligro" className="w-full" onClick={() => setConfirmando(true)}>
            <Trash2 aria-hidden="true" size={16} />
            {etiqueta}
          </Boton>
        )}
      </div>
      <ZonaDeAviso aviso={aviso} className="mt-3" />
    </section>
  );
}
