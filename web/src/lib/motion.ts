import type { Transition, Variants } from "framer-motion";

export const CURVA_SALIDA = [0.23, 1, 0.32, 1] as const;
export const CURVA_MOVIMIENTO = [0.77, 0, 0.175, 1] as const;

export const DURACION = {
  pulsacion: 0.14,
  rapida: 0.16,
  normal: 0.22,
  maxima: 0.28,
} as const;

export const resorte: Transition = {
  type: "spring",
  visualDuration: DURACION.maxima,
  bounce: 0.18,
};

export const resorteFirme: Transition = {
  type: "spring",
  visualDuration: DURACION.normal,
  bounce: 0,
};

export const salida: Transition = {
  duration: DURACION.rapida,
  ease: CURVA_SALIDA,
};

export const ESCALONADO = 0.05;

export const entradaGrupo: Variants = {
  oculto: {},
  visible: { transition: { staggerChildren: ESCALONADO } },
  fuera: { transition: { staggerChildren: 0 } },
};

export const entradaPieza: Variants = {
  oculto: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: resorte },
  fuera: { opacity: 0, scale: 0.97, transition: salida },
};

export const pulsacion = {
  scale: 0.97,
  transition: { duration: DURACION.pulsacion, ease: CURVA_SALIDA },
} as const;
