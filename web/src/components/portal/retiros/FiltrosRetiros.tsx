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
  FILTROS_DE_RETIROS_VACIOS,
  hayFiltrosDeRetiros,
  rutaDeRetiros,
  type FiltrosRetiros as Filtros,
} from "@/lib/portal/filtros-retiros";

type Props = {
  filtros: Filtros;
  instituciones: OpcionDeInstitucion[] | null;
  soloCodigo: boolean;
};

export function FiltrosRetiros({ filtros, instituciones, soloCodigo }: Props) {
  const { texto, alEscribir, cambiar, enviar, quitar } = useFiltrosEnUrl(
    filtros,
    rutaDeRetiros,
    FILTROS_DE_RETIROS_VACIOS,
  );

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    enviar();
  }

  return (
    <form
      role="search"
      aria-label="Filtros de solicitudes de retiro"
      onSubmit={alEnviar}
      className="mt-6 flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end"
    >
      <CampoDeBusqueda
        etiqueta={soloCodigo ? "Buscar por código del estudiante" : "Buscar por estudiante"}
        texto={texto}
        alEscribir={alEscribir}
        placeholder={soloCodigo ? "Código interno" : "Apellido, nombre o código"}
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
          className="md:w-64"
          alCambiar={(valor) => cambiar({ institucion: valor ? Number(valor) : null })}
        />
      ) : null}
      <BotonQuitarFiltros
        visible={hayFiltrosDeRetiros(filtros) || texto.trim() !== ""}
        alPulsar={quitar}
      />
    </form>
  );
}
