import { PuntoDeEstado } from "@/components/portal/PuntoDeEstado";
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import type { Estudiante } from "@/lib/api/estudiantes";
import {
  NOMBRES_DE_AUTORIZACION,
  NOMBRES_DE_ESTADO_DE_ESTUDIANTE,
  PUNTOS_DE_AUTORIZACION,
  PUNTOS_DE_ESTADO_DE_ESTUDIANTE,
  RUTA_ESTUDIANTES,
} from "@/lib/portal/filtros-estudiantes";
import { identidadDe } from "@/lib/portal/identidad";

type Props = {
  estudiantes: Estudiante[];
  mostrarInstitucion: boolean;
  minima: boolean;
  enlace: "ficha" | "historial";
};

const SIN_DATO = "—";
const ANCLA_DE_HISTORIAL = "#historial";

const CELDA = "px-5 py-3.5 align-top";
const ENCABEZADO = "px-5 py-3 text-left text-sm font-medium text-tenue";

function Estado({ estudiante }: { estudiante: Estudiante }) {
  return estudiante.estado ? (
    <PuntoDeEstado punto={PUNTOS_DE_ESTADO_DE_ESTUDIANTE[estudiante.estado]}>
      {NOMBRES_DE_ESTADO_DE_ESTUDIANTE[estudiante.estado]}
    </PuntoDeEstado>
  ) : (
    <span className="text-tenue">{SIN_DATO}</span>
  );
}

function Autorizacion({ estudiante }: { estudiante: Estudiante }) {
  const estado = estudiante.autorizacionParticipacion;
  return estado ? (
    <PuntoDeEstado punto={PUNTOS_DE_AUTORIZACION[estado]}>{NOMBRES_DE_AUTORIZACION[estado]}</PuntoDeEstado>
  ) : (
    <span className="text-tenue">{SIN_DATO}</span>
  );
}

function Nombre({ estudiante, minima }: { estudiante: Estudiante; minima: boolean }) {
  const identidad = identidadDe(
    { nombres: estudiante.nombres, apellidos: estudiante.apellidos, codigo: estudiante.codigoInterno },
    minima,
  );
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

function Enlace({ estudiante, enlace, minima }: Pick<Props, "enlace" | "minima"> & { estudiante: Estudiante }) {
  const identidad = identidadDe(
    { nombres: estudiante.nombres, apellidos: estudiante.apellidos, codigo: estudiante.codigoInterno },
    minima,
  );
  const historial = enlace === "historial";
  return (
    <EnlaceBoton
      href={`${RUTA_ESTUDIANTES}/${estudiante.id}${historial ? ANCLA_DE_HISTORIAL : ""}`}
      variante="elevado"
      tamano="compacto"
      className="whitespace-nowrap"
    >
      {historial ? "Ver historial" : "Ver ficha"}
      <span className="sr-only"> de {identidad.principal}</span>
    </EnlaceBoton>
  );
}

export function TablaEstudiantes({ estudiantes, mostrarInstitucion, minima, enlace }: Props) {
  const conAutorizacion = !minima;

  return (
    <>
      <div className="hidden overflow-x-auto rounded-pieza bg-superficie md:block">
        <table className="w-full border-collapse text-[0.9375rem]">
          <caption className="sr-only">Lista de estudiantes</caption>
          <thead>
            <tr className="border-b border-linea">
              <th scope="col" className={`${ENCABEZADO} ${mostrarInstitucion ? "w-[30%]" : "w-[38%]"}`}>
                Estudiante
              </th>
              <th scope="col" className={ENCABEZADO}>
                Curso educativo
              </th>
              {mostrarInstitucion ? (
                <th scope="col" className={`${ENCABEZADO} w-[22%]`}>
                  Institución
                </th>
              ) : null}
              {conAutorizacion ? (
                <th scope="col" className={ENCABEZADO}>
                  Autorización
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
            {estudiantes.map((estudiante) => (
              <tr key={estudiante.id} className="border-b border-linea last:border-b-0">
                <th scope="row" className={`${CELDA} text-left font-medium`}>
                  <Nombre estudiante={estudiante} minima={minima} />
                </th>
                <td className={`${CELDA} whitespace-nowrap`}>{estudiante.cursoEtiqueta ?? SIN_DATO}</td>
                {mostrarInstitucion ? (
                  <td className={`${CELDA} break-words text-tenue`}>
                    {estudiante.institucionNombre ?? SIN_DATO}
                  </td>
                ) : null}
                {conAutorizacion ? (
                  <td className={CELDA}>
                    <Autorizacion estudiante={estudiante} />
                  </td>
                ) : null}
                <td className={CELDA}>
                  <Estado estudiante={estudiante} />
                </td>
                <td className="px-5 py-2.5 text-right align-top">
                  <Enlace estudiante={estudiante} enlace={enlace} minima={minima} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 md:hidden">
        {estudiantes.map((estudiante) => (
          <li key={estudiante.id} className="rounded-pieza bg-superficie p-4">
            <div className="flex items-start justify-between gap-4">
              <p className="min-w-0 font-medium">
                <Nombre estudiante={estudiante} minima={minima} />
              </p>
              <span className="shrink-0 text-sm">
                <Estado estudiante={estudiante} />
              </span>
            </div>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[0.9375rem]">
              <dt className="text-tenue">Curso</dt>
              <dd>{estudiante.cursoEtiqueta ?? SIN_DATO}</dd>
              {mostrarInstitucion ? (
                <>
                  <dt className="text-tenue">Institución</dt>
                  <dd className="min-w-0 break-words">{estudiante.institucionNombre ?? SIN_DATO}</dd>
                </>
              ) : null}
              {conAutorizacion ? (
                <>
                  <dt className="text-tenue">Autorización</dt>
                  <dd>
                    <Autorizacion estudiante={estudiante} />
                  </dd>
                </>
              ) : null}
            </dl>
            <div className="mt-4">
              <Enlace estudiante={estudiante} enlace={enlace} minima={minima} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
