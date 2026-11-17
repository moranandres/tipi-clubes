import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from "react";
import { CONTROL, ETIQUETA_CONTROL, MENSAJE_CONTROL } from "./estilos-control";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  etiqueta: string;
  error?: string;
  ayuda?: string;
  accion?: ReactNode;
  ref?: Ref<HTMLInputElement>;
};

export function Campo({ etiqueta, error, ayuda, accion, className = "", ref, ...resto }: Props) {
  const id = useId();
  const idMensaje = `${id}-mensaje`;

  return (
    <div className="min-w-0">
      <label htmlFor={id} className={ETIQUETA_CONTROL}>
        {etiqueta}
      </label>
      <div className="relative mt-2">
        <input
          {...resto}
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || ayuda ? idMensaje : undefined}
          className={`${CONTROL} h-12 ${accion ? "pr-12" : ""} ${className}`}
        />
        {accion ? <div className="absolute inset-y-0 right-1 flex items-center">{accion}</div> : null}
      </div>
      <p id={idMensaje} className={`${MENSAJE_CONTROL} ${error ? "text-error" : "text-tenue"}`}>
        {error ? <span className="entrada-mensaje inline-block">{error}</span> : ayuda}
      </p>
    </div>
  );
}
