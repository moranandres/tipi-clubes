export const BASE_BOTON =
  "inline-flex select-none items-center justify-center gap-2 rounded-control font-medium transition-[transform,background-color,color] duration-150 ease-salida active:scale-[0.97]";

export const TAMANOS_BOTON = {
  normal: "h-11 px-5 text-[0.9375rem]",
  grande: "h-14 px-7 text-lg lg:h-16 lg:px-8 lg:text-xl",
} as const;

export const VARIANTES_BOTON = {
  primario: "bg-acento text-sobre-acento hover:bg-acento/90",
  secundario: "bg-superficie text-tinta hover:bg-superficie-alta",
} as const;

export type TamanoBoton = keyof typeof TAMANOS_BOTON;
export type VarianteBoton = keyof typeof VARIANTES_BOTON;
