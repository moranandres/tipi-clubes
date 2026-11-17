type DatosDeIdentidad = {
  nombres?: string;
  apellidos?: string;
  codigo?: string;
};

export type Identidad = {
  principal: string;
  codigo: string | null;
};

const SIN_CODIGO = "Estudiante sin código";

export function identidadDe(
  { nombres, apellidos, codigo }: DatosDeIdentidad,
  minima: boolean,
): Identidad {
  const nombre = minima ? "" : [apellidos, nombres].filter(Boolean).join(" ");
  if (nombre) {
    return { principal: nombre, codigo: codigo ?? null };
  }
  return { principal: codigo ?? SIN_CODIGO, codigo: null };
}
