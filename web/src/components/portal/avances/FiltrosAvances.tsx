"use client";

import type { FormEvent } from "react";
import {
  BotonQuitarFiltros,
  Selector,
  SelectorDeFecha,
  useFiltrosEnUrl,
} from "@/components/portal/ControlesDeFiltro";
import {
  FILTROS_DE_AVANCES_VACIOS,
  hayFiltrosDeAvances,
  rutaDeAvances,
  type EstadoAvance,
  type FiltrosAvances as Filtros,
} from "@/lib/portal/filtros-avances";
import type { OpcionDeFormulario } from "@/lib/portal/opciones";

type Props = {
  filtros: Filtros;
  instituciones: OpcionDeFormulario[] | null;
  clubes: OpcionDeFormulario[];
};

const OPCIONES_DE_ESTADO = [{ valor: "ANULADO", texto: "Anulados" }];

export function FiltrosAvances({ filtros, instituciones, clubes }: Props) {
  const { cambiar, enviar, quitar } = useFiltrosEnUrl(filtros, rutaDeAvances, FILTROS_DE_AVANCES_VACIOS);

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    enviar();
  }

  return (
    <form
      role="search"
      aria-label="Filtros de avances"
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
          alCambiar={(valor) => cambiar({ institucion: valor ? Number(valor) : null, club: null })}
        />
      ) : null}
      <Selector
        etiqueta="Club"
        valor={filtros.club ? String(filtros.club) : ""}
        opciones={clubes}
        textoDeTodos="Todos"
        className="md:min-w-[14rem] md:flex-1"
        alCambiar={(valor) => cambiar({ club: valor ? Number(valor) : null })}
      />
      <Selector
        etiqueta="Estado"
        valor={filtros.estado === "ANULADO" ? "ANULADO" : ""}
        opciones={OPCIONES_DE_ESTADO}
        textoDeTodos="Vigentes"
        className="md:w-40"
        alCambiar={(valor) => cambiar({ estado: valor ? (valor as EstadoAvance) : null })}
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
      <BotonQuitarFiltros visible={hayFiltrosDeAvances(filtros)} alPulsar={quitar} />
    </form>
  );
}
