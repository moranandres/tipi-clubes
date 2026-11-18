"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import type { DetalleLegible } from "@/lib/portal/filtros-auditoria";

export type EventoVisible = {
  id: number;
  momento: string;
  identificador: string;
  usuarioId: number | null;
  ip: string | null;
  accion: string;
  codigoDeAccion: string;
  entidad: string | null;
  entidadId: number | null;
  enlace: string | null;
  detalle: DetalleLegible;
};

type Props = {
  eventos: EventoVisible[];
};

const COLUMNAS = "md:grid md:grid-cols-[9.5rem_minmax(0,0.9fr)_minmax(0,1.4fr)_auto] md:items-start md:gap-5";

function Registro({ evento }: { evento: EventoVisible }) {
  if (!evento.entidad) {
    return null;
  }
  const texto = evento.entidadId ? `${evento.entidad} n.º ${evento.entidadId}` : evento.entidad;
  return evento.enlace ? (
    <Link href={evento.enlace} className="cifras font-medium text-acento">
      {texto}
    </Link>
  ) : (
    <span className="cifras">{texto}</span>
  );
}

function DetalleDelEvento({ detalle }: { detalle: DetalleLegible }) {
  if (detalle.tipo === "vacio") {
    return <p className="text-tenue">El registro no guarda más detalles.</p>;
  }
  if (detalle.tipo === "texto") {
    return <p className="whitespace-pre-line break-words">{detalle.texto}</p>;
  }
  if (detalle.tipo === "datos") {
    return (
      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {detalle.datos.map((dato, indice) => (
          <div key={`${dato.campo}-${indice}`} className="min-w-0">
            <dt className="text-sm text-tenue">{dato.campo}</dt>
            <dd className="mt-0.5 break-words">{dato.valor}</dd>
          </div>
        ))}
      </dl>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[0.9375rem]">
        <caption className="sr-only">Campos modificados</caption>
        <thead>
          <tr className="border-b border-linea text-left text-sm text-tenue">
            <th scope="col" className="py-2 pr-4 font-medium">
              Campo
            </th>
            <th scope="col" className="py-2 pr-4 font-medium">
              Antes
            </th>
            <th scope="col" className="py-2 font-medium">
              Después
            </th>
          </tr>
        </thead>
        <tbody>
          {detalle.cambios.map((cambio, indice) => (
            <tr key={`${cambio.campo}-${indice}`} className="border-b border-linea last:border-b-0">
              <th scope="row" className="py-2 pr-4 text-left align-top font-medium">
                {cambio.campo}
              </th>
              <td className="min-w-[8rem] break-words py-2 pr-4 align-top text-tenue">
                {cambio.antes}
              </td>
              <td className="min-w-[8rem] break-words py-2 align-top">{cambio.despues}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Evento({ evento }: { evento: EventoVisible }) {
  const idDetalle = useId();
  const [abierto, setAbierto] = useState(false);

  return (
    <li className="rounded-pieza bg-superficie p-4 md:rounded-none md:border-b md:border-linea md:bg-transparent md:px-5 md:py-3.5 md:last:border-b-0">
      <div className={COLUMNAS}>
        <p className="cifras text-sm text-tenue md:pt-0.5">{evento.momento}</p>
        <div className="mt-2 min-w-0 md:mt-0">
          <p className="break-all font-medium">{evento.identificador}</p>
          {evento.ip ? <p className="cifras mt-0.5 text-sm text-tenue">IP {evento.ip}</p> : null}
        </div>
        <div className="mt-2 min-w-0 md:mt-0">
          <p className="break-words">{evento.accion}</p>
          <p className="mt-0.5 text-sm text-tenue">
            <Registro evento={evento} />
          </p>
        </div>
        <button
          type="button"
          aria-expanded={abierto}
          aria-controls={idDetalle}
          onClick={() => setAbierto((previo) => !previo)}
          className="mt-3 inline-flex h-9 select-none items-center justify-center gap-1.5 rounded-control md:w-[9.5rem] bg-superficie-alta px-3 text-sm font-medium transition-[transform,background-color] duration-150 ease-salida hover:bg-linea active:scale-[0.97] md:mt-0"
        >
          {abierto ? "Ocultar detalle" : "Ver detalle"}
          <ChevronDown
            aria-hidden="true"
            size={16}
            className={`transition-transform duration-150 ease-salida motion-reduce:transition-none ${abierto ? "rotate-180" : ""}`}
          />
          <span className="sr-only"> del evento n.º {evento.id}</span>
        </button>
      </div>
      <div
        id={idDetalle}
        hidden={!abierto}
        className="entrada-mensaje mt-4 rounded-control border border-linea p-4 md:ml-[10.75rem]"
      >
        <DetalleDelEvento detalle={evento.detalle} />
        <p className="cifras mt-3 text-xs text-tenue">
          Evento n.º {evento.id} · {evento.codigoDeAccion}
          {evento.usuarioId ? ` · cuenta n.º ${evento.usuarioId}` : ""}
        </p>
      </div>
    </li>
  );
}

export function ListaDeEventos({ eventos }: Props) {
  return (
    <div className="md:rounded-pieza md:bg-superficie">
      <div
        aria-hidden="true"
        className={`hidden border-b border-linea px-5 py-3 text-sm font-medium text-tenue ${COLUMNAS}`}
      >
        <span>Fecha y hora</span>
        <span>Usuario</span>
        <span>Acción y registro</span>
        <span className="w-[9.5rem]" />
      </div>
      <ul aria-label="Eventos de la auditoría" className="flex flex-col gap-3 md:gap-0">
        {eventos.map((evento) => (
          <Evento key={evento.id} evento={evento} />
        ))}
      </ul>
    </div>
  );
}
