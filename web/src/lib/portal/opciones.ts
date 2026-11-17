export type OpcionDeFormulario = {
  valor: string;
  texto: string;
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
