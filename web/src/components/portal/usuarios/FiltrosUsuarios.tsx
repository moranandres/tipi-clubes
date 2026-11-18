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
  ESTADOS_DE_USUARIO,
  FILTROS_DE_USUARIOS_VACIOS,
  NOMBRE_DE_ESTADO_DE_USUARIO,
  NOMBRES_DE_ROL_DE_USUARIO,
  ROLES_DE_USUARIO,
  hayFiltrosDeUsuarios,
  rutaDeUsuarios,
  type EstadoUsuario,
  type FiltrosUsuarios as Filtros,
  type RolDeUsuario,
} from "@/lib/portal/filtros-usuarios";

type Props = {
  filtros: Filtros;
  instituciones: OpcionDeInstitucion[];
};

const OPCIONES_DE_ROL = ROLES_DE_USUARIO.map((rol) => ({
  valor: rol,
  texto: NOMBRES_DE_ROL_DE_USUARIO[rol],
}));

const OPCIONES_DE_ESTADO = ESTADOS_DE_USUARIO.map((estado) => ({
  valor: estado,
  texto: NOMBRE_DE_ESTADO_DE_USUARIO[estado],
}));

export function FiltrosUsuarios({ filtros, instituciones }: Props) {
  const { texto, alEscribir, cambiar, enviar, quitar } = useFiltrosEnUrl(
    filtros,
    rutaDeUsuarios,
    FILTROS_DE_USUARIOS_VACIOS,
  );

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    enviar();
  }

  return (
    <form
      role="search"
      aria-label="Filtros de usuarios"
      onSubmit={alEnviar}
      className="mt-6 flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end"
    >
      <CampoDeBusqueda
        etiqueta="Buscar por nombre, usuario o correo"
        texto={texto}
        alEscribir={alEscribir}
        placeholder="Apellidos, usuario o correo"
      />
      <Selector
        etiqueta="Rol"
        valor={filtros.rol ?? ""}
        opciones={OPCIONES_DE_ROL}
        textoDeTodos="Todos"
        className="md:w-56"
        alCambiar={(valor) => cambiar({ rol: (valor || null) as RolDeUsuario | null })}
      />
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
      <Selector
        etiqueta="Estado"
        valor={filtros.estado ?? ""}
        opciones={OPCIONES_DE_ESTADO}
        textoDeTodos="Todos"
        className="md:w-40"
        alCambiar={(valor) => cambiar({ estado: (valor || null) as EstadoUsuario | null })}
      />
      <BotonQuitarFiltros
        visible={hayFiltrosDeUsuarios(filtros) || texto.trim() !== ""}
        alPulsar={quitar}
      />
    </form>
  );
}
