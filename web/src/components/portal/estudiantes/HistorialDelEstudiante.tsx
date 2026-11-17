import { PuntoDeEstado } from "@/components/portal/PuntoDeEstado";
import type {
  Certificado,
  EventoDeHistorial,
  Historial,
  InscripcionDeClub,
  InscripcionDeCurso,
  Participacion,
} from "@/lib/api/estudiantes";
import { NOMBRES_DE_NIVEL } from "@/lib/portal/filtros-cursos";
import { fechaCorta } from "@/lib/portal/tiempo";

type Props = {
  historial: Historial;
};

type EstadoDeInscripcion = NonNullable<InscripcionDeClub["estado"]>;
type EstadoDeCurso = NonNullable<InscripcionDeCurso["estado"]>;
type TipoDeEvento = NonNullable<EventoDeHistorial["tipo"]>;

const FORMATO_NUMERO = new Intl.NumberFormat("es-EC");

const INSCRIPCIONES: Record<EstadoDeInscripcion, { nombre: string; punto: string }> = {
  ACTIVA: { nombre: "Activa", punto: "bg-exito" },
  RETIRADA: { nombre: "Retirada", punto: "bg-aviso" },
  TRASLADADA: { nombre: "Trasladada", punto: "bg-acento" },
  FINALIZADA: { nombre: "Finalizada", punto: "bg-tenue" },
};

const CURSOS: Record<EstadoDeCurso, string> = {
  ACTIVA: "en curso",
  RETIRADA: "retirado",
  FINALIZADA: "finalizado",
};

const EVENTOS: Record<TipoDeEvento, { nombre: string; punto: string }> = {
  INGRESO_CLUB: { nombre: "Ingreso al club", punto: "bg-exito" },
  INGRESO_CURSO: { nombre: "Ingreso a un curso", punto: "bg-acento" },
  FIN_CURSO: { nombre: "Fin de curso", punto: "bg-tenue" },
  RETIRO_CURSO: { nombre: "Retiro de un curso", punto: "bg-aviso" },
  COMPETENCIA: { nombre: "Competencia", punto: "bg-acento" },
  CERTIFICADO_EMITIDO: { nombre: "Certificado emitido", punto: "bg-exito" },
  SALIDA_CLUB: { nombre: "Salida del club", punto: "bg-aviso" },
  CERTIFICADO_ANULADO: { nombre: "Certificado anulado", punto: "bg-error" },
};

const NOTAS_DE_ALCANCE: Partial<Record<Historial["alcance"], string>> = {
  CLUBES_DEL_DOCENTE: "Solo ves los registros de los clubes que coordinas.",
  VISTA_MINIMA: "Vista mínima: el historial se identifica solo por el código interno del estudiante.",
};

const SUBTITULO = "text-base font-medium";

function numero(valor?: number): string {
  return FORMATO_NUMERO.format(valor ?? 0);
}

function Cifra({ termino, valor, detalle }: { termino: string; valor: string; detalle?: string }) {
  return (
    <div className="rounded-control bg-superficie p-4">
      <dt className="text-sm text-tenue">{termino}</dt>
      <dd className="cifras mt-1.5 text-2xl font-medium leading-none tracking-tight">{valor}</dd>
      {detalle ? <dd className="mt-1.5 text-sm text-tenue">{detalle}</dd> : null}
    </div>
  );
}

function textoDeCurso(curso: InscripcionDeCurso): string {
  const partes = [
    curso.cursoNivel ? NOMBRES_DE_NIVEL[curso.cursoNivel] : null,
    curso.estado ? CURSOS[curso.estado] : null,
    curso.resultado === "APROBADO" ? "aprobado" : curso.resultado === "NO_APROBADO" ? "no aprobado" : null,
  ];
  return partes.filter(Boolean).join(" · ");
}

function periodoDeInscripcion(inscripcion: InscripcionDeClub): string {
  const ingreso = fechaCorta(inscripcion.fechaIngreso);
  const salida = fechaCorta(inscripcion.fechaRetiro);
  if (ingreso && salida) {
    return `Del ${ingreso} al ${salida}`;
  }
  return ingreso ? `Desde el ${ingreso}` : "";
}

