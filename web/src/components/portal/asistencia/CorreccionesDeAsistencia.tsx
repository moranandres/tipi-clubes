import type { Correccion } from "@/lib/api/asistencia";
import { NOMBRES_DE_ESTADO_DE_ASISTENCIA } from "@/lib/portal/filtros-asistencia";
import { identidadDe } from "@/lib/portal/identidad";
import { momentoCorto } from "@/lib/portal/tiempo";

type Props = {
  correcciones: Correccion[];
  minima: boolean;
};

function cambioDeEstado(correccion: Correccion): string {
  const anterior = correccion.estadoAnterior
    ? NOMBRES_DE_ESTADO_DE_ASISTENCIA[correccion.estadoAnterior]
    : "Sin estado";
  const nuevo = correccion.estadoNuevo ? NOMBRES_DE_ESTADO_DE_ASISTENCIA[correccion.estadoNuevo] : "Sin estado";
  return anterior === nuevo ? `${nuevo} (cambió la observación)` : `${anterior} → ${nuevo}`;
}

export function CorreccionesDeAsistencia({ correcciones, minima }: Props) {
  return (
    <section aria-labelledby="correcciones-de-asistencia">
      <h2 id="correcciones-de-asistencia" className="text-lg font-medium">
        Historial de correcciones
      </h2>
      <ol className="mt-4 flex flex-col gap-3">
        {correcciones.map((correccion) => {
          const identidad = identidadDe(
            {
              nombres: correccion.estudianteNombres,
              apellidos: correccion.estudianteApellidos,
              codigo: correccion.estudianteCodigo,
            },
            minima,
          );
          return (
            <li key={correccion.id} className="rounded-pieza bg-superficie p-4 text-[0.9375rem]">
              <p className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className={`min-w-0 break-words font-medium ${identidad.codigo ? "" : "cifras"}`}>
                  {identidad.principal}
                </span>
                <span className="text-sm">{cambioDeEstado(correccion)}</span>
              </p>
              <p className="mt-1.5 break-words">{correccion.motivo}</p>
              <p className="cifras mt-1 text-sm text-tenue">
                {[momentoCorto(correccion.fecha), correccion.corregidoPorNombre ? `por ${correccion.corregidoPorNombre}` : null]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
