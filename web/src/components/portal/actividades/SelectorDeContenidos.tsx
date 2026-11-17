"use client";

import { Check } from "lucide-react";
import { useId } from "react";
import { ETIQUETA_CONTROL, MENSAJE_CONTROL } from "@/components/ui/estilos-control";
import { NOMBRES_DE_TIPO_DE_CONTENIDO, TIPOS_DE_CONTENIDO } from "@/lib/portal/filtros-actividades";
import type { ContenidoElegible } from "@/lib/portal/reglas-actividades";

type Props = {
  etiqueta: string;
  contenidos: ContenidoElegible[];
  elegidos: readonly number[];
  error?: string;
  ayuda: string;
  deshabilitado?: boolean;
  alCambiar: (ids: number[]) => void;
};

const FICHA =
  "inline-flex min-h-9 select-none items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-[transform,background-color,border-color,color] duration-150 ease-salida active:scale-[0.97] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-acento peer-disabled:cursor-not-allowed peer-disabled:opacity-55";

export function SelectorDeContenidos({
  etiqueta,
  contenidos,
  elegidos,
  error,
  ayuda,
  deshabilitado = false,
  alCambiar,
}: Props) {
  const id = useId();
  const idMensaje = `${id}-mensaje`;
  const grupos = TIPOS_DE_CONTENIDO.map((tipo) => ({
    tipo,
    opciones: contenidos.filter((contenido) => contenido.tipo === tipo),
  })).filter((grupo) => grupo.opciones.length > 0);
  const primero = grupos[0]?.opciones[0]?.id;

  function alternar(contenidoId: number, marcado: boolean) {
    alCambiar(
      marcado
        ? [...elegidos, contenidoId]
        : elegidos.filter((elegido) => elegido !== contenidoId),
    );
  }

  return (
    <fieldset aria-describedby={idMensaje} className="min-w-0" disabled={deshabilitado}>
      <legend className={ETIQUETA_CONTROL}>{etiqueta}</legend>
      {grupos.length === 0 ? (
        <p className="mt-2 text-[0.9375rem] text-tenue">
          El catálogo de contenidos todavía está vacío. El administrador puede registrarlos.
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-4">
          {grupos.map((grupo) => (
            <div key={grupo.tipo} role="group" aria-label={NOMBRES_DE_TIPO_DE_CONTENIDO[grupo.tipo]}>
              <p className="text-sm text-tenue">{NOMBRES_DE_TIPO_DE_CONTENIDO[grupo.tipo]}</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {grupo.opciones.map((contenido) => {
                  const marcado = elegidos.includes(contenido.id);
                  const idOpcion = `${id}-${contenido.id}`;
                  return (
                    <li key={contenido.id} className="min-w-0">
                      <input
                        id={idOpcion}
                        type="checkbox"
                        className="peer sr-only"
                        checked={marcado}
                        aria-invalid={error && contenido.id === primero ? true : undefined}
                        onChange={(evento) => alternar(contenido.id, evento.target.checked)}
                      />
                      <label
                        htmlFor={idOpcion}
                        className={`${FICHA} cursor-pointer ${
                          marcado
                            ? "border-acento bg-superficie-alta text-tinta"
                            : error
                              ? "border-error bg-superficie text-tinta hover:bg-superficie-alta"
                              : "border-transparent bg-superficie text-tinta hover:bg-superficie-alta"
                        }`}
                      >
                        {marcado ? (
                          <Check aria-hidden="true" size={14} className="shrink-0 text-acento" />
                        ) : null}
                        <span className="break-words">{contenido.nombre}</span>
                        {contenido.activo ? null : (
                          <span className="text-xs text-tenue">(retirado del catálogo)</span>
                        )}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
      <p id={idMensaje} className={`${MENSAJE_CONTROL} ${error ? "text-error" : "text-tenue"}`}>
        {error ? (
          <span role="alert" className="entrada-mensaje inline-block">
            {error}
          </span>
        ) : (
          `${ayuda} ${elegidos.length === 0 ? "Ninguno elegido." : elegidos.length === 1 ? "1 elegido." : `${elegidos.length} elegidos.`}`
        )}
      </p>
    </fieldset>
  );
}
