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
  FILTROS_DE_CURSOS_VACIOS,
  MODALIDADES_DE_CURSO,
  NIVELES_DE_CURSO,
  NOMBRES_DE_MODALIDAD,
  NOMBRES_DE_NIVEL,
  hayFiltrosDeCursos,
  rutaDeCursos,
  type FiltrosCursos as Filtros,
  type ModalidadCurso,
  type NivelCurso,
} from "@/lib/portal/filtros-cursos";

type Props = {
  filtros: Filtros;
  instituciones: OpcionDeInstitucion[] | null;
};

const OPCIONES_DE_NIVEL = NIVELES_DE_CURSO.map((nivel) => ({
  valor: nivel,
  texto: NOMBRES_DE_NIVEL[nivel],
}));

const OPCIONES_DE_MODALIDAD = MODALIDADES_DE_CURSO.map((modalidad) => ({
  valor: modalidad,
  texto: NOMBRES_DE_MODALIDAD[modalidad],
}));

export function FiltrosCursos({ filtros, instituciones }: Props) {
  const { texto, alEscribir, cambiar, enviar, quitar } = useFiltrosEnUrl(
    filtros,
    rutaDeCursos,
    FILTROS_DE_CURSOS_VACIOS,
  );

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    enviar();
  }

  return (
    <form
      role="search"
      aria-label="Filtros de cursos"
      onSubmit={alEnviar}
      className="mt-6 flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end"
    >
      <CampoDeBusqueda
        etiqueta="Buscar por nombre"
        texto={texto}
        alEscribir={alEscribir}
        placeholder="Scratch, Arduino"
      />
      <Selector
        etiqueta="Nivel"
        valor={filtros.nivel ?? ""}
        opciones={OPCIONES_DE_NIVEL}
        textoDeTodos="Todos"
        className="md:w-44"
        alCambiar={(valor) => cambiar({ nivel: (valor || null) as NivelCurso | null })}
      />
      <Selector
        etiqueta="Modalidad"
        valor={filtros.modalidad ?? ""}
        opciones={OPCIONES_DE_MODALIDAD}
        textoDeTodos="Todas"
        className="md:w-44"
        alCambiar={(valor) => cambiar({ modalidad: (valor || null) as ModalidadCurso | null })}
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
        visible={hayFiltrosDeCursos(filtros) || texto.trim() !== ""}
        alPulsar={quitar}
      />
    </form>
  );
}
