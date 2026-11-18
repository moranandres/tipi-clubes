"use client";

import { Link2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { SelectorDeEstudiantes, type CandidatoDeEvidencia } from "@/components/portal/evidencias/SelectorDeEstudiantes";
import { useEnvio } from "@/components/portal/formularios/ganchos";
import { ZonaDeAviso } from "@/components/portal/formularios/ZonaDeAviso";
import { Boton } from "@/components/ui/Boton";
import { vincularEvidencias } from "@/lib/acciones/proyectos";
import { LIMITES_DE_PROYECTO } from "@/lib/portal/reglas-proyectos";

type Props = {
  proyectoId: number;
  candidatas: CandidatoDeEvidencia[];
  vinculadas: number[];
};

function iguales(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((id) => b.includes(id));
}

export function EvidenciasDelProyecto({ proyectoId, candidatas, vinculadas }: Props) {
  const [elegidas, setElegidas] = useState<number[]>(vinculadas);
  const [guardadas, setGuardadas] = useState<number[]>(vinculadas);
  const [error, setError] = useState<string | undefined>();
  const { pendiente, aviso, enviar, avisar, limpiarAviso } = useEnvio();

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (pendiente) {
      return;
    }
    if (elegidas.length > LIMITES_DE_PROYECTO.evidencias) {
      setError(`Máximo ${LIMITES_DE_PROYECTO.evidencias} evidencias por proyecto`);
      return;
    }

    limpiarAviso();
    const enviadas = [...elegidas];
    enviar(
      () => vincularEvidencias(proyectoId, enviadas),
      (resultado) => {
        if (resultado.ok) {
          setGuardadas(enviadas);
          avisar("exito", resultado.mensaje);
          return;
        }
        setError(resultado.errores.evidenciaIds);
        avisar("error", resultado.mensaje);
      },
    );
  }

  return (
    <form onSubmit={alEnviar} noValidate aria-label="Evidencias vinculadas al proyecto">
      <SelectorDeEstudiantes
        etiqueta="Evidencias del club"
        candidatos={candidatas}
        elegidos={elegidas}
        soloAutorizados={false}
        error={error}
        textoVacio="El club todavía no tiene evidencias activas. Cárgalas en las sesiones ejecutadas."
        ayuda={`Marca las fotografías, informes, enlaces o productos que respaldan el proyecto. Hasta ${LIMITES_DE_PROYECTO.evidencias}.`}
        alCambiar={(ids) => {
          setElegidas(ids);
          setError(undefined);
        }}
      />
      <Boton
        type="submit"
        variante="elevado"
        cargando={pendiente}
        textoCargando="Guardando"
        disabled={iguales(elegidas, guardadas)}
      >
        <Link2 aria-hidden="true" size={16} />
        Guardar evidencias
      </Boton>
      <ZonaDeAviso aviso={aviso} className="mt-3" />
    </form>
  );
}
