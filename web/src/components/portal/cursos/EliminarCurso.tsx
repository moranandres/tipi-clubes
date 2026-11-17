"use client";

import { Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { useAlOcultar, useEnvio } from "@/components/portal/formularios/ganchos";
import { ZonaDeAviso } from "@/components/portal/formularios/ZonaDeAviso";
import { Boton } from "@/components/ui/Boton";
import { eliminarCurso } from "@/lib/acciones/cursos";

type Props = {
  cursoId: number;
};

export function EliminarCurso({ cursoId }: Props) {
  const idTitulo = useId();
  const [confirmando, setConfirmando] = useState(false);
  const { pendiente, aviso, enviar, navegar, avisar, limpiarAviso } = useEnvio();

  useAlOcultar(() => setConfirmando(false));

  function eliminar() {
    limpiarAviso();
    enviar(
      () => eliminarCurso(cursoId),
      (resultado) => {
        if (resultado.ok && resultado.destino) {
          navegar(resultado.destino);
          return;
        }
        setConfirmando(false);
        if (!resultado.ok) {
          avisar("error", resultado.mensaje);
        }
      },
    );
  }

  return (
    <section aria-labelledby={idTitulo} className="rounded-pieza border border-linea p-5">
      <h2 id={idTitulo} className="text-lg font-medium">
        Eliminar el curso
      </h2>
      <p className="mt-2 text-[0.9375rem] text-tenue">
        Solo se elimina un curso planificado que no tiene inscripciones ni solicitudes. Si ya las
        tiene, cancélalo en el panel de estado.
      </p>
      <div className="mt-4 flex h-11 items-center gap-2">
        {confirmando ? (
          <div role="group" aria-label="Confirmar la eliminación del curso" className="flex w-full gap-2">
            <Boton
              variante="peligro"
              cargando={pendiente}
              textoCargando="Eliminando"
              className="flex-1"
              onClick={eliminar}
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
            Eliminar curso
          </Boton>
        )}
      </div>
      <ZonaDeAviso aviso={aviso} className="mt-3" />
    </section>
  );
}
