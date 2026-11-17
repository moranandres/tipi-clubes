"use client";

import type { FormEvent } from "react";
import {
  BotonQuitarFiltros,
  Selector,
  SelectorDeFecha,
  useFiltrosEnUrl,
} from "@/components/portal/ControlesDeFiltro";
import {
  FILTROS_DE_EVIDENCIAS_VACIOS,
  hayFiltrosDeEvidencias,
  rutaDeEvidencias,
  type EstadoEvidencia,
  type FiltrosEvidencias as Filtros,
} from "@/lib/portal/filtros-evidencias";
import type { OpcionDeFormulario } from "@/lib/portal/opciones";

type Props = {
  filtros: Filtros;
  instituciones: OpcionDeFormulario[] | null;
  clubes: OpcionDeFormulario[];
};

const OPCIONES_DE_ESTADO = [{ valor: "RETIRADA", texto: "Retiradas" }];

export function FiltrosEvidencias({ filtros, instituciones, clubes }: Props) {
  const { cambiar, enviar, quitar } = useFiltrosEnUrl(
    filtros,
    rutaDeEvidencias,
    FILTROS_DE_EVIDENCIAS_VACIOS,
  );

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    enviar();
  }

  return (
    <form
      role="search"
      aria-label="Filtros de evidencias"
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
        valor={filtros.estado === "RETIRADA" ? "RETIRADA" : ""}
        opciones={OPCIONES_DE_ESTADO}
        textoDeTodos="Activas"
        className="md:w-40"
        alCambiar={(valor) => cambiar({ estado: valor ? (valor as EstadoEvidencia) : null })}
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
      <BotonQuitarFiltros visible={hayFiltrosDeEvidencias(filtros)} alPulsar={quitar} />
    </form>
  );
}
