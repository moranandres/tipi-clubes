"use client";

import type { FormEvent } from "react";
import {
  BotonQuitarFiltros,
  CampoDeBusqueda,
  Selector,
  useFiltrosEnUrl,
} from "@/components/portal/ControlesDeFiltro";
import type { OpcionDeInstitucion } from "@/lib/api/clubes";
import {
  ESTADOS_DE_CLUB,
  FILTROS_DE_CLUBES_VACIOS,
  NOMBRES_DE_ESTADO,
  hayFiltrosActivos,
  rutaConFiltros,
  type EstadoClub,
  type FiltrosClubes as Filtros,
} from "@/lib/portal/filtros-clubes";

type Props = {
  filtros: Filtros;
  instituciones: OpcionDeInstitucion[] | null;
};

const OPCIONES_DE_ESTADO = ESTADOS_DE_CLUB.map((estado) => ({
  valor: estado,
  texto: NOMBRES_DE_ESTADO[estado],
}));

export function FiltrosClubes({ filtros, instituciones }: Props) {
  const { texto, alEscribir, cambiar, enviar, quitar } = useFiltrosEnUrl(
    filtros,
    rutaConFiltros,
    FILTROS_DE_CLUBES_VACIOS,
  );

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    enviar();
  }

  return (
    <form
      role="search"
      aria-label="Filtros de clubes"
      onSubmit={alEnviar}
      className="mt-6 flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end"
    >
      <CampoDeBusqueda
        etiqueta="Buscar por nombre"
        texto={texto}
        alEscribir={alEscribir}
        placeholder="Robótica, programación"
      />
      <Selector
        etiqueta="Estado"
        valor={filtros.estado ?? ""}
        opciones={OPCIONES_DE_ESTADO}
        textoDeTodos="Todos"
        alCambiar={(valor) => cambiar({ estado: (valor || null) as EstadoClub | null })}
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
          className="md:w-72"
          alCambiar={(valor) => cambiar({ institucion: valor ? Number(valor) : null })}
        />
      ) : null}
      <BotonQuitarFiltros
        visible={hayFiltrosActivos(filtros) || texto.trim() !== ""}
        alPulsar={quitar}
      />
    </form>
  );
}
