"use client";

import type { FormEvent } from "react";
import { BotonQuitarFiltros, Selector, SelectorDeFecha, useFiltrosEnUrl } from "@/components/portal/ControlesDeFiltro";
import type { OpcionDeFormulario } from "@/lib/portal/opciones";
import { FILTROS_DE_PERIODO_VACIOS, type FiltrosDePeriodo as Filtros } from "@/lib/portal/filtros-seguimiento";
import { rutaConConsulta } from "@/lib/portal/parametros";

type Props = {
  etiqueta: string;
  ruta: string;
  filtros: Filtros;
  periodos: OpcionDeFormulario[];
  instituciones: OpcionDeFormulario[] | null;
  conFechas: boolean;
};

export function FiltrosDePeriodo({ etiqueta, ruta, filtros, periodos, instituciones, conFechas }: Props) {
  const rutaDe = (siguientes: Filtros) =>
    rutaConConsulta(ruta, {
      periodo: siguientes.periodo,
      institucion: siguientes.institucion,
      desde: conFechas ? siguientes.desde : null,
      hasta: conFechas ? siguientes.hasta : null,
    });
  const { cambiar, enviar, quitar } = useFiltrosEnUrl(filtros, rutaDe, FILTROS_DE_PERIODO_VACIOS);
  const hayFiltros = Boolean(filtros.periodo || filtros.institucion || (conFechas && (filtros.desde || filtros.hasta)));

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    enviar();
  }

  return (
    <form
      role="search"
      aria-label={etiqueta}
      onSubmit={alEnviar}
      className="mt-6 flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end"
    >
      <Selector
        etiqueta="Período"
        valor={filtros.periodo ? String(filtros.periodo) : ""}
        opciones={periodos}
        textoDeTodos="Período vigente"
        className="md:w-64"
        alCambiar={(valor) => cambiar({ periodo: valor ? Number(valor) : null, desde: null, hasta: null })}
      />
      {instituciones ? (
        <Selector
          etiqueta="Institución"
          valor={filtros.institucion ? String(filtros.institucion) : ""}
          opciones={instituciones}
          textoDeTodos="Todas"
          className="md:w-64"
          alCambiar={(valor) => cambiar({ institucion: valor ? Number(valor) : null })}
        />
      ) : null}
      {conFechas ? (
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
      ) : null}
      <BotonQuitarFiltros visible={hayFiltros} alPulsar={quitar} />
    </form>
  );
}
