import { ClipboardCheck, Images } from "lucide-react";
import { FechaDeSesion } from "@/components/portal/actividades/PiezasDeActividad";
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import type { Actividad } from "@/lib/api/actividades";
import { rutaDePlanilla } from "@/lib/portal/filtros-asistencia";
import { rutaDeEvidenciasDeSesion } from "@/lib/portal/filtros-evidencias";

type Props = {
  sesiones: Actividad[];
  destino: "asistencia" | "evidencias";
  gestiona: boolean;
  mostrarInstitucion: boolean;
};

function etiquetaDe(destino: Props["destino"], gestiona: boolean): string {
  if (destino === "asistencia") {
    return gestiona ? "Pasar asistencia" : "Ver asistencia";
  }
  return gestiona ? "Cargar evidencias" : "Ver evidencias";
}

export function ListaDeSesiones({ sesiones, destino, gestiona, mostrarInstitucion }: Props) {
  const Icono = destino === "asistencia" ? ClipboardCheck : Images;

  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {sesiones.map((sesion) => {
        const id = sesion.id ?? 0;
        return (
          <li key={id} className="flex min-w-0 flex-col rounded-pieza bg-superficie p-4">
            <p className="break-words font-medium">{sesion.tema}</p>
            <div className="mt-1.5 text-[0.9375rem]">
              <FechaDeSesion fecha={sesion.fecha} inicio={sesion.horaInicio} fin={sesion.horaFin} />
            </div>
            <p className="mt-2 break-words text-[0.9375rem] text-tenue">
              {[sesion.clubNombre, sesion.cursoNombre, mostrarInstitucion ? sesion.institucionNombre : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <div className="mt-auto pt-4">
              <EnlaceBoton
                href={destino === "asistencia" ? rutaDePlanilla(id) : rutaDeEvidenciasDeSesion(id)}
                variante="elevado"
                tamano="compacto"
              >
                <Icono aria-hidden="true" size={16} />
                {etiquetaDe(destino, gestiona)}
                <span className="sr-only"> de la sesión {sesion.tema}</span>
              </EnlaceBoton>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
