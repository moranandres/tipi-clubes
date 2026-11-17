import { NOMBRES_DE_NIVEL, type NivelCurso } from "./filtros-cursos";

export type OpcionDeFormulario = {
  valor: string;
  texto: string;
};

export type OpcionDeCurso = OpcionDeFormulario & {
  nivel: string;
};

type DocenteConNombre = {
  id?: number;
  nombres?: string;
  apellidos?: string;
};

type RegistroConNombre = {
  id?: number;
  nombre?: string;
};

type EstudianteParaOpcion = {
  id?: number;
  nombres?: string;
  apellidos?: string;
  codigoInterno?: string;
  cursoEtiqueta?: string;
};

type CursoParaOpcion = {
  id?: number;
  nombre?: string;
  nivel?: NivelCurso;
  cuposDisponibles?: number;
};

type InscripcionParaOpcion = {
  id?: number;
  estudianteNombres?: string;
  estudianteApellidos?: string;
  estudianteCodigo?: string;
  cursoEducativoEtiqueta?: string;
  clubNombre?: string;
  periodoNombre?: string;
};

const SEPARADOR = " · ";

function unir(partes: (string | undefined | null)[]): string {
  return partes.filter(Boolean).join(SEPARADOR);
}

function nombreCompleto(apellidos?: string, nombres?: string): string {
  return [apellidos, nombres].filter(Boolean).join(" ");
}

export function opcionesDeDocentes(docentes: readonly DocenteConNombre[]): OpcionDeFormulario[] {
  return docentes
    .filter((docente) => typeof docente.id === "number")
    .map((docente) => ({
      valor: String(docente.id),
      texto: [docente.apellidos, docente.nombres].filter(Boolean).join(" ") || "Docente sin nombre",
    }));
}

export function opcionesConNombre(registros: readonly RegistroConNombre[]): OpcionDeFormulario[] {
  return registros
    .filter((registro) => typeof registro.id === "number")
    .map((registro) => ({
      valor: String(registro.id),
      texto: registro.nombre ?? "Sin nombre",
    }));
}

export function opcionesDeEstudiantes(
  estudiantes: readonly EstudianteParaOpcion[],
): OpcionDeFormulario[] {
  return estudiantes
    .filter((estudiante) => typeof estudiante.id === "number")
    .map((estudiante) => ({
      valor: String(estudiante.id),
      texto: unir([
        nombreCompleto(estudiante.apellidos, estudiante.nombres),
        estudiante.cursoEtiqueta,
        estudiante.codigoInterno,
      ]),
    }));
}

export function opcionesDeCursos(cursos: readonly CursoParaOpcion[]): OpcionDeCurso[] {
  return cursos
    .filter((curso) => typeof curso.id === "number")
    .map((curso) => ({
      valor: String(curso.id),
      nivel: curso.nivel ?? "",
      texto: unir([
        curso.nombre ?? "Curso",
        curso.nivel ? NOMBRES_DE_NIVEL[curso.nivel] : null,
        typeof curso.cuposDisponibles === "number"
          ? curso.cuposDisponibles > 0
            ? `${curso.cuposDisponibles} ${curso.cuposDisponibles === 1 ? "cupo" : "cupos"}`
            : "sin cupos"
          : null,
      ]),
    }));
}

export function opcionesDeIntegrantes(
  inscripciones: readonly InscripcionParaOpcion[],
): OpcionDeFormulario[] {
  return inscripciones
    .filter((inscripcion) => typeof inscripcion.id === "number")
    .map((inscripcion) => ({
      valor: String(inscripcion.id),
      texto: unir([
        nombreCompleto(inscripcion.estudianteApellidos, inscripcion.estudianteNombres),
        inscripcion.cursoEducativoEtiqueta,
        inscripcion.estudianteCodigo,
      ]),
    }));
}

export function opcionesDeClubesInscritos(
  inscripciones: readonly InscripcionParaOpcion[],
): OpcionDeFormulario[] {
  return inscripciones
    .filter((inscripcion) => typeof inscripcion.id === "number")
    .map((inscripcion) => ({
      valor: String(inscripcion.id),
      texto: unir([inscripcion.clubNombre ?? "Club", inscripcion.periodoNombre]),
    }));
}

export function conOpcionActual(
  opciones: OpcionDeFormulario[],
  valor: string,
  texto: string,
): OpcionDeFormulario[] {
  if (!valor || opciones.some((opcion) => opcion.valor === valor)) {
    return opciones;
  }
  return [{ valor, texto }, ...opciones];
}

type CuentaParaOpcion = {
  id?: number;
  username?: string;
  nombres?: string;
  apellidos?: string;
};

export function opcionesDeCuentas(cuentas: readonly CuentaParaOpcion[]): OpcionDeFormulario[] {
  return cuentas
    .filter((cuenta) => typeof cuenta.id === "number")
    .map((cuenta) => ({
      valor: String(cuenta.id),
      texto: unir([nombreCompleto(cuenta.apellidos, cuenta.nombres), cuenta.username]) || "Cuenta sin nombre",
    }));
}
