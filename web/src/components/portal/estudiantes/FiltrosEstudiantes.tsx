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
  FILTROS_DE_ESTUDIANTES_VACIOS,
  OPCIONES_DE_CURSO_EDUCATIVO,
  OPCIONES_DE_ESTADO_DE_ESTUDIANTE,
  hayFiltrosDeEstudiantes,
  rutaDeEstudiantes,
  rutaDeHistorial,
  type CursoEducativo,
  type EstadoEstudiante,
  type FiltrosEstudiantes as Filtros,
} from "@/lib/portal/filtros-estudiantes";

type Destino = "estudiantes" | "historial";

type Props = {
  filtros: Filtros;
  instituciones: OpcionDeInstitucion[] | null;
  destino: Destino;
  soloCodigo: boolean;
};

const RUTAS: Record<Destino, (filtros: Filtros) => string> = {
  estudiantes: rutaDeEstudiantes,
  historial: rutaDeHistorial,
};

export function FiltrosEstudiantes({ filtros, instituciones, destino, soloCodigo }: Props) {
  const { texto, alEscribir, cambiar, enviar, quitar } = useFiltrosEnUrl(
    filtros,
    RUTAS[destino],
    FILTROS_DE_ESTUDIANTES_VACIOS,
  );

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    enviar();
  }

  return (
    <form
      role="search"
      aria-label={destino === "historial" ? "Filtros del historial" : "Filtros de estudiantes"}
      onSubmit={alEnviar}
      className="mt-6 flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end"
    >
      <CampoDeBusqueda
        etiqueta={soloCodigo ? "Buscar por código" : "Buscar por nombre o código"}
        texto={texto}
        alEscribir={alEscribir}
        placeholder={soloCodigo ? "Código interno" : "Apellido, nombre o código"}
      />
      <Selector
        etiqueta="Curso educativo"
        valor={filtros.curso ?? ""}
        opciones={OPCIONES_DE_CURSO_EDUCATIVO}
        textoDeTodos="Todos"
        className="md:w-44"
        alCambiar={(valor) => cambiar({ curso: (valor || null) as CursoEducativo | null })}
      />
      {destino === "historial" ? (
        <Selector
          etiqueta="Estado"
          valor={filtros.estado ?? ""}
          opciones={OPCIONES_DE_ESTADO_DE_ESTUDIANTE}
          textoDeTodos="Todos"
          className="md:w-40"
          alCambiar={(valor) => cambiar({ estado: (valor || null) as EstadoEstudiante | null })}
        />
      ) : null}
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
        visible={hayFiltrosDeEstudiantes(filtros) || texto.trim() !== ""}
        alPulsar={quitar}
      />
    </form>
  );
}
