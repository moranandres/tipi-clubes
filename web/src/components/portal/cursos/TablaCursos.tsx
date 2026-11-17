import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import type { Curso, HorarioDeCurso } from "@/lib/api/cursos";
import {
  NOMBRES_DE_ESTADO_DE_CURSO,
  NOMBRES_DE_MODALIDAD,
  NOMBRES_DE_NIVEL,
  PUNTOS_DE_ESTADO_DE_CURSO,
  RUTA_CURSOS,
  type EstadoCurso,
} from "@/lib/portal/filtros-cursos";
import { fechaCorta, horaCorta, nombreDeDia } from "@/lib/portal/tiempo";

type Props = {
  cursos: Curso[];
  mostrarInstitucion: boolean;
  gestionable: boolean;
};

const SIN_DATO = "—";
const MODALIDAD_HIBRIDA = "HIBRIDO";
const SESION_VIRTUAL = "VIRTUAL";

const FORMATO_HORAS = new Intl.NumberFormat("es-EC", { maximumFractionDigits: 1 });

const CELDA = "px-5 py-3.5 align-top";
const ENCABEZADO = "px-5 py-3 text-left text-sm font-medium text-tenue";

function textoDeHorario(horario: HorarioDeCurso, hibrido: boolean): string {
  const dia = nombreDeDia(horario.diaSemana) || (horario.dia ?? "");
  const base = `${dia}, ${horaCorta(horario.horaInicio)} a ${horaCorta(horario.horaFin)}`;
  if (!hibrido) {
    return base;
  }
  return `${base} · ${horario.tipoSesion === SESION_VIRTUAL ? "Virtual" : "Presencial"}`;
}

function fechasDe(curso: Curso): string {
  const inicio = fechaCorta(curso.fechaInicio);
  const fin = fechaCorta(curso.fechaFin);
  if (inicio && fin) {
    return `${inicio} al ${fin}`;
  }
  return inicio || fin || "Sin fechas";
}

function inscritosDe(curso: Curso): string {
  const activos = curso.inscritosActivos ?? 0;
  return typeof curso.cupoMaximo === "number" ? `${activos} de ${curso.cupoMaximo}` : String(activos);
}

function estaCompleto(curso: Curso): boolean {
  return curso.cuposDisponibles === 0 && typeof curso.cupoMaximo === "number";
}

