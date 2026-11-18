"use client";

import type { FormEvent } from "react";
import { BotonQuitarFiltros, Selector, useFiltrosEnUrl } from "@/components/portal/ControlesDeFiltro";
import {
  FILTROS_DE_PROYECTOS_VACIOS,
  OPCIONES_DE_TIPO_DE_PROYECTO,
  hayFiltrosDeProyectos,
  rutaDeProyectos,
  type FiltrosProyectos as Filtros,
  type TipoProyecto,
} from "@/lib/portal/filtros-proyectos";
import type { OpcionDeFormulario } from "@/lib/portal/opciones";

type Props = {
  filtros: Filtros;
  instituciones: OpcionDeFormulario[] | null;
  clubes: OpcionDeFormulario[];
  periodos: OpcionDeFormulario[];
};

function numeroDe(valor: string): number | null {
  return valor ? Number(valor) : null;
}

export function FiltrosProyectos({ filtros, instituciones, clubes, periodos }: Props) {
  const { cambiar, enviar, quitar } = useFiltrosEnUrl(filtros, rutaDeProyectos, FILTROS_DE_PROYECTOS_VACIOS);

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    enviar();
  }

  return (
    <form
      role="search"
      aria-label="Filtros de proyectos"
      onSubmit={alEnviar}
      className="mt-6 flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end"
    >
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
        className="md:min-w-[14rem] md:flex-1"
        alCambiar={(valor) => cambiar({ club: numeroDe(valor) })}
      />
      <Selector
        etiqueta="Período"
        valor={filtros.periodo ? String(filtros.periodo) : ""}
        opciones={periodos}
        textoDeTodos="Todos"
        className="md:w-56"
        alCambiar={(valor) => cambiar({ periodo: numeroDe(valor) })}
      />
      <Selector
        etiqueta="Tipo"
        valor={filtros.tipo ?? ""}
        opciones={OPCIONES_DE_TIPO_DE_PROYECTO}
        textoDeTodos="Todos"
        className="md:w-40"
        alCambiar={(valor) => cambiar({ tipo: valor ? (valor as TipoProyecto) : null })}
      />
      <BotonQuitarFiltros visible={hayFiltrosDeProyectos(filtros)} alPulsar={quitar} />
    </form>
  );
}
