"use client";

import { Check, ImageOff } from "lucide-react";
import { useId } from "react";
import { ETIQUETA_CONTROL, MENSAJE_CONTROL } from "@/components/ui/estilos-control";

export type CandidatoDeEvidencia = {
  id: number;
  principal: string;
  codigo: string | null;
  autorizado: boolean;
};

type Props = {
  etiqueta: string;
  candidatos: CandidatoDeEvidencia[];
  elegidos: readonly number[];
  soloAutorizados: boolean;
  error?: string;
  ayuda: string;
  deshabilitado?: boolean;
  textoVacio?: string;
  alCambiar: (ids: number[]) => void;
};

const OPCION =
  "flex min-h-12 cursor-pointer select-none items-center gap-3 rounded-control border px-3 py-2 transition-[transform,background-color,border-color] duration-150 ease-salida active:scale-[0.98] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-acento peer-disabled:cursor-not-allowed peer-disabled:opacity-55 peer-disabled:active:scale-100";

export function SelectorDeEstudiantes({
  etiqueta,
  candidatos,
  elegidos,
  soloAutorizados,
  error,
  ayuda,
  deshabilitado = false,
  textoVacio = "La sesión no tiene integrantes para relacionar.",
  alCambiar,
}: Props) {
  const id = useId();
  const idMensaje = `${id}-mensaje`;
  const primero = candidatos.find((candidato) => !soloAutorizados || candidato.autorizado)?.id;

  function alternar(estudianteId: number, marcado: boolean) {
    alCambiar(marcado ? [...elegidos, estudianteId] : elegidos.filter((elegido) => elegido !== estudianteId));
  }

  return (
    <fieldset aria-describedby={idMensaje} className="min-w-0" disabled={deshabilitado}>
      <legend className={ETIQUETA_CONTROL}>{etiqueta}</legend>
      {candidatos.length === 0 ? (
        <p className="mt-2 text-[0.9375rem] text-tenue">{textoVacio}</p>
      ) : (
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {candidatos.map((candidato) => {
            const bloqueado = soloAutorizados && !candidato.autorizado;
            const marcado = elegidos.includes(candidato.id);
            const idOpcion = `${id}-${candidato.id}`;
            return (
              <li key={candidato.id} className="min-w-0">
                <input
                  id={idOpcion}
                  type="checkbox"
                  className="peer sr-only"
                  checked={marcado}
                  disabled={bloqueado && !marcado}
                  aria-invalid={error && candidato.id === primero ? true : undefined}
                  onChange={(evento) => alternar(candidato.id, evento.target.checked)}
                />
                <label
                  htmlFor={idOpcion}
                  className={`${OPCION} ${
                    marcado
                      ? "border-acento bg-superficie-alta"
                      : error
                        ? "border-error bg-superficie hover:bg-superficie-alta"
                        : "border-transparent bg-superficie hover:bg-superficie-alta"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`grid size-5 shrink-0 place-items-center rounded-[6px] border ${
                      marcado ? "border-acento bg-acento text-sobre-acento" : "border-linea"
                    }`}
                  >
                    {marcado ? <Check size={14} strokeWidth={2.5} /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block break-words text-[0.9375rem] ${candidato.codigo ? "" : "cifras"}`}>
                      {candidato.principal}
                    </span>
                    {bloqueado ? (
                      <span className="mt-0.5 flex items-center gap-1 text-sm text-tenue">
                        <ImageOff aria-hidden="true" size={14} className="shrink-0" />
                        Sin autorización de uso de imagen
                      </span>
                    ) : candidato.codigo ? (
                      <span className="cifras mt-0.5 block text-sm text-tenue">{candidato.codigo}</span>
                    ) : null}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
      <p id={idMensaje} className={`${MENSAJE_CONTROL} ${error ? "text-error" : "text-tenue"}`}>
        {error ? (
          <span role="alert" className="entrada-mensaje inline-block">
            {error}
          </span>
        ) : (
          ayuda
        )}
      </p>
    </fieldset>
  );
}