function caracteristicasDe(curso: Curso): string {
  return [
    curso.nivel ? NOMBRES_DE_NIVEL[curso.nivel] : null,
    curso.modalidad ? NOMBRES_DE_MODALIDAD[curso.modalidad] : null,
    typeof curso.duracionHoras === "number" ? `${curso.duracionHoras} h` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function Estado({ estado }: { estado?: EstadoCurso }) {
  if (!estado) {
    return <span className="text-tenue">{SIN_DATO}</span>;
  }
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span
        aria-hidden="true"
        className={`size-1.5 shrink-0 rounded-full ${PUNTOS_DE_ESTADO_DE_CURSO[estado]}`}
      />
      {NOMBRES_DE_ESTADO_DE_CURSO[estado]}
    </span>
  );
}

function Horarios({ curso }: { curso: Curso }) {
  const horarios = curso.horarios ?? [];
  if (horarios.length === 0) {
    return <span className="text-tenue">Sin horario</span>;
  }
  const hibrido = curso.modalidad === MODALIDAD_HIBRIDA;
  return (
    <>
      <ul className="cifras">
        {horarios.map((horario) => (
          <li key={horario.id}>
            {textoDeHorario(horario, hibrido)}
          </li>
        ))}
      </ul>
      {typeof curso.horasSemanales === "number" ? (
        <span className="cifras mt-0.5 block text-sm text-tenue">
          {FORMATO_HORAS.format(curso.horasSemanales)} h por semana
        </span>
      ) : null}
    </>
  );
}

function FechasEnDosLineas({ curso }: { curso: Curso }) {
  const inicio = fechaCorta(curso.fechaInicio);
  const fin = fechaCorta(curso.fechaFin);
  if (!inicio || !fin) {
    return <span className="whitespace-nowrap">{fechasDe(curso)}</span>;
  }
  return (
    <>
      <span className="block whitespace-nowrap">{inicio}</span>
      <span className="block whitespace-nowrap">al {fin}</span>
    </>
  );
}

function Detalle({ curso }: { curso: Curso }) {
  const caracteristicas = caracteristicasDe(curso);
  return (
    <>
      {curso.clubNombre ? (
        <span className="mt-0.5 block break-words text-sm font-normal text-tenue">
          {curso.clubNombre}
        </span>
      ) : null}
      {caracteristicas ? (
        <span className="mt-0.5 block text-sm font-normal text-tenue">{caracteristicas}</span>
      ) : null}
    </>
  );
}

function EnlaceGestionar({ curso }: { curso: Curso }) {
  return (
    <EnlaceBoton href={`${RUTA_CURSOS}/${curso.id}`} variante="elevado" tamano="compacto">
      Gestionar
      <span className="sr-only"> el curso {curso.nombre}</span>
    </EnlaceBoton>
  );
}

export function TablaCursos({ cursos, mostrarInstitucion, gestionable }: Props) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-pieza bg-superficie xl:block">
        <table className="w-full border-collapse text-[0.9375rem]">
          <caption className="sr-only">Lista de cursos</caption>
          <thead>
            <tr className="border-b border-linea">
              <th scope="col" className={`${ENCABEZADO} ${mostrarInstitucion ? "w-[24%]" : "w-[34%]"}`}>
                Curso
              </th>
              {mostrarInstitucion ? (
                <th scope="col" className={`${ENCABEZADO} w-[15%]`}>
                  Institución
                </th>
              ) : null}
              <th scope="col" className={ENCABEZADO}>
                Horario
              </th>
              <th scope="col" className={ENCABEZADO}>
                Fechas
              </th>
              <th scope="col" className={`${ENCABEZADO} text-right`}>
                Inscritos
              </th>
              <th scope="col" className={ENCABEZADO}>
                Estado
              </th>
              {gestionable ? (
                <th scope="col" className={`${ENCABEZADO} text-right`}>
                  Acciones
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {cursos.map((curso) => (
              <tr key={curso.id} className="border-b border-linea last:border-b-0">
                <th scope="row" className={`${CELDA} text-left font-medium`}>
                  <span className="block break-words">{curso.nombre}</span>
                  <Detalle curso={curso} />
                </th>
                {mostrarInstitucion ? (
                  <td className={`${CELDA} break-words text-tenue`}>
                    {curso.institucionNombre ?? SIN_DATO}
                  </td>
                ) : null}
                <td className={CELDA}>
                  <Horarios curso={curso} />
                </td>
                <td className={`${CELDA} cifras`}>
                  <FechasEnDosLineas curso={curso} />
                </td>
                <td className={`${CELDA} cifras whitespace-nowrap text-right`}>
                  {inscritosDe(curso)}
                  {estaCompleto(curso) ? (
                    <span className="mt-0.5 block text-sm text-aviso">Completo</span>
                  ) : null}
                </td>
                <td className={CELDA}>
                  <Estado estado={curso.estado} />
                </td>
                {gestionable ? (
                  <td className="px-5 py-2.5 text-right align-top">
                    <EnlaceGestionar curso={curso} />
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 xl:hidden">
        {cursos.map((curso) => (
          <li key={curso.id} className="rounded-pieza bg-superficie p-4">
            <div className="flex items-start justify-between gap-4">
              <p className="min-w-0 break-words font-medium">{curso.nombre}</p>
              <span className="shrink-0 text-sm">
                <Estado estado={curso.estado} />
              </span>
            </div>
            <Detalle curso={curso} />
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[0.9375rem]">
              {mostrarInstitucion ? (
                <>
                  <dt className="text-tenue">Institución</dt>
                  <dd className="min-w-0 break-words">{curso.institucionNombre ?? SIN_DATO}</dd>
                </>
              ) : null}
              <dt className="text-tenue">Horario</dt>
              <dd className="min-w-0">
                <Horarios curso={curso} />
              </dd>
              <dt className="text-tenue">Fechas</dt>
              <dd className="cifras">{fechasDe(curso)}</dd>
              <dt className="text-tenue">Inscritos</dt>
              <dd className="cifras">
                {inscritosDe(curso)}
                {estaCompleto(curso) ? <span className="ml-2 text-sm text-aviso">Completo</span> : null}
              </dd>
            </dl>
            {gestionable ? (
              <div className="mt-4">
                <EnlaceGestionar curso={curso} />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </>
  );
}
