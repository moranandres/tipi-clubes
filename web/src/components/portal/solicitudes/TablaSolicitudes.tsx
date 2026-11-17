import { PuntoDeEstado } from "@/components/portal/PuntoDeEstado";
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import type { Solicitud } from "@/lib/api/solicitudes";
import { NOMBRES_DE_NIVEL } from "@/lib/portal/filtros-cursos";
import {
  NOMBRES_DE_ESTADO_DE_SOLICITUD,
  PUNTOS_DE_ESTADO_DE_SOLICITUD,
  RUTA_SOLICITUDES,
} from "@/lib/portal/filtros-solicitudes";
import { identidadDe } from "@/lib/portal/identidad";
import { momentoCorto } from "@/lib/portal/tiempo";

type Props = {
  solicitudes: Solicitud[];
  mostrarInstitucion: boolean;
  minima: boolean;
};

const SIN_DATO = "—";
const CELDA = "px-5 py-3.5 align-top";
const ENCABEZADO = "px-5 py-3 text-left text-sm font-medium text-tenue";

function identidadDeSolicitud(solicitud: Solicitud, minima: boolean) {
  return identidadDe(
    {
      nombres: solicitud.estudianteNombres,
      apellidos: solicitud.estudianteApellidos,
      codigo: solicitud.estudianteCodigo,
    },
    minima,
  );
}

function Estudiante({ solicitud, minima }: { solicitud: Solicitud; minima: boolean }) {
  const identidad = identidadDeSolicitud(solicitud, minima);
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

function Destino({ solicitud }: { solicitud: Solicitud }) {
  const curso = solicitud.cursoAsignadoNombre ?? solicitud.cursoNombre;
  const nivel = solicitud.nivelAsignado ?? solicitud.nivel;
  return (
    <>
      <span className="block break-words">{solicitud.clubNombre ?? SIN_DATO}</span>
      <span className="mt-0.5 block text-sm text-tenue">
        {[curso ?? "Solo el club", nivel ? NOMBRES_DE_NIVEL[nivel] : null].filter(Boolean).join(" · ")}
      </span>
    </>
  );
}

function Estado({ solicitud }: { solicitud: Solicitud }) {
  return solicitud.estado ? (
    <PuntoDeEstado punto={PUNTOS_DE_ESTADO_DE_SOLICITUD[solicitud.estado]}>
      {NOMBRES_DE_ESTADO_DE_SOLICITUD[solicitud.estado]}
    </PuntoDeEstado>
  ) : (
    <span className="text-tenue">{SIN_DATO}</span>
  );
}

function Enlace({ solicitud, minima }: { solicitud: Solicitud; minima: boolean }) {
  return (
    <EnlaceBoton href={`${RUTA_SOLICITUDES}/${solicitud.id}`} variante="elevado" tamano="compacto" className="whitespace-nowrap">
      Ver solicitud
      <span className="sr-only"> de {identidadDeSolicitud(solicitud, minima).principal}</span>
    </EnlaceBoton>
  );
}

export function TablaSolicitudes({ solicitudes, mostrarInstitucion, minima }: Props) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-pieza bg-superficie xl:block">
        <table className="w-full border-collapse text-[0.9375rem]">
          <caption className="sr-only">Lista de solicitudes de inscripción</caption>
          <thead>
            <tr className="border-b border-linea">
              <th scope="col" className={`${ENCABEZADO} w-[26%]`}>
                Estudiante
              </th>
              <th scope="col" className={`${ENCABEZADO} w-[30%]`}>
                Club y curso
              </th>
              {mostrarInstitucion ? (
                <th scope="col" className={`${ENCABEZADO} w-[18%]`}>
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
            {solicitudes.map((solicitud) => (
              <tr key={solicitud.id} className="border-b border-linea last:border-b-0">
                <th scope="row" className={`${CELDA} text-left font-medium`}>
                  <Estudiante solicitud={solicitud} minima={minima} />
                </th>
                <td className={CELDA}>
                  <Destino solicitud={solicitud} />
                </td>
                {mostrarInstitucion ? (
                  <td className={`${CELDA} break-words text-tenue`}>
                    {solicitud.institucionNombre ?? SIN_DATO}
                  </td>
                ) : null}
                <td className={CELDA}>
                  <Estado solicitud={solicitud} />
                  <span className="cifras mt-0.5 block whitespace-nowrap text-sm text-tenue">
                    {momentoCorto(solicitud.fechaSolicitud)}
                  </span>
                </td>
                <td className="px-5 py-2.5 text-right align-top">
                  <Enlace solicitud={solicitud} minima={minima} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 xl:hidden">
        {solicitudes.map((solicitud) => (
          <li key={solicitud.id} className="rounded-pieza bg-superficie p-4">
            <div className="flex items-start justify-between gap-4">
              <p className="min-w-0 font-medium">
                <Estudiante solicitud={solicitud} minima={minima} />
              </p>
              <span className="shrink-0 text-sm">
                <Estado solicitud={solicitud} />
              </span>
            </div>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[0.9375rem]">
              <dt className="text-tenue">Club</dt>
              <dd className="min-w-0">
                <Destino solicitud={solicitud} />
              </dd>
              {mostrarInstitucion ? (
                <>
                  <dt className="text-tenue">Institución</dt>
                  <dd className="min-w-0 break-words">{solicitud.institucionNombre ?? SIN_DATO}</dd>
                </>
              ) : null}
              <dt className="text-tenue">Registrada</dt>
              <dd className="cifras">{momentoCorto(solicitud.fechaSolicitud) || SIN_DATO}</dd>
            </dl>
            <div className="mt-4">
              <Enlace solicitud={solicitud} minima={minima} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
