"use client";

import { X } from "lucide-react";
import { useId, type FormEvent } from "react";
import {
  BotonQuitarFiltros,
  Selector,
  useFiltrosEnUrl,
} from "@/components/portal/ControlesDeFiltro";
import { ETIQUETA_CONTROL } from "@/components/ui/estilos-control";
import type { OpcionDeInstitucion } from "@/lib/api/clubes";
import {
  FILTROS_DE_AUTORIZACIONES_VACIOS,
  OPCIONES_DE_TIPO_DE_AUTORIZACION,
  TIPOS_DE_AUTORIZACION,
  hayFiltrosDeAutorizaciones,
  rutaDeAutorizaciones,
  type FiltrosAutorizaciones as Filtros,
} from "@/lib/portal/filtros-autorizaciones";
import { opcionValida } from "@/lib/portal/parametros";

type Props = {
  filtros: Filtros;
  instituciones: OpcionDeInstitucion[] | null;
  estudiante: string | null;
};

function FiltroDeEstudiante({ nombre, alQuitar }: { nombre: string; alQuitar: () => void }) {
  const id = useId();

  return (
    <div className="min-w-0 md:w-72">
      <p id={id} className={ETIQUETA_CONTROL}>
        Estudiante
      </p>
      <div
        role="group"
        aria-labelledby={id}
        className="mt-2 flex h-11 items-center justify-between gap-2 rounded-control border border-acento bg-superficie-alta pl-3.5 pr-1"
      >
        <span className="min-w-0 truncate">{nombre}</span>
        <button
          type="button"
          onClick={alQuitar}
          className="grid size-9 shrink-0 select-none place-items-center rounded-[8px] text-tenue transition-[transform,background-color,color] duration-150 ease-salida hover:bg-linea hover:text-tinta active:scale-[0.97]"
        >
          <X aria-hidden="true" size={16} />
          <span className="sr-only">Quitar el filtro por estudiante</span>
        </button>
      </div>
    </div>
  );
}

export function FiltrosAutorizaciones({ filtros, instituciones, estudiante }: Props) {
  const { cambiar, quitar } = useFiltrosEnUrl(
    filtros,
    rutaDeAutorizaciones,
    FILTROS_DE_AUTORIZACIONES_VACIOS,
  );

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
  }

  return (
    <form
      role="search"
      aria-label="Filtros de autorizaciones"
      onSubmit={alEnviar}
      className="mt-6 flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end"
    >
      <Selector
        etiqueta="Tipo de autorización"
        valor={filtros.tipo ?? ""}
        opciones={OPCIONES_DE_TIPO_DE_AUTORIZACION}
        textoDeTodos="Participación y uso de imagen"
        className="md:w-72"
        alCambiar={(valor) => cambiar({ tipo: opcionValida(TIPOS_DE_AUTORIZACION, valor) })}
      />
      {instituciones ? (
        <Selector
          etiqueta="Institución"
          valor={filtros.institucion ? String(filtros.institucion) : ""}
          opciones={instituciones.map((institucion) => ({
            valor: String(institucion.id),
            texto: institucion.nombre ?? "",
          }))}
          textoDeTodos="Todas"
          className="md:w-64"
          alCambiar={(valor) => cambiar({ institucion: valor ? Number(valor) : null })}
        />
      ) : null}
      {filtros.estudiante ? (
        <FiltroDeEstudiante
          nombre={estudiante ?? `Estudiante ${filtros.estudiante}`}
          alQuitar={() => cambiar({ estudiante: null })}
        />
      ) : null}
      <BotonQuitarFiltros visible={hayFiltrosDeAutorizaciones(filtros)} alPulsar={quitar} />
    </form>
  );
}
