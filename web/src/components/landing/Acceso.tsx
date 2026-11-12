import { ArrowRight } from "lucide-react";
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";

const ROLES = [
  {
    nombre: "Administrador",
    alcance: "Registra instituciones, usuarios, períodos académicos y parámetros del sistema.",
  },
  {
    nombre: "Coordinador TIPI 3.0",
    alcance: "Sigue el avance de todos los clubes y revisa sus resultados.",
  },
  {
    nombre: "Responsable institucional",
    alcance: "Gestiona los clubes, cursos, inscripciones y certificados de su institución.",
  },
  {
    nombre: "Docente coordinador",
    alcance: "Planifica las sesiones de sus clubes, pasa asistencia y carga las evidencias.",
  },
] as const;

export function Acceso() {
  return (
    <section
      id="acceso"
      aria-labelledby="titulo-acceso"
      className="flex min-h-svh items-center border-t border-linea py-24"
    >
      <div className="contenedor grid gap-14 lg:grid-cols-12 lg:gap-6">
        <div className="lg:col-span-5">
          <h2 id="titulo-acceso" className="text-seccion">
            Cada rol ve solo lo suyo
          </h2>
          <p className="mt-5 max-w-[46ch] text-tenue">
            Cada persona entra al portal con su cuenta. Un docente nunca consulta estudiantes de
            otra institución: el servidor aplica ese límite en cada petición.
          </p>
          <EnlaceBoton href="/login" tamano="grande" className="mt-10 w-full sm:w-auto">
            Entrar al portal
            <ArrowRight aria-hidden="true" size={20} />
          </EnlaceBoton>
        </div>
        <dl className="lg:col-span-6 lg:col-start-7">
          {ROLES.map((rol) => (
            <div
              key={rol.nombre}
              className="grid gap-1 border-t border-linea py-6 last:border-b sm:grid-cols-[14rem_1fr] sm:gap-6"
            >
              <dt className="text-lg font-medium">{rol.nombre}</dt>
              <dd className="text-tenue">{rol.alcance}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
