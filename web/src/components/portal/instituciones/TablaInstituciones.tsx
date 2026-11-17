import { PuntoDeEstado } from "@/components/portal/PuntoDeEstado";
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import type { Institucion } from "@/lib/api/instituciones";
import {
  NOMBRES_DE_ADHESION,
  PUNTOS_DE_ADHESION,
  RUTA_INSTITUCIONES,
} from "@/lib/portal/filtros-instituciones";
import { fechaCorta } from "@/lib/portal/tiempo";

type Props = {
  instituciones: Institucion[];
  gestionable: boolean;
};

const SIN_DATO = "—";

const CELDA = "px-5 py-3.5 align-top";
const ENCABEZADO = "px-5 py-3 text-left text-sm font-medium text-tenue";

function ubicacionDe(institucion: Institucion): string {
  return [institucion.canton, institucion.provincia].filter(Boolean).join(", ") || SIN_DATO;
}

function zonaDe(institucion: Institucion): string {
  return [institucion.zona, institucion.circuito].filter(Boolean).join(" · ");
}

function contactoDe(institucion: Institucion): string {
  return [institucion.telefono, institucion.correoContacto].filter(Boolean).join(" · ");
}

function Adhesion({ institucion }: { institucion: Institucion }) {
  const estado = institucion.estadoAdhesion;
  if (!estado) {
    return <span className="text-tenue">{SIN_DATO}</span>;
  }
  return <PuntoDeEstado punto={PUNTOS_DE_ADHESION[estado]}>{NOMBRES_DE_ADHESION[estado]}</PuntoDeEstado>;
}

function EnlaceAbrir({ institucion, gestionable }: { institucion: Institucion; gestionable: boolean }) {
  return (
    <EnlaceBoton
      href={`${RUTA_INSTITUCIONES}/${institucion.id}`}
      variante="elevado"
      tamano="compacto"
    >
      {gestionable ? "Gestionar" : "Ver ficha"}
      <span className="sr-only"> de {institucion.nombre}</span>
    </EnlaceBoton>
  );
}

export function TablaInstituciones({ instituciones, gestionable }: Props) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-pieza bg-superficie md:block">
        <table className="w-full border-collapse text-[0.9375rem]">
          <caption className="sr-only">Lista de instituciones</caption>
          <thead>
            <tr className="border-b border-linea">
              <th scope="col" className={`${ENCABEZADO} w-[34%]`}>
                Institución
              </th>
              <th scope="col" className={`${ENCABEZADO} w-[20%]`}>
                Ubicación
              </th>
              <th scope="col" className={`${ENCABEZADO} w-[22%]`}>
                Contacto
              </th>
              <th scope="col" className={ENCABEZADO}>
                Adhesión
              </th>
              <th scope="col" className={`${ENCABEZADO} text-right`}>
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {instituciones.map((institucion) => (
              <tr key={institucion.id} className="border-b border-linea last:border-b-0">
                <th scope="row" className={`${CELDA} text-left font-medium`}>
                  <span className="block break-words">{institucion.nombre}</span>
                  <span className="cifras mt-0.5 block text-sm font-normal text-tenue">
                    AMIE {institucion.codigoAmie}
                  </span>
                </th>
                <td className={`${CELDA} break-words`}>
                  {ubicacionDe(institucion)}
                  {zonaDe(institucion) ? (
                    <span className="mt-0.5 block text-sm text-tenue">{zonaDe(institucion)}</span>
                  ) : null}
                </td>
                <td className={`${CELDA} break-words text-tenue`}>
                  {contactoDe(institucion) || "Sin contacto"}
                </td>
                <td className={CELDA}>
                  <Adhesion institucion={institucion} />
                  {institucion.fechaAdhesion ? (
                    <span className="cifras mt-0.5 block text-sm text-tenue">
                      Desde {fechaCorta(institucion.fechaAdhesion)}
                    </span>
                  ) : null}
                </td>
                <td className="px-5 py-2.5 text-right align-top">
                  <EnlaceAbrir institucion={institucion} gestionable={gestionable} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 md:hidden">
        {instituciones.map((institucion) => (
          <li key={institucion.id} className="rounded-pieza bg-superficie p-4">
            <div className="flex items-start justify-between gap-4">
              <p className="min-w-0 break-words font-medium">{institucion.nombre}</p>
              <span className="shrink-0 text-sm">
                <Adhesion institucion={institucion} />
              </span>
            </div>
            <p className="cifras mt-0.5 text-sm text-tenue">AMIE {institucion.codigoAmie}</p>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[0.9375rem]">
              <dt className="text-tenue">Ubicación</dt>
              <dd className="min-w-0 break-words">{ubicacionDe(institucion)}</dd>
              {zonaDe(institucion) ? (
                <>
                  <dt className="text-tenue">Zona</dt>
                  <dd className="min-w-0 break-words">{zonaDe(institucion)}</dd>
                </>
              ) : null}
              <dt className="text-tenue">Contacto</dt>
              <dd className="min-w-0 break-words">{contactoDe(institucion) || "Sin contacto"}</dd>
            </dl>
            <div className="mt-4">
              <EnlaceAbrir institucion={institucion} gestionable={gestionable} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
