import { Bot, CalendarCheck, FileCheck2, School, type LucideIcon } from "lucide-react";

type Eslabon = {
  icono: LucideIcon;
  nombre: string;
  descripcion: string;
  registro: string;
};

const CADENA: Eslabon[] = [
  {
    icono: School,
    nombre: "Institución",
    descripcion:
      "Cada unidad educativa entra con su código AMIE, que no se puede repetir, y con un responsable institucional.",
    registro: "Código AMIE único",
  },
  {
    icono: Bot,
    nombre: "Club",
    descripcion:
      "Cada club tiene un docente coordinador, cursos por nivel, horarios y un número de cupos.",
    registro: "Docente, cursos y cupos",
  },
  {
    icono: CalendarCheck,
    nombre: "Sesión",
    descripcion:
      "El docente planifica la sesión, la ejecuta y pasa asistencia estudiante por estudiante.",
    registro: "Asistencia sin duplicados",
  },
  {
    icono: FileCheck2,
    nombre: "Evidencia",
    descripcion:
      "Fotografías, informes y enlaces quedan ligados a la sesión, con la autorización de imagen comprobada.",
    registro: "Archivo con su sesión",
  },
];

export function ComoFunciona() {
  return (
    <section
      id="como-funciona"
      aria-labelledby="titulo-como-funciona"
      className="flex min-h-svh items-center border-t border-linea py-24"
    >
      <div className="contenedor">
        <div className="max-w-[44rem]">
          <h2 id="titulo-como-funciona" className="text-seccion">
            De la institución a la evidencia
          </h2>
          <p className="mt-5 max-w-[62ch] text-tenue">
            Todo lo que pasa en un club queda encadenado. Cada registro apunta al anterior, así que
            un informe siempre puede volver hasta la sesión, el club y la institución de donde
            salió.
          </p>
        </div>
        <ol className="mt-16 grid gap-10 lg:grid-cols-4 lg:gap-6">
          {CADENA.map((eslabon, indice) => (
            <li key={eslabon.nombre} className="group relative flex gap-5 lg:block">
              <div className="flex flex-col items-center lg:flex-row">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-linea bg-superficie text-acento transition-[background-color,color,border-color] duration-150 ease-salida group-hover:border-acento group-hover:bg-acento group-hover:text-sobre-acento">
                  <eslabon.icono aria-hidden="true" size={22} strokeWidth={1.75} />
                </span>
                {indice < CADENA.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className="mt-3 w-px flex-1 bg-linea lg:ml-3 lg:mt-0 lg:h-px lg:w-auto lg:-mr-6"
                  />
                ) : null}
              </div>
              <div className="pb-2 lg:mt-6 lg:pr-6">
                <h3 className="text-xl">{eslabon.nombre}</h3>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-tenue">
                  {eslabon.descripcion}
                </p>
                <p className="mt-4 text-sm font-medium">{eslabon.registro}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-16 max-w-[62ch] border-t border-linea pt-6 text-tenue">
          Con esos registros el sistema calcula la asistencia, el avance por competencias, el
          semáforo de seguimiento de cada club y los certificados que cualquiera puede verificar.
        </p>
      </div>
    </section>
  );
}
