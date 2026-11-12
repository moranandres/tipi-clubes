import { Suspense } from "react";
import {
  obtenerEstadisticasPublicas,
  type EstadisticasPublicas,
} from "@/lib/api/estadisticas";

type Fila = { clave: keyof EstadisticasPublicas; etiqueta: string };

type Grupo = {
  titulo: string;
  principal: Fila;
  secundarias: Fila[];
};

const GRUPOS: Grupo[] = [
  {
    titulo: "Instituciones",
    principal: { clave: "instituciones", etiqueta: "adheridas al proyecto" },
    secundarias: [{ clave: "institucionesConClubes", etiqueta: "Con clubes en marcha" }],
  },
  {
    titulo: "Clubes",
    principal: { clave: "clubes", etiqueta: "registrados" },
    secundarias: [
      { clave: "clubesActivos", etiqueta: "Activos" },
      { clave: "docentesActivos", etiqueta: "Docentes activos" },
    ],
  },
  {
    titulo: "Sesiones",
    principal: { clave: "sesionesEjecutadas", etiqueta: "ejecutadas" },
    secundarias: [
      { clave: "horasEjecutadas", etiqueta: "Horas de trabajo" },
      { clave: "estudiantesParticipantes", etiqueta: "Estudiantes participantes" },
    ],
  },
  {
    titulo: "Evidencias",
    principal: { clave: "evidenciasRegistradas", etiqueta: "registradas" },
    secundarias: [
      { clave: "proyectos", etiqueta: "Proyectos de estudiantes" },
      { clave: "certificadosEmitidos", etiqueta: "Certificados emitidos" },
    ],
  },
];

const FORMATO_NUMERO = new Intl.NumberFormat("es-EC");
const FORMATO_HORA = new Intl.DateTimeFormat("es-EC", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "America/Guayaquil",
});
const SIN_DATO = "—";

function valor(cifras: EstadisticasPublicas | null, clave: keyof EstadisticasPublicas): string {
  const dato = cifras?.[clave];
  return typeof dato === "number" ? FORMATO_NUMERO.format(dato) : SIN_DATO;
}

function notaDe(cifras: EstadisticasPublicas | null, cargando: boolean): string {
  if (cargando) {
    return "Leyendo las cifras del servidor.";
  }
  if (!cifras) {
    return "No pudimos leer las cifras en este momento. Vuelve a intentarlo en unos minutos.";
  }
  const periodo = cifras.periodoActivo
    ? `Período académico ${cifras.periodoActivo}.`
    : "Todavía no hay un período académico activo.";
  const hora = cifras.actualizadoEn
    ? ` Calculadas a las ${FORMATO_HORA.format(new Date(cifras.actualizadoEn))}.`
    : "";
  return `${periodo}${hora}`;
}

function Tablero({
  cifras,
  cargando = false,
}: {
  cifras: EstadisticasPublicas | null;
  cargando?: boolean;
}) {
  return (
    <div aria-busy={cargando} className="mt-14 rounded-pieza bg-superficie p-6 sm:p-8 lg:p-10">
      <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {GRUPOS.map((grupo) => (
          <section key={grupo.titulo} aria-label={grupo.titulo}>
            <h3 className="text-sm font-medium text-tenue">{grupo.titulo}</h3>
            <p className="cifras mt-3 text-cifra font-medium">
              {valor(cifras, grupo.principal.clave)}
            </p>
            <p className="mt-1 text-[0.9375rem] text-tenue">{grupo.principal.etiqueta}</p>
            <dl className="mt-6 text-[0.9375rem]">
              {grupo.secundarias.map((fila) => (
                <div
                  key={fila.clave}
                  className="flex items-baseline justify-between gap-4 border-t border-linea py-2.5"
                >
                  <dt className="text-tenue">{fila.etiqueta}</dt>
                  <dd className="cifras font-medium">{valor(cifras, fila.clave)}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
      <p role="status" className="mt-8 border-t border-linea pt-5 text-sm text-tenue">
        {notaDe(cifras, cargando)}
      </p>
    </div>
  );
}

async function TableroEnVivo() {
  const cifras = await obtenerEstadisticasPublicas();
  return <Tablero cifras={cifras} />;
}

export function Cifras() {
  return (
    <section
      id="cifras"
      aria-labelledby="titulo-cifras"
      className="flex min-h-svh items-center border-t border-linea py-24"
    >
      <div className="contenedor">
        <div className="max-w-[44rem]">
          <h2 id="titulo-cifras" className="text-seccion">
            Las cifras del proyecto hoy
          </h2>
          <p className="mt-5 max-w-[62ch] text-tenue">
            Salen de la misma base de datos que usa el portal y se recalculan cada cinco minutos.
            Son conteos generales: no incluyen nombres ni datos de estudiantes.
          </p>
        </div>
        <Suspense fallback={<Tablero cifras={null} cargando />}>
          <TableroEnVivo />
        </Suspense>
      </div>
    </section>
  );
}
