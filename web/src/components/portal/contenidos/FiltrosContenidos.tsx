"use client";

import type { FormEvent } from "react";
import {
  BotonQuitarFiltros,
  CampoDeBusqueda,
  Selector,
  useFiltrosEnUrl,
} from "@/components/portal/ControlesDeFiltro";
import {
  NOMBRES_DE_TIPO_DE_CONTENIDO,
  TIPOS_DE_CONTENIDO,
  type TipoContenido,
} from "@/lib/portal/filtros-actividades";
import {
  ESTADOS_DE_CONTENIDO,
  FILTROS_DE_CONTENIDOS_VACIOS,
  NOMBRE_DE_ESTADO_DE_CONTENIDO,
  hayFiltrosDeContenidos,
  rutaDeContenidos,
  type EstadoContenido,
  type FiltrosContenidos as Filtros,
} from "@/lib/portal/filtros-contenidos";

type Props = {
  filtros: Filtros;
};

const OPCIONES_DE_TIPO = TIPOS_DE_CONTENIDO.map((tipo) => ({
  valor: tipo,
  texto: NOMBRES_DE_TIPO_DE_CONTENIDO[tipo],
}));

const OPCIONES_DE_ESTADO = ESTADOS_DE_CONTENIDO.map((estado) => ({
  valor: estado,
  texto: NOMBRE_DE_ESTADO_DE_CONTENIDO[estado],
}));

export function FiltrosContenidos({ filtros }: Props) {
  const { texto, alEscribir, cambiar, enviar, quitar } = useFiltrosEnUrl(
    filtros,
    rutaDeContenidos,
    FILTROS_DE_CONTENIDOS_VACIOS,
  );

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    enviar();
  }

  return (
    <form
      role="search"
      aria-label="Filtros del catálogo de contenidos"
      onSubmit={alEnviar}
      className="mt-6 flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end"
    >
      <CampoDeBusqueda
        etiqueta="Buscar por nombre"
        texto={texto}
        alEscribir={alEscribir}
        placeholder="Por ejemplo, Arduino o Python"
      />
      <Selector
        etiqueta="Tipo"
        valor={filtros.tipo ?? ""}
        opciones={OPCIONES_DE_TIPO}
        textoDeTodos="Todos"
        alCambiar={(valor) => cambiar({ tipo: (valor || null) as TipoContenido | null })}
      />
      <Selector
        etiqueta="Estado"
        valor={filtros.estado ?? ""}
        opciones={OPCIONES_DE_ESTADO}
        textoDeTodos="Todos"
        className="md:w-40"
        alCambiar={(valor) => cambiar({ estado: (valor || null) as EstadoContenido | null })}
      />
      <BotonQuitarFiltros
        visible={hayFiltrosDeContenidos(filtros) || texto.trim() !== ""}
        alPulsar={quitar}
      />
    </form>
  );
}
