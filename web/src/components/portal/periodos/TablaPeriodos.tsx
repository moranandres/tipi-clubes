import { PuntoDeEstado } from "@/components/portal/PuntoDeEstado";
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import type { Periodo } from "@/lib/api/clubes";
import { PUNTO_NO_VIGENTE, PUNTO_VIGENTE, RUTA_PERIODOS } from "@/lib/portal/reglas-periodos";
import { fechaCorta } from "@/lib/portal/tiempo";

type Props = {
  periodos: Periodo[];
  gestionable: boolean;
};

const CELDA = "px-5 py-3.5 align-top";
const ENCABEZADO = "px-5 py-3 text-left text-sm font-medium text-tenue";

function Vigencia({ periodo }: { periodo: Periodo }) {
  return periodo.activo ? (
    <PuntoDeEstado punto={PUNTO_VIGENTE}>Vigente</PuntoDeEstado>
  ) : (
    <PuntoDeEstado punto={PUNTO_NO_VIGENTE}>No vigente</PuntoDeEstado>
  );
}

function EnlaceGestionar({ periodo }: { periodo: Periodo }) {
  return (
    <EnlaceBoton href={`${RUTA_PERIODOS}/${periodo.id}`} variante="elevado" tamano="compacto">
      Gestionar
      <span className="sr-only"> el período {periodo.nombre}</span>
    </EnlaceBoton>
  );
}

export function TablaPeriodos({ periodos, gestionable }: Props) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-pieza bg-superficie md:block">
        <table className="w-full border-collapse text-[0.9375rem]">
          <caption className="sr-only">Lista de períodos académicos</caption>
          <thead>
            <tr className="border-b border-linea">
              <th scope="col" className={`${ENCABEZADO} w-[36%]`}>
                Período
              </th>
              <th scope="col" className={ENCABEZADO}>
                Inicio
              </th>
              <th scope="col" className={ENCABEZADO}>
                Fin
              </th>
              <th scope="col" className={ENCABEZADO}>
                Vigencia
              </th>
              {gestionable ? (
                <th scope="col" className={`${ENCABEZADO} text-right`}>
                  Acciones
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {periodos.map((periodo) => (
              <tr key={periodo.id} className="border-b border-linea last:border-b-0">
                <th scope="row" className={`${CELDA} break-words text-left font-medium`}>
                  {periodo.nombre}
                </th>
                <td className={`${CELDA} cifras whitespace-nowrap`}>
                  {fechaCorta(periodo.fechaInicio)}
                </td>
                <td className={`${CELDA} cifras whitespace-nowrap`}>
                  {fechaCorta(periodo.fechaFin)}
                </td>
                <td className={CELDA}>
                  <Vigencia periodo={periodo} />
                </td>
                {gestionable ? (
                  <td className="px-5 py-2.5 text-right align-top">
                    <EnlaceGestionar periodo={periodo} />
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 md:hidden">
        {periodos.map((periodo) => (
          <li key={periodo.id} className="rounded-pieza bg-superficie p-4">
            <div className="flex items-start justify-between gap-4">
              <p className="min-w-0 break-words font-medium">{periodo.nombre}</p>
              <span className="shrink-0 text-sm">
                <Vigencia periodo={periodo} />
              </span>
            </div>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[0.9375rem]">
              <dt className="text-tenue">Inicio</dt>
              <dd className="cifras">{fechaCorta(periodo.fechaInicio)}</dd>
              <dt className="text-tenue">Fin</dt>
              <dd className="cifras">{fechaCorta(periodo.fechaFin)}</dd>
            </dl>
            {gestionable ? (
              <div className="mt-4">
                <EnlaceGestionar periodo={periodo} />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </>
  );
}
