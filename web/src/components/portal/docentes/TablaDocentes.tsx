import { PuntoDeEstado } from "@/components/portal/PuntoDeEstado";
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import type { Docente } from "@/lib/api/clubes";
import {
  NOMBRES_DE_ESTADO_DE_DOCENTE,
  PUNTOS_DE_ESTADO_DE_DOCENTE,
  RUTA_DOCENTES,
  estadoDeDocente,
} from "@/lib/portal/filtros-docentes";

type Props = {
  docentes: Docente[];
  instituciones: Map<number, string> | null;
  gestionable: boolean;
};

const SIN_DATO = "—";

const CELDA = "px-5 py-3.5 align-top";
const ENCABEZADO = "px-5 py-3 text-left text-sm font-medium text-tenue";

function nombreDe(docente: Docente): string {
  return [docente.apellidos, docente.nombres].filter(Boolean).join(" ") || "Docente sin nombre";
}

function institucionDe(docente: Docente, instituciones: Map<number, string> | null): string {
  return (docente.institucionId && instituciones?.get(docente.institucionId)) || SIN_DATO;
}

function Estado({ docente }: { docente: Docente }) {
  const estado = estadoDeDocente(docente.activo);
  return (
    <PuntoDeEstado punto={PUNTOS_DE_ESTADO_DE_DOCENTE[estado]}>
      {NOMBRES_DE_ESTADO_DE_DOCENTE[estado]}
    </PuntoDeEstado>
  );
}

function Cuenta({ docente }: { docente: Docente }) {
  return docente.usuarioId ? (
    <span>Vinculada</span>
  ) : (
    <span className="text-tenue">Sin cuenta</span>
  );
}

function EnlaceAbrir({ docente, gestionable }: { docente: Docente; gestionable: boolean }) {
  return (
    <EnlaceBoton href={`${RUTA_DOCENTES}/${docente.id}`} variante="elevado" tamano="compacto">
      {gestionable ? "Gestionar" : "Ver ficha"}
      <span className="sr-only"> de {nombreDe(docente)}</span>
    </EnlaceBoton>
  );
}

export function TablaDocentes({ docentes, instituciones, gestionable }: Props) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-pieza bg-superficie md:block">
        <table className="w-full border-collapse text-[0.9375rem]">
          <caption className="sr-only">Lista de docentes</caption>
          <thead>
            <tr className="border-b border-linea">
              <th scope="col" className={`${ENCABEZADO} ${instituciones ? "w-[30%]" : "w-[38%]"}`}>
                Docente
              </th>
              {instituciones ? (
                <th scope="col" className={`${ENCABEZADO} w-[24%]`}>
                  Institución
                </th>
              ) : null}
              <th scope="col" className={ENCABEZADO}>
                Teléfono
              </th>
              <th scope="col" className={ENCABEZADO}>
                Cuenta
              </th>
              <th scope="col" className={ENCABEZADO}>
                Estado
              </th>
              <th scope="col" className={`${ENCABEZADO} text-right`}>
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {docentes.map((docente) => (
              <tr key={docente.id} className="border-b border-linea last:border-b-0">
                <th scope="row" className={`${CELDA} text-left font-medium`}>
                  <span className="block break-words">{nombreDe(docente)}</span>
                  {docente.correo ? (
                    <span className="mt-0.5 block break-all text-sm font-normal text-tenue">
                      {docente.correo}
                    </span>
                  ) : null}
                </th>
                {instituciones ? (
                  <td className={`${CELDA} break-words text-tenue`}>
                    {institucionDe(docente, instituciones)}
                  </td>
                ) : null}
                <td className={`${CELDA} cifras whitespace-nowrap`}>
                  {docente.telefono ?? <span className="text-tenue">{SIN_DATO}</span>}
                </td>
                <td className={CELDA}>
                  <Cuenta docente={docente} />
                </td>
                <td className={CELDA}>
                  <Estado docente={docente} />
                </td>
                <td className="px-5 py-2.5 text-right align-top">
                  <EnlaceAbrir docente={docente} gestionable={gestionable} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 md:hidden">
        {docentes.map((docente) => (
          <li key={docente.id} className="rounded-pieza bg-superficie p-4">
            <div className="flex items-start justify-between gap-4">
              <p className="min-w-0 break-words font-medium">{nombreDe(docente)}</p>
              <span className="shrink-0 text-sm">
                <Estado docente={docente} />
              </span>
            </div>
            {docente.correo ? (
              <p className="mt-0.5 break-all text-sm text-tenue">{docente.correo}</p>
            ) : null}
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[0.9375rem]">
              {instituciones ? (
                <>
                  <dt className="text-tenue">Institución</dt>
                  <dd className="min-w-0 break-words">{institucionDe(docente, instituciones)}</dd>
                </>
              ) : null}
              <dt className="text-tenue">Teléfono</dt>
              <dd className="cifras">{docente.telefono ?? SIN_DATO}</dd>
              <dt className="text-tenue">Cuenta</dt>
              <dd>
                <Cuenta docente={docente} />
              </dd>
            </dl>
            <div className="mt-4">
              <EnlaceAbrir docente={docente} gestionable={gestionable} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
