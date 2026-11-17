import { CalendarClock } from "lucide-react";
import { PuntoDeEstado } from "@/components/portal/PuntoDeEstado";
import {
  NOMBRES_DE_ESTADO_DE_ACTIVIDAD,
  PUNTOS_DE_ESTADO_DE_ACTIVIDAD,
  type EstadoActividad,
} from "@/lib/portal/filtros-actividades";
import { fechaCorta, horaCorta } from "@/lib/portal/tiempo";

const DIA_DE_LA_SEMANA = new Intl.DateTimeFormat("es-EC", { weekday: "long", timeZone: "UTC" });

export function diaDe(fecha?: string): string {
  if (!fecha) {
    return "";
  }
  const nombre = DIA_DE_LA_SEMANA.format(new Date(`${fecha}T00:00:00Z`));
  return nombre.charAt(0).toUpperCase() + nombre.slice(1);
}

export function horarioDe(inicio?: string, fin?: string): string {
  return inicio && fin ? `${horaCorta(inicio)} a ${horaCorta(fin)}` : "";
}

export function EstadoDeActividad({
  estado,
  pendiente,
}: {
  estado?: EstadoActividad;
  pendiente?: boolean;
}) {
  if (!estado) {
    return <span className="text-tenue">—</span>;
  }
  if (pendiente) {
    return <PuntoDeEstado punto="bg-aviso">Por registrar</PuntoDeEstado>;
  }
  return (
    <PuntoDeEstado punto={PUNTOS_DE_ESTADO_DE_ACTIVIDAD[estado]}>
      {NOMBRES_DE_ESTADO_DE_ACTIVIDAD[estado]}
    </PuntoDeEstado>
  );
}

export function FechaDeSesion({
  fecha,
  inicio,
  fin,
  reprogramada = false,
}: {
  fecha?: string;
  inicio?: string;
  fin?: string;
  reprogramada?: boolean;
}) {
  return (
    <>
      <span className="block whitespace-nowrap">
        {diaDe(fecha)}, <span className="cifras">{fechaCorta(fecha)}</span>
      </span>
      <span className="cifras mt-0.5 flex items-center gap-1.5 whitespace-nowrap text-sm font-normal text-tenue">
        {horarioDe(inicio, fin)}
        {reprogramada ? (
          <span className="inline-flex items-center gap-1 text-aviso">
            <CalendarClock aria-hidden="true" size={14} />
            Reprogramada
          </span>
        ) : null}
      </span>
    </>
  );
}
