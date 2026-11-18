"use client";

import type { FormEvent } from "react";
import {
  BotonQuitarFiltros,
  CampoDeBusqueda,
  Selector,
  useFiltrosEnUrl,
} from "@/components/portal/ControlesDeFiltro";
import type { OpcionDeFormulario } from "@/lib/portal/opciones";
import {
  FILTROS_DEL_CATALOGO_VACIOS,
  NOMBRES_DE_CUPO,
  NOMBRES_DE_INSCRIPCION,
  OPCIONES_DE_CUPO,
  OPCIONES_DE_INSCRIPCION,
  hayFiltrosDelCatalogo,
  rutaDelCatalogo,
  type FiltrosCatalogo as Filtros,
  type OpcionDeCupo,
  type OpcionDeInscripcion,
} from "@/lib/portal/filtros-catalogo";
import { ESTADOS_DE_CLUB, NOMBRES_DE_ESTADO, type EstadoClub } from "@/lib/portal/filtros-clubes";
import {
  MODALIDADES_DE_CURSO,
  NIVELES_DE_CURSO,
  NOMBRES_DE_MODALIDAD,
  NOMBRES_DE_NIVEL,
  type ModalidadCurso,
  type NivelCurso,
} from "@/lib/portal/filtros-cursos";

type Props = {
  filtros: Filtros;
  instituciones: OpcionDeFormulario[];
  periodos: OpcionDeFormulario[];
};

function opciones<T extends string>(valores: readonly T[], nombres: Record<T, string>) {
  return valores.map((valor) => ({ valor, texto: nombres[valor] }));
}

const OPCIONES_DE_ESTADO = opciones(ESTADOS_DE_CLUB, NOMBRES_DE_ESTADO);
const OPCIONES_DE_INSCRIPCIONES = opciones(OPCIONES_DE_INSCRIPCION, NOMBRES_DE_INSCRIPCION);
const OPCIONES_DE_CUPOS = opciones(OPCIONES_DE_CUPO, NOMBRES_DE_CUPO);
const OPCIONES_DE_NIVEL = opciones(NIVELES_DE_CURSO, NOMBRES_DE_NIVEL);
const OPCIONES_DE_MODALIDAD = opciones(MODALIDADES_DE_CURSO, NOMBRES_DE_MODALIDAD);

export function FiltrosCatalogo({ filtros, instituciones, periodos }: Props) {
  const { texto, alEscribir, cambiar, enviar, quitar } = useFiltrosEnUrl(
    filtros,
    rutaDelCatalogo,
    FILTROS_DEL_CATALOGO_VACIOS,
  );

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    enviar();
  }

  return (
    <form
      role="search"
      aria-label="Filtros del catálogo de clubes"
      onSubmit={alEnviar}
      className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <div className="sm:col-span-2">
        <CampoDeBusqueda
          etiqueta="Buscar club o institución"
          texto={texto}
          alEscribir={alEscribir}
          placeholder="Nombre del club, institución o código AMIE"
        />
      </div>
      <Selector
        etiqueta="Institución"
        valor={filtros.institucion ? String(filtros.institucion) : ""}
        opciones={instituciones}
        textoDeTodos="Todas"
        className="min-w-0"
        alCambiar={(valor) => cambiar({ institucion: valor ? Number(valor) : null })}
      />
      <Selector
        etiqueta="Período"
        valor={filtros.periodo ? String(filtros.periodo) : ""}
        opciones={periodos}
        textoDeTodos="Todos"
        className="min-w-0"
        alCambiar={(valor) => cambiar({ periodo: valor ? Number(valor) : null })}
      />
      <Selector
        etiqueta="Estado del club"
        valor={filtros.estado ?? ""}
        opciones={OPCIONES_DE_ESTADO}
        textoDeTodos="Todos"
        className="min-w-0"
        alCambiar={(valor) => cambiar({ estado: (valor || null) as EstadoClub | null })}
      />
      <Selector
        etiqueta="Inscripciones"
        valor={filtros.inscripciones ?? ""}
        opciones={OPCIONES_DE_INSCRIPCIONES}
        textoDeTodos="Todas"
        className="min-w-0"
        alCambiar={(valor) =>
          cambiar({ inscripciones: (valor || null) as OpcionDeInscripcion | null })
        }
      />
      <Selector
        etiqueta="Cupos"
        valor={filtros.cupo ?? ""}
        opciones={OPCIONES_DE_CUPOS}
        textoDeTodos="Todos"
        className="min-w-0"
        alCambiar={(valor) => cambiar({ cupo: (valor || null) as OpcionDeCupo | null })}
      />
      <Selector
        etiqueta="Nivel de curso abierto"
        valor={filtros.nivel ?? ""}
        opciones={OPCIONES_DE_NIVEL}
        textoDeTodos="Todos"
        className="min-w-0"
        alCambiar={(valor) => cambiar({ nivel: (valor || null) as NivelCurso | null })}
      />
      <Selector
        etiqueta="Modalidad"
        valor={filtros.modalidad ?? ""}
        opciones={OPCIONES_DE_MODALIDAD}
        textoDeTodos="Todas"
        className="min-w-0"
        alCambiar={(valor) => cambiar({ modalidad: (valor || null) as ModalidadCurso | null })}
      />
      <div className="flex items-end sm:col-span-2 lg:col-span-1">
        <BotonQuitarFiltros
          visible={hayFiltrosDelCatalogo(filtros) || texto.trim() !== ""}
          alPulsar={quitar}
        />
      </div>
    </form>
  );
}
