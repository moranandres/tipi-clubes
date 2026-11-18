"use client";

import { Save } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { useEnvio } from "@/components/portal/formularios/ganchos";
import { ZonaDeAviso } from "@/components/portal/formularios/ZonaDeAviso";
import { Boton } from "@/components/ui/Boton";
import { CampoSeleccion } from "@/components/ui/CampoSeleccion";
import { registrarResultadoDeCurso } from "@/lib/acciones/certificados";
import {
  OPCIONES_DE_RESULTADO_DE_CURSO,
  bloqueoDeResultado,
  type CertificadoExistente,
} from "@/lib/portal/reglas-certificados";

type Props = {
  inscripcionCursoId: number;
  estado?: string;
  resultado?: string;
  certificadosVigentes: CertificadoExistente[];
  curso: string;
  estudiante: string;
};

export function ResultadoDelParticipante({
  inscripcionCursoId,
  estado,
  resultado,
  certificadosVigentes,
  curso,
  estudiante,
}: Props) {
  const idFormulario = useId();
  const [elegido, setElegido] = useState(resultado ?? "");
  const [guardado, setGuardado] = useState(resultado ?? "");
  const [error, setError] = useState<string | undefined>();
  const { pendiente, aviso, enviar, avisar, limpiarAviso } = useEnvio();

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (pendiente) {
      return;
    }

    const bloqueo = bloqueoDeResultado(
      { estado, resultado: guardado || undefined, certificadosVigentes },
      elegido,
      curso,
    );
    if (bloqueo) {
      setError(bloqueo);
      return;
    }

    limpiarAviso();
    const enviado = elegido;
    enviar(
      () => registrarResultadoDeCurso(inscripcionCursoId, enviado),
      (respuesta) => {
        if (respuesta.ok) {
          setGuardado(enviado);
          avisar("exito", respuesta.mensaje);
          return;
        }
        if (respuesta.errores.resultado) {
          setError(respuesta.errores.resultado);
        }
        avisar("error", respuesta.mensaje);
      },
    );
  }

  return (
    <form id={idFormulario} onSubmit={alEnviar} noValidate aria-label={`Resultado de ${estudiante}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="min-w-0 sm:flex-1">
          <CampoSeleccion
            etiqueta="Resultado final"
            name="resultado"
            opciones={OPCIONES_DE_RESULTADO_DE_CURSO}
            textoSinEleccion="Sin registrar"
            value={elegido}
            error={error}
            onChange={(evento) => {
              setElegido(evento.target.value);
              setError(undefined);
            }}
          />
        </div>
        <Boton
          type="submit"
          variante="elevado"
          cargando={pendiente}
          textoCargando="Guardando"
          disabled={elegido === guardado}
          className="sm:mt-[2.15rem]"
        >
          <Save aria-hidden="true" size={16} />
          Guardar
          <span className="sr-only"> el resultado de {estudiante}</span>
        </Boton>
      </div>
      {aviso ? <ZonaDeAviso aviso={aviso} /> : null}
    </form>
  );
}
