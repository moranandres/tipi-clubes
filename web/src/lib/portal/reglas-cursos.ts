import {
  MODALIDADES_DE_CURSO,
  NIVELES_DE_CURSO,
  type EstadoCurso,
  type ModalidadCurso,
  type NivelCurso,
} from "./filtros-cursos";
import {
  esFechaValida,
  esHoraValida,
  fechaCorta,
  horaCorta,
  minutosDe,
  nombreDeDia,
} from "./tiempo";
import { enteroDe } from "./validacion";

export type DatosDeCurso = {
  clubId: string;
  nombre: string;
  descripcion: string;
  nivel: string;
  modalidad: string;
  lugar: string;
  enlaceVirtual: string;
  fechaInicio: string;
  fechaFin: string;
  duracionHoras: string;
  cupoMaximo: string;
};

export type CampoDeCurso = keyof DatosDeCurso;
export type ErroresDeCurso = Partial<Record<CampoDeCurso, string>>;

export const CAMPOS_DE_CURSO: readonly CampoDeCurso[] = [
  "clubId",
  "nombre",
  "descripcion",
  "nivel",
  "modalidad",
  "lugar",
  "enlaceVirtual",
  "fechaInicio",
  "fechaFin",
  "duracionHoras",
  "cupoMaximo",
];

export const LIMITES_DE_CURSO = {
  nombre: 150,
  descripcion: 2000,
  lugar: 150,
  enlaceVirtual: 300,
  duracionMinima: 1,
  duracionMaxima: 500,
  cupoMinimo: 1,
  cupoMaximo: 500,
} as const;

export const TIPOS_DE_SESION = ["PRESENCIAL", "VIRTUAL"] as const;
export type TipoSesion = (typeof TIPOS_DE_SESION)[number];

export const NOMBRES_DE_TIPO_DE_SESION: Record<TipoSesion, string> = {
  PRESENCIAL: "Presencial",
  VIRTUAL: "Virtual",
};

export const TRANSICIONES_DE_CURSO: Record<EstadoCurso, readonly EstadoCurso[]> = {
  PLANIFICADO: ["EN_CURSO", "CANCELADO"],
  EN_CURSO: ["FINALIZADO", "CANCELADO"],
  FINALIZADO: [],
  CANCELADO: [],
};

