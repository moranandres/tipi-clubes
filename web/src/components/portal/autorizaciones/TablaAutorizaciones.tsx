import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import type { AutorizacionDeLista } from "@/lib/api/autorizaciones";
import {
  NOMBRES_DE_TIPO_DE_AUTORIZACION,
  rutaDeGestion,
} from "@/lib/portal/filtros-autorizaciones";
import { NOMBRES_DE_ESTADO_DE_ESTUDIANTE } from "@/lib/portal/filtros-estudiantes";
import { identidadDe } from "@/lib/portal/identidad";
import { fechaCorta, momentoCorto } from "@/lib/portal/tiempo";
import {
  EstadoDeAutorizacion,
  IndicadorDeDocumento,
  Representante,
} from "./PiezasDeAutorizacion";

type Props = {
  autorizaciones: AutorizacionDeLista[];
  mostrarInstitucion: boolean;
};

const SIN_DATO = "—";
const CELDA = "px-5 py-3.5 align-top";
const ENCABEZADO = "px-5 py-3 text-left text-sm font-medium text-tenue";
const ESTUDIANTE_ACTIVO = "ACTIVO";

function nombreDe(autorizacion: AutorizacionDeLista): string {
  return identidadDe(
    {
      nombres: autorizacion.estudianteNombres,
      apellidos: autorizacion.estudianteApellidos,
      codigo: autorizacion.estudianteCodigo,
    },
    false,
  ).principal;
}

function Estudiante({ autorizacion }: { autorizacion: AutorizacionDeLista }) {
  const detalle = [autorizacion.estudianteCodigo, autorizacion.estudianteCursoEtiqueta]
    .filter(Boolean)
    .join(" · ");
  const inactivo =
    autorizacion.estudianteEstado && autorizacion.estudianteEstado !== ESTUDIANTE_ACTIVO
      ? NOMBRES_DE_ESTADO_DE_ESTUDIANTE[autorizacion.estudianteEstado]
      : null;
  return (
    <>
      <span className="block break-words">{nombreDe(autorizacion)}</span>
      {detalle ? (
        <span className="cifras mt-0.5 block text-sm font-normal text-tenue">{detalle}</span>
      ) : null}
      {inactivo ? (
        <span className="mt-0.5 block text-sm font-normal text-aviso">Estudiante {inactivo.toLowerCase()}</span>
      ) : null}
    </>
  );
}

function Estado({ autorizacion }: { autorizacion: AutorizacionDeLista }) {
  const fecha =
    autorizacion.estado === "OTORGADA" && autorizacion.fechaRegistro
      ? `Firmada el ${fechaCorta(autorizacion.fechaRegistro)}`
      : momentoCorto(autorizacion.actualizadoEn);
  return (
    <>
      <EstadoDeAutorizacion estado={autorizacion.estado} />
      {fecha ? (
        <span className="cifras mt-0.5 block whitespace-nowrap text-sm text-tenue">{fecha}</span>
      ) : null}
    </>
  );
}

function Enlace({ autorizacion }: { autorizacion: AutorizacionDeLista }) {
  if (!autorizacion.estudianteId || !autorizacion.tipo) {
    return null;
  }
  return (
    <EnlaceBoton
      href={rutaDeGestion(autorizacion.estudianteId, autorizacion.tipo, { desde: "lista" })}
      variante="elevado"
      tamano="compacto"
      className="whitespace-nowrap"
    >
      Gestionar
      <span className="sr-only">
        {" "}
        la autorización de {NOMBRES_DE_TIPO_DE_AUTORIZACION[autorizacion.tipo].toLowerCase()} de{" "}
        {nombreDe(autorizacion)}
      </span>
    </EnlaceBoton>
  );
}

function Tipo({ autorizacion }: { autorizacion: AutorizacionDeLista }) {
  return <>{autorizacion.tipo ? NOMBRES_DE_TIPO_DE_AUTORIZACION[autorizacion.tipo] : SIN_DATO}</>;
}

export function TablaAutorizaciones({ autorizaciones, mostrarInstitucion }: Props) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-pieza bg-superficie xl:block">
        <table className="w-full border-collapse text-[0.9375rem]">
          <caption className="sr-only">Lista de autorizaciones de los representantes</caption>
          <thead>
            <tr className="border-b border-linea">
              <th scope="col" className={`${ENCABEZADO} w-[24%]`}>
                Estudiante
              </th>
              <th scope="col" className={ENCABEZADO}>
                Tipo
              </th>
              <th scope="col" className={`${ENCABEZADO} w-[20%]`}>
                Representante
              </th>
              {mostrarInstitucion ? (
                <th scope="col" className={`${ENCABEZADO} w-[16%]`}>
                  Institución
                </th>
              ) : null}
              <th scope="col" className={ENCABEZADO}>
                Estado
              </th>
              <th scope="col" className={ENCABEZADO}>
                Documento
              </th>
              <th scope="col" className={`${ENCABEZADO} text-right`}>
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {autorizaciones.map((autorizacion) => (
              <tr key={autorizacion.id} className="border-b border-linea last:border-b-0">
                <th scope="row" className={`${CELDA} text-left font-medium`}>
                  <Estudiante autorizacion={autorizacion} />
                </th>
                <td className={`${CELDA} whitespace-nowrap`}>
                  <Tipo autorizacion={autorizacion} />
                </td>
                <td className={CELDA}>
                  <Representante representante={autorizacion.representante} />
                </td>
                {mostrarInstitucion ? (
                  <td className={`${CELDA} break-words text-tenue`}>
                    {autorizacion.institucionNombre ?? SIN_DATO}
                  </td>
                ) : null}
                <td className={CELDA}>
                  <Estado autorizacion={autorizacion} />
                </td>
                <td className={CELDA}>
                  <IndicadorDeDocumento tieneDocumento={autorizacion.tieneDocumento} />
                </td>
                <td className="px-5 py-2.5 text-right align-top">
                  <Enlace autorizacion={autorizacion} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 xl:hidden">
        {autorizaciones.map((autorizacion) => (
          <li key={autorizacion.id} className="rounded-pieza bg-superficie p-4">
            <div className="flex items-start justify-between gap-4">
              <p className="min-w-0 font-medium">
                <Estudiante autorizacion={autorizacion} />
              </p>
              <span className="shrink-0 text-sm">
                <EstadoDeAutorizacion estado={autorizacion.estado} />
              </span>
            </div>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[0.9375rem]">
              <dt className="text-tenue">Tipo</dt>
              <dd className="min-w-0">
                <Tipo autorizacion={autorizacion} />
              </dd>
              <dt className="text-tenue">Representante</dt>
              <dd className="min-w-0">
                <Representante representante={autorizacion.representante} />
              </dd>
              {mostrarInstitucion ? (
                <>
                  <dt className="text-tenue">Institución</dt>
                  <dd className="min-w-0 break-words">{autorizacion.institucionNombre ?? SIN_DATO}</dd>
                </>
              ) : null}
              <dt className="text-tenue">Documento</dt>
              <dd className="min-w-0">
                <IndicadorDeDocumento tieneDocumento={autorizacion.tieneDocumento} />
              </dd>
              {autorizacion.estado === "OTORGADA" && autorizacion.fechaRegistro ? (
                <>
                  <dt className="text-tenue">Firmada</dt>
                  <dd className="cifras">{fechaCorta(autorizacion.fechaRegistro)}</dd>
                </>
              ) : null}
            </dl>
            <div className="mt-4">
              <Enlace autorizacion={autorizacion} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
