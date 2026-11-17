import { PuntoDeEstado } from "@/components/portal/PuntoDeEstado";
import {
  NOMBRES_DE_ESTADO_DE_ASISTENCIA,
  PUNTOS_DE_ESTADO_DE_ASISTENCIA,
} from "@/lib/portal/filtros-asistencia";
import { contarEstados } from "@/lib/portal/reglas-asistencia";
import { ConteoDePlanilla } from "./ConteoDePlanilla";
import type { FilaVisible } from "./PlanillaDeAsistencia";

type Props = {
  filas: FilaVisible[];
};

export function PlanillaDeConsulta({ filas }: Props) {
  return (
    <>
      <ConteoDePlanilla conteo={contarEstados(filas)} textoPendientes="Sin registrar" />
      <ul className="mt-6 flex flex-col gap-3" aria-label="Asistencia de los integrantes">
        {filas.map((fila) => (
          <li key={fila.estudianteId} className="rounded-pieza bg-superficie p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className={`break-words font-medium ${fila.codigo ? "" : "cifras"}`}>
                  {fila.principal}
                </p>
                {fila.codigo ? (
                  <p className="cifras mt-0.5 text-sm text-tenue">{fila.codigo}</p>
                ) : null}
              </div>
              <span className="shrink-0 text-sm">
                {fila.estado ? (
                  <PuntoDeEstado punto={PUNTOS_DE_ESTADO_DE_ASISTENCIA[fila.estado]}>
                    {NOMBRES_DE_ESTADO_DE_ASISTENCIA[fila.estado]}
                  </PuntoDeEstado>
                ) : (
                  <PuntoDeEstado punto="bg-tenue">Sin registrar</PuntoDeEstado>
                )}
              </span>
            </div>
            {fila.observacion ? (
              <p className="mt-2 break-words text-[0.9375rem] text-tenue">{fila.observacion}</p>
            ) : null}
            {fila.corregida ? <p className="mt-1 text-sm text-tenue">Registro corregido</p> : null}
          </li>
        ))}
      </ul>
    </>
  );
}