const ESTADOS_EDITABLES: readonly EstadoCurso[] = ["PLANIFICADO", "EN_CURSO"];
const ENLACE_VALIDO = /^https:\/\/[^\s<>"]+$/;
const MINUTOS_MINIMOS_DE_SESION = 15;
const MINUTOS_MAXIMOS_DE_SESION = 360;

export function cursoEsEditable(estado?: EstadoCurso): boolean {
  return Boolean(estado && ESTADOS_EDITABLES.includes(estado));
}

export function exigeMotivoDeCurso(nuevo: EstadoCurso): boolean {
  return nuevo === "CANCELADO";
}

export function esModalidad(valor: string): valor is ModalidadCurso {
  return MODALIDADES_DE_CURSO.includes(valor as ModalidadCurso);
}

export function esNivel(valor: string): valor is NivelCurso {
  return NIVELES_DE_CURSO.includes(valor as NivelCurso);
}

export function usaLugar(modalidad: string): boolean {
  return modalidad === "PRESENCIAL" || modalidad === "HIBRIDO";
}

export function usaEnlace(modalidad: string): boolean {
  return modalidad === "ONLINE" || modalidad === "HIBRIDO";
}

export function tiposDeSesionPara(modalidad?: string): readonly TipoSesion[] {
  if (modalidad === "ONLINE") {
    return ["VIRTUAL"];
  }
  if (modalidad === "PRESENCIAL") {
    return ["PRESENCIAL"];
  }
  return TIPOS_DE_SESION;
}

export type PeriodoDelClub = {
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
};

export type ClubParaCurso = {
  valor: string;
  texto: string;
  cupoMaximo: number | null;
  periodo: PeriodoDelClub | null;
};

type ClubConPeriodo = {
  id?: number;
  nombre?: string;
  institucionNombre?: string;
  periodoId?: number;
  periodoNombre?: string;
  cupoMaximo?: number;
};

type PeriodoRegistrado = {
  id?: number;
  nombre?: string;
  fechaInicio?: string;
  fechaFin?: string;
};

export function clubParaCurso(
  club: ClubConPeriodo,
  periodos: readonly PeriodoRegistrado[],
  conInstitucion: boolean,
): ClubParaCurso {
  const periodo = periodos.find((candidato) => candidato.id === club.periodoId);
  const partes = [
    club.nombre ?? "Club sin nombre",
    conInstitucion ? club.institucionNombre : null,
    club.periodoNombre,
  ];

  return {
    valor: String(club.id ?? ""),
    texto: partes.filter(Boolean).join(" · "),
    cupoMaximo: typeof club.cupoMaximo === "number" ? club.cupoMaximo : null,
    periodo:
      periodo?.fechaInicio && periodo.fechaFin
        ? {
            nombre: periodo.nombre ?? club.periodoNombre ?? "",
            fechaInicio: periodo.fechaInicio,
            fechaFin: periodo.fechaFin,
          }
        : null,
  };
}

type ContextoDeCurso = {
  esNuevo: boolean;
  inscritosActivos: number;
  cupoDelClub: number | null;
  periodo: PeriodoDelClub | null;
};

export function validarCurso(datos: DatosDeCurso, contexto: ContextoDeCurso): ErroresDeCurso {
  const errores: ErroresDeCurso = {};

  if (contexto.esNuevo && !enteroDe(datos.clubId)) {
    errores.clubId = "Elige el club al que pertenece el curso.";
  }

  const nombre = datos.nombre.trim();
  if (!nombre) {
    errores.nombre = "Escribe el nombre del curso.";
  } else if (nombre.length > LIMITES_DE_CURSO.nombre) {
    errores.nombre = `El nombre admite hasta ${LIMITES_DE_CURSO.nombre} caracteres.`;
  }

  if (datos.descripcion.trim().length > LIMITES_DE_CURSO.descripcion) {
    errores.descripcion = `La descripción admite hasta ${LIMITES_DE_CURSO.descripcion} caracteres.`;
  }

  if (!esNivel(datos.nivel)) {
    errores.nivel = "Elige el nivel del curso.";
  }

  if (!esModalidad(datos.modalidad)) {
    errores.modalidad = "Elige la modalidad del curso.";
  }

  if (usaLugar(datos.modalidad)) {
    const lugar = datos.lugar.trim();
    if (!lugar) {
      errores.lugar = "Escribe el lugar donde se dicta el curso.";
    } else if (lugar.length > LIMITES_DE_CURSO.lugar) {
      errores.lugar = `El lugar admite hasta ${LIMITES_DE_CURSO.lugar} caracteres.`;
    }
  }

  if (usaEnlace(datos.modalidad)) {
    const enlace = datos.enlaceVirtual.trim();
    if (!enlace) {
      errores.enlaceVirtual = "Escribe el enlace de la sala virtual.";
    } else if (enlace.length > LIMITES_DE_CURSO.enlaceVirtual) {
      errores.enlaceVirtual = `El enlace admite hasta ${LIMITES_DE_CURSO.enlaceVirtual} caracteres.`;
    } else if (!ENLACE_VALIDO.test(enlace)) {
      errores.enlaceVirtual = "El enlace debe empezar con https:// y no llevar espacios.";
    }
  }

  if (!datos.fechaInicio) {
    errores.fechaInicio = "Indica la fecha de inicio.";
  } else if (!esFechaValida(datos.fechaInicio)) {
    errores.fechaInicio = "La fecha de inicio no es válida.";
  }

  if (!datos.fechaFin) {
    errores.fechaFin = "Indica la fecha de fin.";
  } else if (!esFechaValida(datos.fechaFin)) {
    errores.fechaFin = "La fecha de fin no es válida.";
  }

  if (!errores.fechaInicio && !errores.fechaFin) {
    if (datos.fechaFin < datos.fechaInicio) {
      errores.fechaFin = "La fecha de fin no puede ser anterior a la de inicio.";
    } else if (contexto.periodo) {
      const { fechaInicio, fechaFin } = contexto.periodo;
      const rango = `${fechaCorta(fechaInicio)} al ${fechaCorta(fechaFin)}`;
      if (datos.fechaInicio < fechaInicio || datos.fechaInicio > fechaFin) {
        errores.fechaInicio = `Debe estar dentro del período del club (${rango}).`;
      }
      if (datos.fechaFin < fechaInicio || datos.fechaFin > fechaFin) {
        errores.fechaFin = `Debe estar dentro del período del club (${rango}).`;
      }
    }
  }

  if (datos.duracionHoras.trim() !== "") {
    const duracion = enteroDe(datos.duracionHoras);
    if (
      duracion === null ||
      duracion < LIMITES_DE_CURSO.duracionMinima ||
      duracion > LIMITES_DE_CURSO.duracionMaxima
    ) {
      errores.duracionHoras = `La duración debe ser un número entero entre ${LIMITES_DE_CURSO.duracionMinima} y ${LIMITES_DE_CURSO.duracionMaxima} horas.`;
    }
  }

  const cupo = enteroDe(datos.cupoMaximo);
  if (datos.cupoMaximo.trim() === "") {
    errores.cupoMaximo = "Escribe el cupo máximo.";
  } else if (
    cupo === null ||
    cupo < LIMITES_DE_CURSO.cupoMinimo ||
    cupo > LIMITES_DE_CURSO.cupoMaximo
  ) {
    errores.cupoMaximo = `El cupo debe ser un número entero entre ${LIMITES_DE_CURSO.cupoMinimo} y ${LIMITES_DE_CURSO.cupoMaximo}.`;
  } else if (contexto.cupoDelClub !== null && cupo > contexto.cupoDelClub) {
    errores.cupoMaximo = `El cupo no puede superar el cupo del club (${contexto.cupoDelClub}).`;
  } else if (!contexto.esNuevo && cupo < contexto.inscritosActivos) {
    errores.cupoMaximo = `El cupo no puede ser menor que los ${contexto.inscritosActivos} participantes inscritos.`;
  }

  return errores;
}

export type DatosDeHorario = {
  diaSemana: string;
  horaInicio: string;
  horaFin: string;
  tipoSesion: string;
};

export type CampoDeHorario = keyof DatosDeHorario;
export type ErroresDeHorario = Partial<Record<CampoDeHorario, string>>;

export const CAMPOS_DE_HORARIO: readonly CampoDeHorario[] = [
  "diaSemana",
  "horaInicio",
  "horaFin",
  "tipoSesion",
];

export type HorarioRegistrado = {
  id?: number;
  diaSemana?: number;
  horaInicio?: string;
  horaFin?: string;
};

type ContextoDeHorario = {
  modalidad?: string;
  otros: readonly HorarioRegistrado[];
};

export function validarHorario(
  datos: DatosDeHorario,
  contexto: ContextoDeHorario,
): ErroresDeHorario {
  const errores: ErroresDeHorario = {};

  const dia = enteroDe(datos.diaSemana);
  if (!dia || dia < 1 || dia > 7) {
    errores.diaSemana = "Elige el día de la semana.";
  }

  if (!datos.horaInicio) {
    errores.horaInicio = "Indica la hora de inicio.";
  } else if (!esHoraValida(datos.horaInicio)) {
    errores.horaInicio = "Escribe la hora con el formato 08:00.";
  }

  if (!datos.horaFin) {
    errores.horaFin = "Indica la hora de fin.";
  } else if (!esHoraValida(datos.horaFin)) {
    errores.horaFin = "Escribe la hora con el formato 10:00.";
  }

  const permitidos = tiposDeSesionPara(contexto.modalidad);
  if (!permitidos.includes(datos.tipoSesion as TipoSesion)) {
    errores.tipoSesion =
      permitidos.length === 1
        ? `Este curso solo admite sesiones de tipo ${NOMBRES_DE_TIPO_DE_SESION[permitidos[0]].toLowerCase()}.`
        : "Elige el tipo de sesión.";
  }

  if (errores.horaInicio || errores.horaFin) {
    return errores;
  }

  const inicio = minutosDe(datos.horaInicio);
  const fin = minutosDe(datos.horaFin);
  const duracion = fin - inicio;

  if (duracion <= 0) {
    errores.horaFin = "La hora de fin debe ser posterior a la de inicio.";
    return errores;
  }
  if (duracion < MINUTOS_MINIMOS_DE_SESION || duracion > MINUTOS_MAXIMOS_DE_SESION) {
    errores.horaFin = "Cada sesión debe durar entre 15 minutos y 6 horas.";
    return errores;
  }

  if (!errores.diaSemana && cruceDeHorario(datos, contexto.otros)) {
    errores.horaInicio = "Se cruza con otro horario.";
  }

  return errores;
}

export function cruceDeHorario(
  datos: DatosDeHorario,
  otros: readonly HorarioRegistrado[],
): string | null {
  const dia = enteroDe(datos.diaSemana);
  if (!dia || !esHoraValida(datos.horaInicio) || !esHoraValida(datos.horaFin)) {
    return null;
  }

  const inicio = minutosDe(datos.horaInicio);
  const fin = minutosDe(datos.horaFin);
  const cruce = otros.find(
    (otro) =>
      otro.diaSemana === dia &&
      otro.horaInicio &&
      otro.horaFin &&
      minutosDe(horaCorta(otro.horaInicio)) < fin &&
      inicio < minutosDe(horaCorta(otro.horaFin)),
  );

  return cruce
    ? `El horario se cruza con otro de este curso: ${nombreDeDia(cruce.diaSemana)}, ${horaCorta(cruce.horaInicio)} a ${horaCorta(cruce.horaFin)}.`
    : null;
}
