"use client";

import { ChevronDown, LoaderCircle, Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useBusqueda } from "@/components/portal/Busqueda";
import { CONTROL, ETIQUETA_CONTROL } from "@/components/ui/estilos-control";
import type { OpcionDeInstitucion } from "@/lib/api/clubes";
import {
  ESTADOS_DE_CLUB,
  NOMBRES_DE_ESTADO,
  RUTA_CLUBES,
  hayFiltrosActivos,
  rutaConFiltros,
  type EstadoClub,
  type FiltrosClubes as Filtros,
} from "@/lib/portal/filtros-clubes";

type Props = {
  filtros: Filtros;
  instituciones: OpcionDeInstitucion[] | null;
};

const ESPERA_AL_ESCRIBIR_MS = 350;
const ICONO_EN_CAMPO = "pointer-events-none absolute top-1/2 -translate-y-1/2 text-tenue";

export function FiltrosClubes({ filtros, instituciones }: Props) {
  const { pendiente, navegar } = useBusqueda();
  const idBusqueda = useId();
  const idEstado = useId();
  const idInstitucion = useId();
  const [texto, setTexto] = useState(filtros.q);
  const [busquedaVista, setBusquedaVista] = useState(filtros.q);
  const [escribiendo, setEscribiendo] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (filtros.q !== busquedaVista) {
    setBusquedaVista(filtros.q);
    if (!escribiendo) {
      setTexto(filtros.q);
    }
  }

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

  function buscar(cambios: Partial<Filtros>, reemplazar = false) {
    cancelarEspera();
    const siguientes = { ...filtros, q: texto.trim(), ...cambios, pagina: 1 };
    navegar(rutaConFiltros(siguientes), { reemplazar, conservarPosicion: true });
  }

  function alEscribir(evento: ChangeEvent<HTMLInputElement>) {
    const valor = evento.target.value;
    setTexto(valor);
    setEscribiendo(true);
    if (temporizador.current) {
      clearTimeout(temporizador.current);
    }
    temporizador.current = setTimeout(() => {
      temporizador.current = null;
      setEscribiendo(false);
      navegar(rutaConFiltros({ ...filtros, q: valor.trim(), pagina: 1 }), {
        reemplazar: true,
        conservarPosicion: true,
      });
    }, ESPERA_AL_ESCRIBIR_MS);
  }

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    buscar({}, true);
  }

  function quitarFiltros() {
    cancelarEspera();
    setTexto("");
    navegar(RUTA_CLUBES, { conservarPosicion: true });
  }

  const conFiltros = hayFiltrosActivos(filtros) || texto.trim() !== "";

  return (
    <form
      role="search"
      aria-label="Filtros de clubes"
      onSubmit={alEnviar}
      className="mt-6 flex flex-col gap-4 md:flex-row md:items-end"
    >
      <div className="min-w-0 md:flex-1">
        <label htmlFor={idBusqueda} className={ETIQUETA_CONTROL}>
          Buscar por nombre
        </label>
        <div className="relative mt-2">
          <Search aria-hidden="true" size={18} className={`${ICONO_EN_CAMPO} left-3.5`} />
          <input
            id={idBusqueda}
            type="search"
            name="q"
            value={texto}
            onChange={alEscribir}
            maxLength={80}
            autoComplete="off"
            spellCheck={false}
            placeholder="Robótica, programación"
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

      <div className="md:w-48">
        <label htmlFor={idEstado} className={ETIQUETA_CONTROL}>
          Estado
        </label>
        <div className="relative mt-2">
          <select
            id={idEstado}
            name="estado"
            value={filtros.estado ?? ""}
            onChange={(evento) =>
              buscar({ estado: (evento.target.value || null) as EstadoClub | null })
            }
            className={`${CONTROL} h-11 appearance-none pr-10`}
          >
            <option value="">Todos</option>
            {ESTADOS_DE_CLUB.map((estado) => (
              <option key={estado} value={estado}>
                {NOMBRES_DE_ESTADO[estado]}
              </option>
            ))}
          </select>
          <ChevronDown aria-hidden="true" size={18} className={`${ICONO_EN_CAMPO} right-3`} />
        </div>
      </div>

      {instituciones ? (
        <div className="md:w-72">
          <label htmlFor={idInstitucion} className={ETIQUETA_CONTROL}>
            Institución
          </label>
          <div className="relative mt-2">
            <select
              id={idInstitucion}
              name="institucion"
              value={filtros.institucion ?? ""}
              onChange={(evento) =>
                buscar({ institucion: evento.target.value ? Number(evento.target.value) : null })
              }
              className={`${CONTROL} h-11 appearance-none truncate pr-10`}
            >
              <option value="">Todas</option>
              {instituciones.map((institucion) => (
                <option key={institucion.id} value={institucion.id}>
                  {institucion.nombre}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden="true" size={18} className={`${ICONO_EN_CAMPO} right-3`} />
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={quitarFiltros}
        disabled={!conFiltros}
        className="inline-flex h-11 shrink-0 select-none items-center justify-center gap-2 rounded-control px-3 text-[0.9375rem] font-medium text-tenue transition-[transform,background-color,color,opacity] duration-150 ease-salida hover:bg-superficie hover:text-tinta active:scale-[0.97] disabled:pointer-events-none disabled:opacity-0"
      >
        <X aria-hidden="true" size={16} />
        Quitar filtros
      </button>
    </form>
  );
}

export function EsqueletoFiltros() {
  return (
    <div aria-hidden="true" className="mt-6 flex flex-col gap-4 motion-safe:animate-pulse md:flex-row md:items-end">
      {["md:flex-1", "md:w-48", "md:w-72"].map((ancho) => (
        <div key={ancho} className={ancho}>
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
