"use client";

import { ChevronDown, LoaderCircle, Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { CONTROL, ETIQUETA_CONTROL } from "@/components/ui/estilos-control";
import { useBusqueda } from "./Busqueda";

const ESPERA_AL_ESCRIBIR_MS = 350;
const LONGITUD_MAXIMA = 80;
const ICONO_EN_CAMPO = "pointer-events-none absolute top-1/2 -translate-y-1/2 text-tenue";

type FiltrosBasicos = { q: string; pagina: number };

export function useFiltrosEnUrl<F extends FiltrosBasicos>(
  filtros: F,
  rutaDe: (filtros: F) => string,
  vacios: F,
) {
  const { navegar } = useBusqueda();
  const [texto, setTexto] = useState(filtros.q);
  const [busquedaVista, setBusquedaVista] = useState(filtros.q);
  const [escribiendo, setEscribiendo] = useState(false);
  const deseados = useRef(filtros);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (filtros.q !== busquedaVista) {
    setBusquedaVista(filtros.q);
    if (!escribiendo) {
      setTexto(filtros.q);
    }
  }

  useEffect(() => {
    deseados.current = filtros;
  }, [filtros]);

  useEffect(() => {
    return () => {
      if (temporizador.current) {
        clearTimeout(temporizador.current);
      }
    };
  }, []);

  function cancelarEspera() {
    if (temporizador.current) {
      clearTimeout(temporizador.current);
      temporizador.current = null;
    }
    setEscribiendo(false);
  }

  function aplicar(cambios: Partial<F>, reemplazar: boolean) {
    const siguientes = { ...deseados.current, ...cambios, pagina: 1 };
    deseados.current = siguientes;
    navegar(rutaDe(siguientes), { reemplazar, conservarPosicion: true });
  }

  function alEscribir(valor: string) {
    setTexto(valor);
    setEscribiendo(true);
    if (temporizador.current) {
      clearTimeout(temporizador.current);
    }
    temporizador.current = setTimeout(() => {
      temporizador.current = null;
      setEscribiendo(false);
      aplicar({ q: valor.trim() } as Partial<F>, true);
    }, ESPERA_AL_ESCRIBIR_MS);
  }

  function cambiar(cambios: Partial<F>) {
    cancelarEspera();
    aplicar({ ...cambios, q: texto.trim() }, false);
  }

  function enviar() {
    cancelarEspera();
    aplicar({ q: texto.trim() } as Partial<F>, true);
  }

  function quitar() {
    cancelarEspera();
    setTexto("");
    deseados.current = vacios;
    navegar(rutaDe(vacios), { conservarPosicion: true });
  }

  return { texto, alEscribir, cambiar, enviar, quitar };
}

export function CampoDeBusqueda({
  etiqueta,
  texto,
  alEscribir,
  placeholder,
}: {
  etiqueta: string;
  texto: string;
  alEscribir: (valor: string) => void;
  placeholder?: string;
}) {
  const id = useId();
  const { pendiente } = useBusqueda();

  return (
    <div className="min-w-0 md:min-w-[16rem] md:flex-1">
      <label htmlFor={id} className={ETIQUETA_CONTROL}>
        {etiqueta}
      </label>
      <div className="relative mt-2">
        <Search aria-hidden="true" size={18} className={`${ICONO_EN_CAMPO} left-3.5`} />
        <input
          id={id}
          type="search"
          name="q"
          value={texto}
          onChange={(evento) => alEscribir(evento.target.value)}
          maxLength={LONGITUD_MAXIMA}
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          className={`${CONTROL} h-11 pl-11 pr-11 [&::-webkit-search-cancel-button]:hidden`}
        />
        {pendiente ? (
          <LoaderCircle
            aria-hidden="true"
            size={18}
            className={`${ICONO_EN_CAMPO} right-3.5 animate-spin [animation-duration:600ms]`}
          />
        ) : null}
      </div>
    </div>
  );
}

export function Selector({
  etiqueta,
  valor,
  opciones,
  alCambiar,
  textoDeTodos,
  className = "md:w-48",
}: {
  etiqueta: string;
  valor: string;
  opciones: { valor: string; texto: string }[];
  alCambiar: (valor: string) => void;
  textoDeTodos: string;
  className?: string;
}) {
  const id = useId();

  return (
    <div className={className}>
      <label htmlFor={id} className={ETIQUETA_CONTROL}>
        {etiqueta}
      </label>
      <div className="relative mt-2">
        <select
          id={id}
          value={valor}
          onChange={(evento) => alCambiar(evento.target.value)}
          className={`${CONTROL} h-11 appearance-none truncate pr-10`}
        >
          <option value="">{textoDeTodos}</option>
          {opciones.map((opcion) => (
            <option key={opcion.valor} value={opcion.valor}>
              {opcion.texto}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden="true" size={18} className={`${ICONO_EN_CAMPO} right-3`} />
      </div>
    </div>
  );
}

export function BotonQuitarFiltros({
  visible,
  alPulsar,
}: {
  visible: boolean;
  alPulsar: () => void;
}) {
  return (
    <button
      type="button"
      onClick={alPulsar}
      disabled={!visible}
      className="inline-flex h-11 shrink-0 select-none items-center justify-center gap-2 rounded-control px-3 text-[0.9375rem] font-medium text-tenue transition-[transform,background-color,color,opacity] duration-150 ease-salida hover:bg-superficie hover:text-tinta active:scale-[0.97] disabled:pointer-events-none disabled:opacity-0"
    >
      <X aria-hidden="true" size={16} />
      Quitar filtros
    </button>
  );
}

export function EsqueletoFiltros({ anchos }: { anchos: string[] }) {
  return (
    <div
      aria-hidden="true"
      className="mt-6 flex flex-col gap-4 motion-safe:animate-pulse md:flex-row md:flex-wrap md:items-end"
    >
      {anchos.map((ancho, indice) => (
        <div key={indice} className={ancho}>
          <div className="flex h-[1.40625rem] items-center">
            <div className="h-3.5 w-28 rounded-full bg-superficie" />
          </div>
          <div className="mt-2 h-11 rounded-control bg-superficie" />
        </div>
      ))}
      <div className="hidden h-11 w-[8.5625rem] shrink-0 md:block" />
    </div>
  );
}
