import { PuntoDeEstado } from "@/components/portal/PuntoDeEstado";
import type { Indicadores } from "@/lib/api/seguimiento";
import {
  NOMBRES_DE_ESTADO_DE_SEGUIMIENTO,
  NOMBRES_DE_SITUACION,
  PUNTOS_DE_ESTADO_DE_SEGUIMIENTO,
  PUNTOS_DE_SITUACION,
  porcentaje,
  type EstadoSeguimiento,
  type SituacionActividad,
} from "@/lib/portal/filtros-seguimiento";

const FORMATO_NUMERO = new Intl.NumberFormat("es-EC", { maximumFractionDigits: 1 });

export function EstadoDeSeguimiento({ estado }: { estado?: EstadoSeguimiento }) {
  const actual = estado ?? "SIN_DATOS";
  return (
    <PuntoDeEstado punto={PUNTOS_DE_ESTADO_DE_SEGUIMIENTO[actual]}>
      {NOMBRES_DE_ESTADO_DE_SEGUIMIENTO[actual]}
    </PuntoDeEstado>
  );
}

export function SituacionDeActividad({ situacion }: { situacion?: SituacionActividad }) {
  if (!situacion) {
    return null;
  }
  return <PuntoDeEstado punto={PUNTOS_DE_SITUACION[situacion]}>{NOMBRES_DE_SITUACION[situacion]}</PuntoDeEstado>;
}

export function ResumenDeIndicadores({ indicadores }: { indicadores?: Indicadores }) {
  const datos = [
    {
      termino: "Cumplimiento",
      valor: porcentaje(indicadores?.porcentajeCumplimiento),
      detalle: `${indicadores?.ejecutadas ?? 0} ejecutadas de ${indicadores?.exigibles ?? 0} exigibles`,
    },
    {
      termino: "Horas ejecutadas",
      valor: porcentaje(indicadores?.porcentajeHoras),
      detalle: `${FORMATO_NUMERO.format(indicadores?.horasEjecutadas ?? 0)} de ${FORMATO_NUMERO.format(indicadores?.horasPlanificadas ?? 0)} h`,
    },
    {
      termino: "Registro oportuno",
      valor: porcentaje(indicadores?.porcentajeRegistroOportuno),
      detalle: `${indicadores?.registradasATiempo ?? 0} registradas a tiempo`,
    },
    {
      termino: "Reprogramación",
      valor: porcentaje(indicadores?.porcentajeReprogramacion),
      detalle: `${indicadores?.reprogramadas ?? 0} reprogramadas, ${indicadores?.canceladas ?? 0} canceladas`,
    },
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {datos.map((dato) => (
        <div key={dato.termino} className="rounded-pieza bg-superficie p-4">
          <dt className="text-sm text-tenue">{dato.termino}</dt>
          <dd className="cifras mt-2 text-2xl font-medium leading-none tracking-tight">{dato.valor}</dd>
          <dd className="cifras mt-2 text-sm text-tenue">{dato.detalle}</dd>
        </div>
      ))}
    </dl>
  );
}
