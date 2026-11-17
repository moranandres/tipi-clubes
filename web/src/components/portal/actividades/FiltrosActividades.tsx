"use client";

import type { FormEvent } from "react";
import {
  BotonQuitarFiltros,
  CampoDeBusqueda,
  Selector,
  SelectorDeFecha,
  useFiltrosEnUrl,
} from "@/components/portal/ControlesDeFiltro";
import {
  FILTROS_DE_ACTIVIDADES_VACIOS,
  hayFiltrosDeActividades,
  rutaDeActividades,
  type FiltrosActividades as Filtros,
} from "@/lib/portal/filtros-actividades";
import type { OpcionDeFormulario } from "@/lib/portal/opciones";

type Props = {
  filtros: Filtros;
  instituciones: OpcionDeFormulario[] | null;
  clubes: OpcionDeFormulario[];
  cursos: OpcionDeFormulario[];
};

export function FiltrosActividades({ filtros, instituciones, clubes, cursos }: Props) {
  const { texto, alEscribir, cambiar, enviar, quitar } = useFiltrosEnUrl(
    filtros,
    rutaDeActividades,
    FILTROS_DE_ACTIVIDADES_VACIOS,
  );

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    enviar();
  }

  return (
    <form
      role="search"
      aria-label="Filtros de actividades"
      onSubmit={alEnviar}
      className="mt-6 flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end"
    >
      <CampoDeBusqueda
        etiqueta="Buscar por tema"
        texto={texto}
        alEscribir={alEscribir}
        placeholder="Tema de la sesión"
      />
      {instituciones ? (
        <Selector
          etiqueta="Institución"
          valor={filtros.institucion ? String(filtros.institucion) : ""}
          opciones={instituciones}
          textoDeTodos="Todas"
          className="md:w-56"
          alCambiar={(valor) =>
            cambiar({ institucion: valor ? Number(valor) : null, club: null, curso: null })
          }
        />
      ) : null}
      <Selector
        etiqueta="Club"
        valor={filtros.club ? String(filtros.club) : ""}
        opciones={clubes}
        textoDeTodos="Todos"
        className="md:w-56"
        alCambiar={(valor) => cambiar({ club: valor ? Number(valor) : null, curso: null })}
      />
      {filtros.club && cursos.length > 0 ? (
        <Selector
          etiqueta="Curso"
          valor={filtros.curso ? String(filtros.curso) : ""}
          opciones={cursos}
          textoDeTodos="Todos"
          className="md:w-48"
          alCambiar={(valor) => cambiar({ curso: valor ? Number(valor) : null })}
        />
      ) : null}
      <div className="grid grid-cols-2 gap-3 md:contents">
        <SelectorDeFecha
          etiqueta="Desde"
          valor={filtros.desde ?? ""}
          maximo={filtros.hasta ?? undefined}
          alCambiar={(valor) => cambiar({ desde: valor })}
        />
        <SelectorDeFecha
          etiqueta="Hasta"
          valor={filtros.hasta ?? ""}
          minimo={filtros.desde ?? undefined}
          alCambiar={(valor) => cambiar({ hasta: valor })}
        />
      </div>
      <BotonQuitarFiltros
        visible={hayFiltrosDeActividades(filtros) || texto.trim() !== ""}
        alPulsar={quitar}
      />
    </form>
  );
}
