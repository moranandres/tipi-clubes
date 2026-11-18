import { esRolDeUsuario, rolRequiereInstitucion } from "./filtros-usuarios";
import { enteroDe, errorDeCorreo, errorDeObligatorio } from "./validacion";

export type DatosDeUsuario = {
  username: string;
  email: string;
  nombres: string;
  apellidos: string;
  rolCodigo: string;
  institucionId: string;
  passwordTemporal: string;
};

export type CampoDeUsuario = keyof DatosDeUsuario;
export type ErroresDeUsuario = Partial<Record<CampoDeUsuario, string>>;

export type DatosDeClave = {
  passwordTemporal: string;
};

export const CAMPOS_DE_USUARIO: readonly CampoDeUsuario[] = [
  "username",
  "email",
  "nombres",
  "apellidos",
  "rolCodigo",
  "institucionId",
  "passwordTemporal",
];

export const CAMPOS_AL_EDITAR_USUARIO: readonly CampoDeUsuario[] = [
  "email",
  "nombres",
  "apellidos",
  "rolCodigo",
  "institucionId",
];

export const LIMITES_DE_USUARIO = {
  username: 50,
  email: 150,
  nombres: 100,
  apellidos: 100,
  passwordTemporal: 128,
} as const;

const USUARIO_VALIDO = /^[A-Za-z0-9._-]{3,50}$/;
const CLAVE_VALIDA = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,128}$/;

export const MENSAJE_DE_USUARIO =
  "El usuario debe tener entre 3 y 50 caracteres: letras, números, punto, guion o guion bajo";
export const MENSAJE_DE_CLAVE =
  "La contraseña debe tener entre 10 y 128 caracteres, con mayúscula, minúscula y número";

const MAYUSCULAS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const MINUSCULAS = "abcdefghijkmnopqrstuvwxyz";
const DIGITOS = "23456789";
const SIMBOLOS = "-_.";
const LONGITUD_DE_CLAVE_GENERADA = 14;

export function errorDeClaveTemporal(valor: string): string | undefined {
  if (!valor) {
    return "La contraseña temporal es obligatoria";
  }
  return CLAVE_VALIDA.test(valor) ? undefined : MENSAJE_DE_CLAVE;
}

function errorDeUsuario(valor: string): string | undefined {
  const texto = valor.trim();
  if (!texto) {
    return "El usuario es obligatorio";
  }
  return USUARIO_VALIDO.test(texto) ? undefined : MENSAJE_DE_USUARIO;
}

function errorDeInstitucion(rol: string, institucionId: string): string | undefined {
  if (rolRequiereInstitucion(rol) && !enteroDe(institucionId)) {
    return `El rol ${rol} requiere una institución.`;
  }
  return undefined;
}

export function validarUsuario(datos: DatosDeUsuario, esNuevo: boolean): ErroresDeUsuario {
  const errores: ErroresDeUsuario = {
    email: datos.email.trim()
      ? errorDeCorreo(datos.email, LIMITES_DE_USUARIO.email)
      : "El correo es obligatorio",
    nombres: errorDeObligatorio(
      datos.nombres,
      "Los nombres son obligatorios",
      LIMITES_DE_USUARIO.nombres,
    ),
    apellidos: errorDeObligatorio(
      datos.apellidos,
      "Los apellidos son obligatorios",
      LIMITES_DE_USUARIO.apellidos,
    ),
    rolCodigo: esRolDeUsuario(datos.rolCodigo) ? undefined : "El rol es obligatorio",
    institucionId: errorDeInstitucion(datos.rolCodigo, datos.institucionId),
  };

  if (esNuevo) {
    errores.username = errorDeUsuario(datos.username);
    errores.passwordTemporal = errorDeClaveTemporal(datos.passwordTemporal);
  }

  return errores;
}

function caracterAlAzar(alfabeto: string, aleatorios: Uint32Array, indice: number): string {
  return alfabeto[aleatorios[indice] % alfabeto.length];
}

export function generarClaveTemporal(): string {
  const todos = MAYUSCULAS + MINUSCULAS + DIGITOS + SIMBOLOS;
  const aleatorios = new Uint32Array(LONGITUD_DE_CLAVE_GENERADA * 2);
  crypto.getRandomValues(aleatorios);

  const caracteres = [
    caracterAlAzar(MAYUSCULAS, aleatorios, 0),
    caracterAlAzar(MINUSCULAS, aleatorios, 1),
    caracterAlAzar(DIGITOS, aleatorios, 2),
  ];
  for (let indice = caracteres.length; indice < LONGITUD_DE_CLAVE_GENERADA; indice += 1) {
    caracteres.push(caracterAlAzar(todos, aleatorios, indice));
  }

  for (let indice = caracteres.length - 1; indice > 0; indice -= 1) {
    const destino = aleatorios[LONGITUD_DE_CLAVE_GENERADA + indice] % (indice + 1);
    [caracteres[indice], caracteres[destino]] = [caracteres[destino], caracteres[indice]];
  }

  return caracteres.join("");
}
