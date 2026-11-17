"use client";

import type { FormEvent } from "react";
import {
  BotonQuitarFiltros,
  CampoDeBusqueda,
  Selector,
  useFiltrosEnUrl,
} from "@/components/portal/ControlesDeFiltro";
import {
  FILTROS_DE_INSTITUCIONES_VACIOS,
  OPCIONES_DE_ADHESION,
  hayFiltrosDeInstituciones,
  rutaDeInstituciones,
  type EstadoAdhesion,
  type FiltrosInstituciones as Filtros,
} from "@/lib/portal/filtros-instituciones";

type Props = {
  filtros: Filtros;
};

export function FiltrosInstituciones({ filtros }: Props) {
  const { texto, alEscribir, cambiar, enviar, quitar } = useFiltrosEnUrl(
    filtros,
    rutaDeInstituciones,
    FILTROS_DE_INSTITUCIONES_VACIOS,
  );

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    enviar();
  }

  return (
    <form
      role="search"
      aria-label="Filtros de instituciones"
      onSubmit={alEnviar}
      className="mt-6 flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end"
    >
      <CampoDeBusqueda
        etiqueta="Buscar por nombre o código AMIE"
        texto={texto}
        alEscribir={alEscribir}
        placeholder="Unidad Educativa, 09H00001"
      />
      <Selector
        etiqueta="Adhesión"
        valor={filtros.estado ?? ""}
        opciones={OPCIONES_DE_ADHESION}
        textoDeTodos="Todas"
        alCambiar={(valor) => cambiar({ estado: (valor || null) as EstadoAdhesion | null })}
      />
      <BotonQuitarFiltros
        visible={hayFiltrosDeInstituciones(filtros) || texto.trim() !== ""}
        alPulsar={quitar}
      />
    </form>
  );
}
