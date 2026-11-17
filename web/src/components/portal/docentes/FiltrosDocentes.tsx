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
  ESTADOS_DE_DOCENTE,
  FILTROS_DE_DOCENTES_VACIOS,
  NOMBRES_DE_ESTADO_DE_DOCENTE,
  hayFiltrosDeDocentes,
  rutaDeDocentes,
  type EstadoDocente,
  type FiltrosDocentes as Filtros,
} from "@/lib/portal/filtros-docentes";

type Props = {
  filtros: Filtros;
  instituciones: OpcionDeInstitucion[] | null;
};

const OPCIONES_DE_ESTADO = ESTADOS_DE_DOCENTE.map((estado) => ({
  valor: estado,
  texto: NOMBRES_DE_ESTADO_DE_DOCENTE[estado],
}));

export function FiltrosDocentes({ filtros, instituciones }: Props) {
  const { texto, alEscribir, cambiar, enviar, quitar } = useFiltrosEnUrl(
    filtros,
    rutaDeDocentes,
    FILTROS_DE_DOCENTES_VACIOS,
  );

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    enviar();
  }

  return (
    <form
      role="search"
      aria-label="Filtros de docentes"
      onSubmit={alEnviar}
      className="mt-6 flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end"
    >
      <CampoDeBusqueda
        etiqueta="Buscar por nombre o correo"
        texto={texto}
        alEscribir={alEscribir}
        placeholder="Apellidos, nombres o correo"
      />
      <Selector
        etiqueta="Estado"
        valor={filtros.estado ?? ""}
        opciones={OPCIONES_DE_ESTADO}
        textoDeTodos="Todos"
        alCambiar={(valor) => cambiar({ estado: (valor || null) as EstadoDocente | null })}
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
        visible={hayFiltrosDeDocentes(filtros) || texto.trim() !== ""}
        alPulsar={quitar}
      />
    </form>
  );
}
