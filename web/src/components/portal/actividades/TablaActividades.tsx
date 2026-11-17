import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import type { Actividad } from "@/lib/api/actividades";
import { rutaDeActividad } from "@/lib/portal/filtros-actividades";
import { EstadoDeActividad, FechaDeSesion } from "./PiezasDeActividad";

type Props = {
  actividades: Actividad[];
  mostrarInstitucion: boolean;
};

const SIN_DATO = "—";
const CELDA = "px-5 py-3.5 align-top";
const ENCABEZADO = "px-5 py-3 text-left text-sm font-medium text-tenue";

function grupoDe(actividad: Actividad): string {
  return [actividad.clubNombre, actividad.cursoNombre].filter(Boolean).join(" · ") || SIN_DATO;
}

function Enlace({ actividad }: { actividad: Actividad }) {
  return (
    <EnlaceBoton
      href={rutaDeActividad(actividad.id ?? 0)}
      variante="elevado"
      tamano="compacto"
      className="whitespace-nowrap"
    >
      Ver sesión
      <span className="sr-only"> {actividad.tema}</span>
    </EnlaceBoton>
  );
}

function reprogramada(actividad: Actividad): boolean {
  return (actividad.reprogramaciones ?? 0) > 0;
}

export function TablaActividades({ actividades, mostrarInstitucion }: Props) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-pieza bg-superficie xl:block">
        <table className="w-full border-collapse text-[0.9375rem]">
          <caption className="sr-only">Lista de actividades y sesiones</caption>
          <thead>
            <tr className="border-b border-linea">
              <th scope="col" className={`${ENCABEZADO} w-[13rem]`}>
                Fecha y horario
              </th>
              <th scope="col" className={ENCABEZADO}>
                Tema
              </th>
              <th scope="col" className={`${ENCABEZADO} w-[18%]`}>
                Responsable
              </th>
              <th scope="col" className={ENCABEZADO}>
                Estado
              </th>
              <th scope="col" className={`${ENCABEZADO} text-right`}>
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {actividades.map((actividad) => (
              <tr key={actividad.id} className="border-b border-linea last:border-b-0">
                <td className={CELDA}>
                  <FechaDeSesion
                    fecha={actividad.fecha}
                    inicio={actividad.horaInicio}
                    fin={actividad.horaFin}
                    reprogramada={reprogramada(actividad)}
                  />
                </td>
                <th scope="row" className={`${CELDA} text-left font-medium`}>
                  <span className="block break-words">{actividad.tema}</span>
                  <span className="mt-0.5 block break-words text-sm font-normal text-tenue">
                    {grupoDe(actividad)}
                    {mostrarInstitucion && actividad.institucionNombre
                      ? ` · ${actividad.institucionNombre}`
                      : ""}
                  </span>
                </th>
                <td className={`${CELDA} break-words text-tenue`}>
                  {actividad.responsableNombre ?? SIN_DATO}
                </td>
                <td className={CELDA}>
                  <EstadoDeActividad
                    estado={actividad.estado}
                    pendiente={actividad.pendienteDeRegistro}
                  />
                </td>
                <td className="px-5 py-2.5 text-right align-top">
                  <Enlace actividad={actividad} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 xl:hidden">
        {actividades.map((actividad) => (
          <li key={actividad.id} className="rounded-pieza bg-superficie p-4">
            <div className="flex items-start justify-between gap-4">
              <p className="min-w-0 break-words font-medium">{actividad.tema}</p>
              <span className="shrink-0 text-sm">
                <EstadoDeActividad
                  estado={actividad.estado}
                  pendiente={actividad.pendienteDeRegistro}
                />
              </span>
            </div>
            <div className="mt-2 text-[0.9375rem]">
              <FechaDeSesion
                fecha={actividad.fecha}
                inicio={actividad.horaInicio}
                fin={actividad.horaFin}
                reprogramada={reprogramada(actividad)}
              />
            </div>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[0.9375rem]">
              <dt className="text-tenue">Club</dt>
              <dd className="min-w-0 break-words">{grupoDe(actividad)}</dd>
              {mostrarInstitucion ? (
                <>
                  <dt className="text-tenue">Institución</dt>
                  <dd className="min-w-0 break-words">{actividad.institucionNombre ?? SIN_DATO}</dd>
                </>
              ) : null}
              <dt className="text-tenue">Responsable</dt>
              <dd className="min-w-0 break-words">{actividad.responsableNombre ?? SIN_DATO}</dd>
            </dl>
            <div className="mt-4">
              <Enlace actividad={actividad} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
