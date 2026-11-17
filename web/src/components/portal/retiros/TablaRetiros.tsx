import { PuntoDeEstado } from "@/components/portal/PuntoDeEstado";
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import type { Retiro } from "@/lib/api/retiros";
import {
  NOMBRES_DE_ESTADO_DE_RETIRO,
  PUNTOS_DE_ESTADO_DE_RETIRO,
  RUTA_RETIROS,
} from "@/lib/portal/filtros-retiros";
import { identidadDe } from "@/lib/portal/identidad";
import { momentoCorto } from "@/lib/portal/tiempo";

type Props = {
  retiros: Retiro[];
  mostrarInstitucion: boolean;
  minima: boolean;
};

const SIN_DATO = "—";
const CELDA = "px-5 py-3.5 align-top";
const ENCABEZADO = "px-5 py-3 text-left text-sm font-medium text-tenue";

function identidadDeRetiro(retiro: Retiro, minima: boolean) {
  return identidadDe(
    {
      nombres: retiro.estudianteNombres,
      apellidos: retiro.estudianteApellidos,
      codigo: retiro.estudianteCodigo,
    },
    minima,
  );
}

function Estudiante({ retiro, minima }: { retiro: Retiro; minima: boolean }) {
  const identidad = identidadDeRetiro(retiro, minima);
  return (
    <>
      <span className={`block break-words ${identidad.codigo ? "" : "cifras"}`}>
        {identidad.principal}
      </span>
      {identidad.codigo ? (
        <span className="cifras mt-0.5 block text-sm font-normal text-tenue">{identidad.codigo}</span>
      ) : null}
    </>
  );
}

function Estado({ retiro }: { retiro: Retiro }) {
  return retiro.estado ? (
    <PuntoDeEstado punto={PUNTOS_DE_ESTADO_DE_RETIRO[retiro.estado]}>
      {NOMBRES_DE_ESTADO_DE_RETIRO[retiro.estado]}
    </PuntoDeEstado>
  ) : (
    <span className="text-tenue">{SIN_DATO}</span>
  );
}

function Enlace({ retiro, minima }: { retiro: Retiro; minima: boolean }) {
  return (
    <EnlaceBoton href={`${RUTA_RETIROS}/${retiro.id}`} variante="elevado" tamano="compacto" className="whitespace-nowrap">
      Ver retiro
      <span className="sr-only"> de {identidadDeRetiro(retiro, minima).principal}</span>
    </EnlaceBoton>
  );
}

export function TablaRetiros({ retiros, mostrarInstitucion, minima }: Props) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-pieza bg-superficie xl:block">
        <table className="w-full border-collapse text-[0.9375rem]">
          <caption className="sr-only">Lista de solicitudes de retiro</caption>
          <thead>
            <tr className="border-b border-linea">
              <th scope="col" className={`${ENCABEZADO} w-[28%]`}>
                Estudiante
              </th>
              <th scope="col" className={ENCABEZADO}>
                Club
              </th>
              {mostrarInstitucion ? (
                <th scope="col" className={`${ENCABEZADO} w-[20%]`}>
                  Institución
                </th>
              ) : null}
              <th scope="col" className={ENCABEZADO}>
                Estado
              </th>
              <th scope="col" className={`${ENCABEZADO} text-right`}>
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {retiros.map((retiro) => (
              <tr key={retiro.id} className="border-b border-linea last:border-b-0">
                <th scope="row" className={`${CELDA} text-left font-medium`}>
                  <Estudiante retiro={retiro} minima={minima} />
                </th>
                <td className={`${CELDA} break-words`}>{retiro.clubNombre ?? SIN_DATO}</td>
                {mostrarInstitucion ? (
                  <td className={`${CELDA} break-words text-tenue`}>
                    {retiro.institucionNombre ?? SIN_DATO}
                  </td>
                ) : null}
                <td className={CELDA}>
                  <Estado retiro={retiro} />
                  <span className="cifras mt-0.5 block whitespace-nowrap text-sm text-tenue">
                    {momentoCorto(retiro.fechaSolicitud)}
                  </span>
                </td>
                <td className="px-5 py-2.5 text-right align-top">
                  <Enlace retiro={retiro} minima={minima} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 xl:hidden">
        {retiros.map((retiro) => (
          <li key={retiro.id} className="rounded-pieza bg-superficie p-4">
            <div className="flex items-start justify-between gap-4">
              <p className="min-w-0 font-medium">
                <Estudiante retiro={retiro} minima={minima} />
              </p>
              <span className="shrink-0 text-sm">
                <Estado retiro={retiro} />
              </span>
            </div>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[0.9375rem]">
              <dt className="text-tenue">Club</dt>
              <dd className="min-w-0 break-words">{retiro.clubNombre ?? SIN_DATO}</dd>
              {mostrarInstitucion ? (
                <>
                  <dt className="text-tenue">Institución</dt>
                  <dd className="min-w-0 break-words">{retiro.institucionNombre ?? SIN_DATO}</dd>
                </>
              ) : null}
              <dt className="text-tenue">Registrada</dt>
              <dd className="cifras">{momentoCorto(retiro.fechaSolicitud) || SIN_DATO}</dd>
            </dl>
            <div className="mt-4">
              <Enlace retiro={retiro} minima={minima} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