function Clubes({ clubes }: { clubes: InscripcionDeClub[] }) {
  if (clubes.length === 0) {
    return <p className="mt-3 text-[0.9375rem] text-tenue">Todavía no participa en ningún club.</p>;
  }

  return (
    <ul className="mt-3 flex flex-col gap-3">
      {clubes.map((inscripcion) => {
        const estado = inscripcion.estado ? INSCRIPCIONES[inscripcion.estado] : null;
        const cursos = inscripcion.cursos ?? [];
        return (
          <li key={inscripcion.id} className="rounded-control bg-superficie p-4">
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
              <p className="min-w-0 break-words font-medium">
                {inscripcion.clubNombre ?? "Club"}
                {inscripcion.periodoNombre ? (
                  <span className="font-normal text-tenue"> · {inscripcion.periodoNombre}</span>
                ) : null}
              </p>
              {estado ? (
                <span className="text-sm">
                  <PuntoDeEstado punto={estado.punto}>{estado.nombre}</PuntoDeEstado>
                </span>
              ) : null}
            </div>
            <p className="cifras mt-1 text-sm text-tenue">{periodoDeInscripcion(inscripcion)}</p>
            {cursos.length > 0 ? (
              <ul className="mt-3 flex flex-col gap-1.5 border-t border-linea pt-3 text-[0.9375rem]">
                {cursos.map((curso) => (
                  <li key={curso.id} className="flex flex-wrap justify-between gap-x-4">
                    <span className="min-w-0 break-words">{curso.cursoNombre ?? "Curso"}</span>
                    <span className="text-sm text-tenue">{textoDeCurso(curso)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function LineaDeTiempo({ eventos }: { eventos: EventoDeHistorial[] }) {
  if (eventos.length === 0) {
    return <p className="mt-3 text-[0.9375rem] text-tenue">Sin movimientos registrados.</p>;
  }

  const ordenados = [...eventos].reverse().sort((a, b) => (b.fecha ?? "").localeCompare(a.fecha ?? ""));

  return (
    <ol className="mt-4 flex flex-col">
      {ordenados.map((evento, indice) => {
        const tipo = evento.tipo ? EVENTOS[evento.tipo] : null;
        return (
          <li
            key={`${evento.tipo}-${evento.referenciaId}-${indice}`}
            className="relative grid grid-cols-[auto_1fr] gap-x-4 pb-5 last:pb-0"
          >
            <span aria-hidden="true" className="relative flex w-3 justify-center">
              <span className={`mt-[0.4375rem] size-2 rounded-full ${tipo?.punto ?? "bg-tenue"}`} />
              {indice < ordenados.length - 1 ? (
                <span className="absolute bottom-[-1.25rem] top-5 w-px bg-linea" />
              ) : null}
            </span>
            <div className="min-w-0">
              <p className="flex flex-wrap items-baseline gap-x-3">
                <span className="font-medium">{tipo?.nombre ?? "Movimiento"}</span>
                <time dateTime={evento.fecha} className="cifras text-sm text-tenue">
                  {fechaCorta(evento.fecha)}
                </time>
              </p>
              {evento.descripcion ? (
                <p className="mt-0.5 break-words text-[0.9375rem] text-tenue">{evento.descripcion}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Competencias({ competencias }: { competencias: Participacion[] }) {
  return (
    <ul className="mt-3 flex flex-col gap-2 text-[0.9375rem]">
      {competencias.map((participacion) => (
        <li key={participacion.id} className="flex flex-wrap justify-between gap-x-4">
          <span className="min-w-0 break-words">
            {[participacion.competenciaNombre, participacion.edicionNombre].filter(Boolean).join(" · ")}
          </span>
          <span className="text-sm text-tenue">
            {typeof participacion.puesto === "number"
              ? `Puesto ${participacion.puesto}`
              : (participacion.reconocimiento ?? "Participación")}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Certificados({ certificados }: { certificados: Certificado[] }) {
  return (
    <ul className="mt-3 flex flex-col gap-2 text-[0.9375rem]">
      {certificados.map((certificado) => (
        <li key={certificado.id} className="flex flex-wrap justify-between gap-x-4">
          <span className="min-w-0 break-words">{certificado.titulo ?? "Certificado"}</span>
          <span className="cifras text-sm text-tenue">
            {certificado.estado === "ANULADO" ? "Anulado" : fechaCorta(certificado.fechaEmision)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function HistorialDelEstudiante({ historial }: Props) {
  const { resumen, clubes, competencias, certificados, lineaDeTiempo, alcance } = historial;
  const nota = NOTAS_DE_ALCANCE[alcance];

  return (
    <section aria-labelledby="historial" className="min-w-0">
      <h2 id="historial" className="scroll-mt-24 text-lg font-medium">
        Historial
      </h2>
      <p className="mt-1.5 text-[0.9375rem] text-tenue">
        {resumen.primerIngreso
          ? `Participa en el proyecto desde el ${fechaCorta(resumen.primerIngreso)}.`
          : "Todavía no registra movimientos en el proyecto."}
        {nota ? ` ${nota}` : ""}
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Cifra
          termino="Clubes"
          valor={numero(resumen.clubes)}
          detalle={`${numero(resumen.clubesActivos)} activos`}
        />
        <Cifra
          termino="Cursos"
          valor={numero(resumen.cursos)}
          detalle={`${numero(resumen.cursosAprobados)} aprobados`}
        />
        <Cifra
          termino="Competencias"
          valor={numero(resumen.competencias)}
          detalle={`${numero(resumen.podios)} podios`}
        />
        <Cifra
          termino="Certificados"
          valor={numero(resumen.certificadosVigentes)}
          detalle="vigentes"
        />
      </dl>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div className="min-w-0">
          <h3 className={SUBTITULO}>Clubes e inscripciones</h3>
          <Clubes clubes={clubes} />
        </div>
        <div className="min-w-0">
          <h3 className={SUBTITULO}>Movimientos</h3>
          <LineaDeTiempo eventos={lineaDeTiempo} />
        </div>
      </div>

      {competencias.length > 0 || certificados.length > 0 ? (
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          {competencias.length > 0 ? (
            <div className="min-w-0">
              <h3 className={SUBTITULO}>Competencias</h3>
              <Competencias competencias={competencias} />
            </div>
          ) : null}
          {certificados.length > 0 ? (
            <div className="min-w-0">
              <h3 className={SUBTITULO}>Certificados</h3>
              <Certificados certificados={certificados} />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
