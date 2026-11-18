"use client";

import type { FormEvent } from "react";
import {
  BotonQuitarFiltros,
  CampoDeBusqueda,
  Selector,
  useFiltrosEnUrl,
} from "@/components/portal/ControlesDeFiltro";
import {
  FILTROS_DE_PARTICIPACIONES_VACIOS,
  hayFiltrosDeParticipaciones,
  rutaDeParticipaciones,
  type FiltrosParticipaciones as Filtros,
} from "@/lib/portal/filtros-competencias";
import type { OpcionDeFormulario } from "@/lib/portal/opciones";

type Props = {
  filtros: Filtros;
  instituciones: OpcionDeFormulario[] | null;
  clubes: OpcionDeFormulario[];
  competencias: OpcionDeFormulario[];
  ediciones: OpcionDeFormulario[];
  minima: boolean;
};

function numeroDe(valor: string): number | null {
  return valor ? Number(valor) : null;
}

export function FiltrosParticipaciones({
  filtros,
  instituciones,
  clubes,
  competencias,
  ediciones,
  minima,
}: Props) {
  const { texto, alEscribir, cambiar, enviar, quitar } = useFiltrosEnUrl(
    filtros,
    rutaDeParticipaciones,
    FILTROS_DE_PARTICIPACIONES_VACIOS,
  );

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    enviar();
  }

  return (
    <form
      role="search"
      aria-label="Filtros de participaciones en competencias"
      onSubmit={alEnviar}
      className="mt-6 flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end"
    >
      <CampoDeBusqueda
        etiqueta="Buscar estudiante"
        texto={texto}
        alEscribir={alEscribir}
        placeholder={minima ? "Código del estudiante" : "Nombre, apellido o código"}
      />
      {instituciones ? (
        <Selector
          etiqueta="Institución"
          valor={filtros.institucion ? String(filtros.institucion) : ""}
          opciones={instituciones}
          textoDeTodos="Todas"
          className="md:w-56"
          alCambiar={(valor) => cambiar({ institucion: numeroDe(valor), club: null })}
        />
      ) : null}
      <Selector
        etiqueta="Club"
        valor={filtros.club ? String(filtros.club) : ""}
        opciones={clubes}
        textoDeTodos="Todos"
        className="md:w-52"
        alCambiar={(valor) => cambiar({ club: numeroDe(valor) })}
      />
      <Selector
        etiqueta="Competencia"
        valor={filtros.competencia ? String(filtros.competencia) : ""}
        opciones={competencias}
        textoDeTodos="Todas"
        className="md:w-52"
        alCambiar={(valor) => cambiar({ competencia: numeroDe(valor), edicion: null })}
      />
      {filtros.competencia ? (
        <Selector
          etiqueta="Edición"
          valor={filtros.edicion ? String(filtros.edicion) : ""}
          opciones={ediciones}
          textoDeTodos="Todas"
          className="md:w-48"
          alCambiar={(valor) => cambiar({ edicion: numeroDe(valor) })}
        />
      ) : null}
      <BotonQuitarFiltros visible={hayFiltrosDeParticipaciones(filtros)} alPulsar={quitar} />
    </form>
  );
}
