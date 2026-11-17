import {
  ESTADOS_DE_ASISTENCIA,
  PLURALES_DE_ESTADO_DE_ASISTENCIA,
  PUNTOS_DE_ESTADO_DE_ASISTENCIA,
} from "@/lib/portal/filtros-asistencia";
import type { Conteo } from "@/lib/portal/reglas-asistencia";

type Props = {
  conteo: Conteo;
  textoPendientes?: string;
};

const FORMATO_NUMERO = new Intl.NumberFormat("es-EC");
const FICHA = "flex h-[4.5rem] flex-col justify-between rounded-pieza bg-superficie p-3.5";

export function ConteoDePlanilla({ conteo, textoPendientes = "Sin marcar" }: Props) {
  const fichas = [
    ...ESTADOS_DE_ASISTENCIA.map((estado) => ({
      clave: estado,
      nombre: PLURALES_DE_ESTADO_DE_ASISTENCIA[estado],
      punto: PUNTOS_DE_ESTADO_DE_ASISTENCIA[estado],
      cantidad: conteo[estado],
    })),
    { clave: "pendientes", nombre: textoPendientes, punto: "bg-tenue", cantidad: conteo.pendientes },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-5">
      {fichas.map((ficha) => (
        <div key={ficha.clave} className={`${FICHA} last:col-span-2 sm:last:col-span-1 2xl:last:col-span-1`}>
          <dt className="flex items-center gap-2 text-sm text-tenue">
            <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${ficha.punto}`} />
            {ficha.nombre}
          </dt>
          <dd className="cifras text-2xl font-medium leading-none tracking-tight">
            {FORMATO_NUMERO.format(ficha.cantidad)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
