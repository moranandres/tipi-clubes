"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { Boton } from "@/components/ui/Boton";
import { CampoTextoLargo } from "@/components/ui/CampoTextoLargo";
import { ETIQUETA_CONTROL, MENSAJE_CONTROL } from "@/components/ui/estilos-control";
import type { ResultadoDeAccion } from "@/lib/acciones/resultado";
import { LONGITUD_MAXIMA_DE_MOTIVO } from "@/lib/portal/reglas-clubes";
import { enfocarPrimerInvalido, useAlOcultar, useEnvio } from "./ganchos";
import { ZonaDeAviso } from "./ZonaDeAviso";

export type OpcionDeCambio = {
  estado: string;
  accion: string;
  descripcion: string;
  exigeMotivo: boolean;
  bloqueos: string[];
  avisos: string[];
};

type Props = {
  titulo: string;
  estadoActual: string;
  puntoActual: string;
  opciones: OpcionDeCambio[];
  sinOpciones: string;
  cambiar: (estado: string, motivo: string) => Promise<ResultadoDeAccion>;
};

const FICHA =
  "w-full select-none rounded-control border p-3.5 text-left transition-[transform,background-color,border-color,opacity] duration-150 ease-salida active:scale-[0.98] aria-disabled:cursor-not-allowed aria-disabled:active:scale-100";

export function CambioDeEstado({
  titulo,
  estadoActual,
  puntoActual,
  opciones,
  sinOpciones,
  cambiar,
}: Props) {
  const idTitulo = useId();
  const idGrupo = useId();
  const idEleccion = useId();
  const formulario = useRef<HTMLFormElement>(null);
  const [elegido, setElegido] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [errorDeEleccion, setErrorDeEleccion] = useState<string | undefined>();
  const [errorDeMotivo, setErrorDeMotivo] = useState<string | undefined>();
  const { pendiente, aviso, enviar, avisar, limpiarAviso } = useEnvio();

  useAlOcultar(() => {
    setElegido(null);
    setMotivo("");
    setErrorDeEleccion(undefined);
    setErrorDeMotivo(undefined);
  });

  const opcion = opciones.find((candidata) => candidata.estado === elegido) ?? null;

  function alternar(candidata: OpcionDeCambio) {
    if (candidata.bloqueos.length > 0 || pendiente) {
      return;
    }
    setElegido((previo) => (previo === candidata.estado ? null : candidata.estado));
    setErrorDeEleccion(undefined);
    setErrorDeMotivo(undefined);
  }

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (pendiente) {
      return;
    }
    if (!opcion) {
      setErrorDeEleccion("Elige el nuevo estado antes de confirmar.");
      return;
    }

    const texto = motivo.trim();
    if (opcion.exigeMotivo && !texto) {
      setErrorDeMotivo("Escribe el motivo de este cambio.");
      enfocarPrimerInvalido(formulario.current);
      return;
    }

    limpiarAviso();
    enviar(
      () => cambiar(opcion.estado, texto),
      (resultado) => {
        if (resultado.ok) {
          setElegido(null);
          setMotivo("");
          avisar("exito", resultado.mensaje);
          return;
        }
        if (resultado.errores.motivo) {
          setErrorDeMotivo(resultado.errores.motivo);
          enfocarPrimerInvalido(formulario.current);
        }
        avisar("error", resultado.mensaje);
      },
    );
  }

  return (
    <section aria-labelledby={idTitulo} className="rounded-pieza border border-linea p-5">
      <h2 id={idTitulo} className="text-lg font-medium">
        {titulo}
      </h2>
      <p className="mt-3 text-sm text-tenue">Estado actual</p>
      <p className="mt-1 flex items-center gap-2 font-medium">
        <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${puntoActual}`} />
        {estadoActual}
      </p>

      {opciones.length === 0 ? (
        <p className="mt-4 text-[0.9375rem] text-tenue">{sinOpciones}</p>
      ) : (
        <form ref={formulario} onSubmit={alEnviar} noValidate className="mt-5">
          <div role="group" aria-labelledby={idGrupo} aria-describedby={idEleccion}>
            <p id={idGrupo} className={ETIQUETA_CONTROL}>
              Cambiar a
            </p>
            <div className="mt-2 flex flex-col gap-2">
              {opciones.map((candidata) => {
                const marcada = candidata.estado === elegido;
                const bloqueada = candidata.bloqueos.length > 0;
                return (
                  <button
                    key={candidata.estado}
                    type="button"
                    aria-pressed={marcada}
                    aria-disabled={bloqueada || undefined}
                    onClick={() => alternar(candidata)}
                    className={`${FICHA} ${
                      marcada
                        ? "border-acento bg-superficie-alta"
                        : bloqueada
                          ? "border-transparent bg-superficie"
                          : "border-transparent bg-superficie hover:bg-superficie-alta"
                    }`}
                  >
                    <span className="block font-medium">{candidata.accion}</span>
                    <span className="mt-0.5 block text-sm text-tenue">{candidata.descripcion}</span>
                    {candidata.bloqueos.map((bloqueo) => (
                      <span key={bloqueo} className="mt-2 block text-sm text-error">
                        {bloqueo}
                      </span>
                    ))}
                    {bloqueada
                      ? null
                      : candidata.avisos.map((nota) => (
                          <span key={nota} className="mt-2 block text-sm text-aviso">
                            {nota}
                          </span>
                        ))}
                  </button>
                );
              })}
            </div>
          </div>
          <p id={idEleccion} className={`${MENSAJE_CONTROL} text-error`}>
            {errorDeEleccion ? (
              <span role="alert" className="entrada-mensaje inline-block">
                {errorDeEleccion}
              </span>
            ) : null}
          </p>

          <div className="mt-2">
            <CampoTextoLargo
              etiqueta={opcion && !opcion.exigeMotivo ? "Motivo (opcional)" : "Motivo"}
              name="motivo"
              rows={3}
              maxLength={LONGITUD_MAXIMA_DE_MOTIVO}
              value={motivo}
              disabled={!opcion}
              required={opcion?.exigeMotivo}
              error={errorDeMotivo}
              ayuda={
                opcion
                  ? "Queda registrado en la auditoría del sistema."
                  : "Elige primero el nuevo estado."
              }
              onChange={(evento) => {
                setMotivo(evento.target.value);
                setErrorDeMotivo(undefined);
              }}
            />
          </div>

          <Boton
            type="submit"
            cargando={pendiente}
            textoCargando="Aplicando"
            className="mt-2 w-full"
          >
            Confirmar cambio
          </Boton>
        </form>
      )}
      <ZonaDeAviso aviso={aviso} className="mt-3" />
    </section>
  );
}
