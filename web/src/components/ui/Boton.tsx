import { LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from "react";
import {
  BASE_BOTON,
  TAMANOS_BOTON,
  VARIANTES_BOTON,
  type TamanoBoton,
  type VarianteBoton,
} from "./estilos-boton";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children: ReactNode;
  cargando?: boolean;
  textoCargando?: string;
  tamano?: TamanoBoton;
  variante?: VarianteBoton;
};

const CAPA =
  "col-start-1 row-start-1 inline-flex items-center justify-center gap-2 transition-[opacity,transform,filter] duration-150 ease-salida motion-reduce:transition-opacity";

const CAPA_OCULTA = "opacity-0 blur-[2px] motion-reduce:translate-y-0 motion-reduce:blur-none";

export function Boton({
  children,
  cargando = false,
  textoCargando = "Procesando",
  tamano = "normal",
  variante = "primario",
  className = "",
  type = "button",
  onClick,
  ...resto
}: Props) {
  function alPulsar(evento: MouseEvent<HTMLButtonElement>) {
    if (cargando) {
      evento.preventDefault();
      return;
    }
    onClick?.(evento);
  }

  return (
    <button
      {...resto}
      type={type}
      onClick={alPulsar}
      aria-busy={cargando}
      aria-disabled={cargando || undefined}
      className={`${BASE_BOTON} ${TAMANOS_BOTON[tamano]} ${VARIANTES_BOTON[variante]} disabled:pointer-events-none disabled:opacity-50 aria-busy:cursor-progress ${className}`}
    >
      <span className="grid">
        <span
          aria-hidden={cargando || undefined}
          className={`${CAPA} ${cargando ? `${CAPA_OCULTA} -translate-y-1.5` : ""}`}
        >
          {children}
        </span>
        <span
          aria-hidden={cargando ? undefined : true}
          className={`${CAPA} ${cargando ? "" : `${CAPA_OCULTA} translate-y-1.5`}`}
        >
          <LoaderCircle
            aria-hidden="true"
            size={18}
            className={cargando ? "animate-spin [animation-duration:600ms]" : ""}
          />
          {textoCargando}
        </span>
      </span>
    </button>
  );
}
