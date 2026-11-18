"use client";

import { X } from "lucide-react";
import type { FormEvent } from "react";
import {
  BotonQuitarFiltros,
  CampoDeBusqueda,
  Selector,
  SelectorDeFecha,
  useFiltrosEnUrl,
} from "@/components/portal/ControlesDeFiltro";
import {
  ENTIDADES_DE_AUDITORIA,
  FILTROS_DE_AUDITORIA_VACIOS,
  accionesDeEntidad,
  esEntidadDeAuditoria,
  hayFiltrosDeAuditoria,
  nombreDeEntidad,
  rutaDeAuditoria,
  type EntidadDeAuditoria,
  type FiltrosAuditoria as Filtros,
} from "@/lib/portal/filtros-auditoria";
import { hoyEnGuayaquil } from "@/lib/portal/tiempo";

type Props = {
  filtros: Filtros;
};

const OPCIONES_DE_ENTIDAD = Object.entries(ENTIDADES_DE_AUDITORIA)
  .map(([valor, texto]) => ({ valor, texto }))
  .sort((a, b) => a.texto.localeCompare(b.texto, "es"));

export function FiltrosAuditoria({ filtros }: Props) {
  const { texto, alEscribir, cambiar, enviar, quitar } = useFiltrosEnUrl(
    filtros,
    rutaDeAuditoria,
    FILTROS_DE_AUDITORIA_VACIOS,
  );
  const acciones = accionesDeEntidad(filtros.entidad);
  const opcionesDeAccion = acciones.map((accion) => ({
    valor: accion.codigo,
    texto:
      filtros.entidad || !accion.entidad
        ? accion.nombre
        : `${nombreDeEntidad(accion.entidad)} · ${accion.nombre}`,
  }));
  const accionVisible =
    filtros.accion && !acciones.some((accion) => accion.codigo === filtros.accion)
      ? [{ valor: filtros.accion, texto: filtros.accion }, ...opcionesDeAccion]
      : opcionesDeAccion;
  const hoy = hoyEnGuayaquil();

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    enviar();
  }

  function alElegirEntidad(valor: string) {
    const entidad: EntidadDeAuditoria | null = esEntidadDeAuditoria(valor) ? valor : null;
    const conservaAccion =
      !filtros.accion ||
      accionesDeEntidad(entidad).some((accion) => accion.codigo === filtros.accion);
    cambiar({
      entidad,
      registro: null,
      accion: conservaAccion ? filtros.accion : null,
    });
  }

  return (
    <form
      role="search"
      aria-label="Filtros de la auditoría"
      onSubmit={alEnviar}
      className="mt-6 flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end"
    >
      <CampoDeBusqueda
        etiqueta="Buscar por usuario"
        texto={texto}
        alEscribir={alEscribir}
        placeholder="Usuario o correo con el que entró"
      />
      <Selector
        etiqueta="Registro afectado"
        valor={filtros.entidad ?? ""}
        opciones={OPCIONES_DE_ENTIDAD}
        textoDeTodos="Todos"
        className="md:w-60"
        alCambiar={alElegirEntidad}
      />
      <Selector
        etiqueta="Acción"
        valor={filtros.accion ?? ""}
        opciones={accionVisible}
        textoDeTodos="Todas"
        className="md:w-72"
        alCambiar={(valor) => cambiar({ accion: valor || null })}
      />
      <SelectorDeFecha
        etiqueta="Desde"
        valor={filtros.desde ?? ""}
        maximo={filtros.hasta ?? hoy}
        alCambiar={(valor) => cambiar({ desde: valor })}
      />
      <SelectorDeFecha
        etiqueta="Hasta"
        valor={filtros.hasta ?? ""}
        minimo={filtros.desde ?? undefined}
        maximo={hoy}
        alCambiar={(valor) => cambiar({ hasta: valor })}
      />
      {filtros.entidad && filtros.registro ? (
        <button
          type="button"
          onClick={() => cambiar({ registro: null })}
          className="inline-flex h-11 shrink-0 select-none items-center gap-2 rounded-control bg-superficie px-3.5 text-[0.9375rem] font-medium transition-[transform,background-color] duration-150 ease-salida hover:bg-superficie-alta active:scale-[0.97]"
        >
          <span className="cifras">
            {nombreDeEntidad(filtros.entidad)} n.º {filtros.registro}
          </span>
          <X aria-hidden="true" size={16} className="text-tenue" />
          <span className="sr-only">Quitar el filtro de este registro</span>
        </button>
      ) : null}
      <BotonQuitarFiltros
        visible={hayFiltrosDeAuditoria(filtros) || texto.trim() !== ""}
        alPulsar={quitar}
      />
    </form>
  );
}
