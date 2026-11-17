"use client";

import { CircleX, LogOut } from "lucide-react";
import { useId, useRef, useState, type FormEvent } from "react";
import { enfocarPrimerInvalido, useEnvio } from "@/components/portal/formularios/ganchos";
import { ZonaDeAviso } from "@/components/portal/formularios/ZonaDeAviso";
import { Boton } from "@/components/ui/Boton";
import { CampoTextoLargo } from "@/components/ui/CampoTextoLargo";
import { aprobarRetiro } from "@/lib/acciones/retiros";
import {
  OBSERVACION_MAXIMA_DE_RETIRO,
  errorDeObservacion,
} from "@/lib/portal/reglas-retiros";

export type EfectoDeCupo = {
  nombre: string;
  tipo: "club" | "curso";
  ahora: string;
  despues: string;
};

export type EfectosVisibles = {
  aprobable: boolean;
  impedimentos: string[];
  cupos: EfectoDeCupo[];
  solicitudesACancelar: number;
};

type Props = {
  retiroId: number;
  efectos: EfectosVisibles | null;
  destino: string;
};

function Efectos({ efectos }: { efectos: EfectosVisibles | null }) {
  if (!efectos) {
    return (
      <p className="mt-3 text-sm text-aviso">
        No pudimos calcular los efectos del retiro. El servidor los aplicará al aprobar.
      </p>
    );
  }

  return (
    <>
      {efectos.impedimentos.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-1.5">
          {efectos.impedimentos.map((impedimento) => (
            <li key={impedimento} className="flex items-start gap-2 text-sm text-error">
              <CircleX aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
              <span className="min-w-0 break-words">{impedimento}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <dl className="mt-3 flex flex-col gap-2 text-[0.9375rem]">
        {efectos.cupos.map((cupo) => (
          <div key={`${cupo.tipo}-${cupo.nombre}`} className="flex items-baseline justify-between gap-4">
            <dt className="min-w-0 break-words">
              {cupo.nombre}
              <span className="text-sm text-tenue"> · {cupo.tipo === "club" ? "club" : "curso"}</span>
            </dt>
            <dd className="cifras shrink-0 text-sm text-tenue">
              {cupo.ahora} → <span className="text-tinta">{cupo.despues}</span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-sm text-tenue">
        Cupos disponibles ahora → después de aprobar.
        {efectos.solicitudesACancelar > 0
          ? ` También se cancelarán ${efectos.solicitudesACancelar === 1 ? "1 solicitud de inscripción abierta" : `${efectos.solicitudesACancelar} solicitudes de inscripción abiertas`} del estudiante en este club.`
          : ""}
      </p>
    </>
  );
}

export function AprobarRetiro({ retiroId, efectos, destino }: Props) {
  const idTitulo = useId();
  const formulario = useRef<HTMLFormElement>(null);
  const [observacion, setObservacion] = useState("");
  const [error, setError] = useState<string | undefined>();
  const { pendiente, aviso, enviar, navegar, avisar, limpiarAviso } = useEnvio();
  const bloqueado = efectos !== null && !efectos.aprobable;

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (pendiente || bloqueado) {
      return;
    }

    const encontrado = errorDeObservacion(observacion);
    if (encontrado) {
      setError(encontrado);
      enfocarPrimerInvalido(formulario.current);
      return;
    }

    limpiarAviso();
    enviar(
      () => aprobarRetiro(retiroId, observacion),
      (resultado) => {
        if (resultado.ok) {
          navegar(destino);
          return;
        }
        if (resultado.errores.observacion) {
          setError(resultado.errores.observacion);
          enfocarPrimerInvalido(formulario.current);
        }
        avisar("error", resultado.mensaje);
      },
    );
  }

  return (
    <section aria-labelledby={idTitulo} className="rounded-pieza border border-linea p-5">
      <h2 id={idTitulo} className="text-lg font-medium">
        Aprobar el retiro
      </h2>
      <p className="mt-2 text-[0.9375rem] text-tenue">
        El estudiante sale del club hoy y se cierran sus cursos activos en él.
      </p>
      <Efectos efectos={efectos} />
      <form ref={formulario} onSubmit={alEnviar} noValidate className="mt-5">
        <CampoTextoLargo
          etiqueta="Observación (opcional)"
          name="observacion"
          rows={3}
          disabled={bloqueado}
          maxLength={OBSERVACION_MAXIMA_DE_RETIRO}
          value={observacion}
          error={error}
          ayuda="Queda registrada con la resolución."
          onChange={(evento) => {
            setObservacion(evento.target.value);
            setError(undefined);
          }}
        />
        <Boton
          type="submit"
          cargando={pendiente}
          textoCargando="Aprobando"
          disabled={bloqueado}
          className="mt-2 w-full"
        >
          <LogOut aria-hidden="true" size={16} />
          Aprobar retiro
        </Boton>
      </form>
      <ZonaDeAviso aviso={aviso} className="mt-3" />
    </section>
  );
}
