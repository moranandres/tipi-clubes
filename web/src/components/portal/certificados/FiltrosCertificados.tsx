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
  FILTROS_DE_CERTIFICADOS_VACIOS,
  OPCIONES_DE_TIPO_DE_CERTIFICADO,
  hayFiltrosDeCertificados,
  rutaDeCertificados,
  type FiltrosCertificados as Filtros,
  type TipoCertificado,
} from "@/lib/portal/filtros-certificados";
import type { OpcionDeFormulario } from "@/lib/portal/opciones";

type Props = {
  filtros: Filtros;
  instituciones: OpcionDeFormulario[] | null;
  clubes: OpcionDeFormulario[];
  minima: boolean;
};

export function FiltrosCertificados({ filtros, instituciones, clubes, minima }: Props) {
  const { texto, alEscribir, cambiar, enviar, quitar } = useFiltrosEnUrl(
    filtros,
    rutaDeCertificados,
    FILTROS_DE_CERTIFICADOS_VACIOS,
  );

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    enviar();
  }

  return (
    <form
      role="search"
      aria-label="Filtros de certificados"
      onSubmit={alEnviar}
      className="mt-6 flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end"
    >
      <CampoDeBusqueda
        etiqueta="Buscar"
        texto={texto}
        alEscribir={alEscribir}
        placeholder={minima ? "Código del estudiante o de verificación" : "Estudiante, título o código TIPI"}
      />
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
        className="md:w-52"
        alCambiar={(valor) => cambiar({ club: valor ? Number(valor) : null })}
      />
      <Selector
        etiqueta="Tipo"
        valor={filtros.tipo ?? ""}
        opciones={OPCIONES_DE_TIPO_DE_CERTIFICADO}
        textoDeTodos="Todos"
        className="md:w-60"
        alCambiar={(valor) => cambiar({ tipo: valor ? (valor as TipoCertificado) : null })}
      />
      <div className="grid grid-cols-2 gap-3 md:contents">
        <SelectorDeFecha
          etiqueta="Emitidos desde"
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
      <BotonQuitarFiltros visible={hayFiltrosDeCertificados(filtros)} alPulsar={quitar} />
    </form>
  );
}
