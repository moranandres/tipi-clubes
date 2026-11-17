import { ClipboardCheck, Images } from "lucide-react";
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import { rutaDePlanilla } from "@/lib/portal/filtros-asistencia";
import { rutaDeEvidenciasDeSesion } from "@/lib/portal/filtros-evidencias";
import { fechaCorta } from "@/lib/portal/tiempo";

type Props = {
  actividadId: number;
  estado?: string;
  fecha?: string;
  gestiona: boolean;
};

const ESTADO_EJECUTADA = "EJECUTADA";
const ESTADO_CANCELADA = "CANCELADA";

function explicacion(estado: string | undefined, fecha: string | undefined, gestiona: boolean): string {
  if (estado === ESTADO_EJECUTADA) {
    return gestiona
      ? "Pasa lista a los integrantes y adjunta fotos, informes o productos de esta sesión."
      : "Consulta la asistencia registrada y las evidencias de esta sesión.";
  }
  if (estado === ESTADO_CANCELADA) {
    return "La sesión se canceló: no lleva asistencia ni evidencias.";
  }
  return `Se habilitan cuando se registre la ejecución de la sesión${fecha ? `, a partir del ${fechaCorta(fecha)}` : ""}.`;
}

export function AccesosDeSesion({ actividadId, estado, fecha, gestiona }: Props) {
  const habilitado = estado === ESTADO_EJECUTADA;

  return (
    <section aria-labelledby="accesos-de-sesion" className="rounded-pieza border border-linea p-5">
      <h2 id="accesos-de-sesion" className="text-lg font-medium">
        Asistencia y evidencias
      </h2>
      <p className="mt-2 text-[0.9375rem] text-tenue">{explicacion(estado, fecha, gestiona)}</p>
      {habilitado ? (
        <div className="mt-4 flex flex-col gap-2">
          <EnlaceBoton href={rutaDePlanilla(actividadId)} className="w-full">
            <ClipboardCheck aria-hidden="true" size={16} />
            {gestiona ? "Pasar asistencia" : "Ver asistencia"}
          </EnlaceBoton>
          <EnlaceBoton href={rutaDeEvidenciasDeSesion(actividadId)} variante="secundario" className="w-full">
            <Images aria-hidden="true" size={16} />
            {gestiona ? "Cargar evidencias" : "Ver evidencias"}
          </EnlaceBoton>
        </div>
      ) : null}
    </section>
  );
}
