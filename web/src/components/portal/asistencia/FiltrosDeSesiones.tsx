"use client";

import type { FormEvent } from "react";
import {
  BotonQuitarFiltros,
  Selector,
  SelectorDeFecha,
  useFiltrosEnUrl,
} from "@/components/portal/ControlesDeFiltro";
import {
  FILTROS_DE_SESIONES_VACIOS,
  hayFiltrosDeSesiones,
  rutaDeSesiones,
  type FiltrosSesiones,
} from "@/lib/portal/filtros-asistencia";
import type { OpcionDeFormulario } from "@/lib/portal/opciones";

type Props = {
  base: string;
  filtros: FiltrosSesiones;
  instituciones: OpcionDeFormulario[] | null;
  clubes: OpcionDeFormulario[];
};

export function FiltrosDeSesiones({ base, filtros, instituciones, clubes }: Props) {
  const { cambiar, enviar, quitar } = useFiltrosEnUrl(
    filtros,
    (siguientes) => rutaDeSesiones(base, siguientes),
    FILTROS_DE_SESIONES_VACIOS,
  );

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    enviar();
  }

  return (
    <form
      role="search"
      aria-label="Filtros de sesiones"
      onSubmit={alEnviar}
      className="mt-6 flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end"
    >
      {instituciones ? (
        <Selector
          etiqueta="Institución"
          valor={filtros.institucion ? String(filtros.institucion) : ""}
          opciones={instituciones}
          textoDeTodos="Todas"
          className="md:w-60"
          alCambiar={(valor) => cambiar({ institucion: valor ? Number(valor) : null, club: null })}
        />
      ) : null}
      <Selector
        etiqueta="Club"
        valor={filtros.club ? String(filtros.club) : ""}
        opciones={clubes}
        textoDeTodos="Todos"
        className="md:min-w-[16rem] md:flex-1"
        alCambiar={(valor) => cambiar({ club: valor ? Number(valor) : null })}
      />
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
      <BotonQuitarFiltros visible={hayFiltrosDeSesiones(filtros)} alPulsar={quitar} />
    </form>
  );
}
