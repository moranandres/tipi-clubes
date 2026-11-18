import { PuntoDeEstado } from "@/components/portal/PuntoDeEstado";
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import type { Contenido } from "@/lib/api/actividades";
import type { TipoContenido } from "@/lib/portal/filtros-actividades";
import {
  NOMBRE_DE_ESTADO_DE_CONTENIDO,
  NOMBRE_DE_TIPO_EN_SINGULAR,
  PUNTOS_DE_ESTADO_DE_CONTENIDO,
  estadoDeContenido,
  rutaDeContenido,
} from "@/lib/portal/filtros-contenidos";

type Props = {
  contenidos: Contenido[];
};

const CELDA = "px-5 py-3.5 align-top";
const ENCABEZADO = "px-5 py-3 text-left text-sm font-medium text-tenue";

function tipoDe(tipo?: TipoContenido): string {
  return tipo ? NOMBRE_DE_TIPO_EN_SINGULAR[tipo] : "";
}

function usos(contenido: Contenido): string {
  const cantidad = contenido.actividades ?? 0;
  if (cantidad === 0) {
    return "Sin uso";
  }
  return cantidad === 1 ? "1 actividad" : `${cantidad} actividades`;
}

function Estado({ contenido }: { contenido: Contenido }) {
  const estado = estadoDeContenido(contenido.activo);
  return (
    <PuntoDeEstado punto={PUNTOS_DE_ESTADO_DE_CONTENIDO[estado]}>
      {NOMBRE_DE_ESTADO_DE_CONTENIDO[estado]}
    </PuntoDeEstado>
  );
}

function EnlaceAbrir({ contenido }: { contenido: Contenido }) {
  return (
    <EnlaceBoton href={rutaDeContenido(contenido.id ?? 0)} variante="elevado" tamano="compacto">
      Gestionar
      <span className="sr-only"> {contenido.nombre}</span>
    </EnlaceBoton>
  );
}

export function TablaContenidos({ contenidos }: Props) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-pieza bg-superficie md:block">
        <table className="w-full border-collapse text-[0.9375rem]">
          <caption className="sr-only">Catálogo de contenidos</caption>
          <thead>
            <tr className="border-b border-linea">
              <th scope="col" className={`${ENCABEZADO} w-[46%]`}>
                Contenido
              </th>
              <th scope="col" className={ENCABEZADO}>
                Tipo
              </th>
              <th scope="col" className={ENCABEZADO}>
                Uso
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
            {contenidos.map((contenido) => (
              <tr key={contenido.id} className="border-b border-linea last:border-b-0">
                <th scope="row" className={`${CELDA} text-left font-medium`}>
                  <span className="block break-words">{contenido.nombre}</span>
                  {contenido.descripcion ? (
                    <span className="mt-0.5 block break-words text-sm font-normal text-tenue">
                      {contenido.descripcion}
                    </span>
                  ) : null}
                </th>
                <td className={CELDA}>{tipoDe(contenido.tipo)}</td>
                <td className={`${CELDA} cifras whitespace-nowrap`}>{usos(contenido)}</td>
                <td className={CELDA}>
                  <Estado contenido={contenido} />
                </td>
                <td className="px-5 py-2.5 text-right align-top">
                  <EnlaceAbrir contenido={contenido} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 md:hidden">
        {contenidos.map((contenido) => (
          <li key={contenido.id} className="rounded-pieza bg-superficie p-4">
            <div className="flex items-start justify-between gap-4">
              <p className="min-w-0 break-words font-medium">{contenido.nombre}</p>
              <span className="shrink-0 text-sm">
                <Estado contenido={contenido} />
              </span>
            </div>
            {contenido.descripcion ? (
              <p className="mt-0.5 break-words text-sm text-tenue">{contenido.descripcion}</p>
            ) : null}
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[0.9375rem]">
              <dt className="text-tenue">Tipo</dt>
              <dd>{tipoDe(contenido.tipo)}</dd>
              <dt className="text-tenue">Uso</dt>
              <dd className="cifras">{usos(contenido)}</dd>
            </dl>
            <div className="mt-4">
              <EnlaceAbrir contenido={contenido} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
