import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from "react";
import { CONTROL, ETIQUETA_CONTROL } from "./estilos-control";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  etiqueta: string;
  error?: string;
  accion?: ReactNode;
  ref?: Ref<HTMLInputElement>;
};

export function Campo({ etiqueta, error, accion, className = "", ref, ...resto }: Props) {
  const id = useId();
  const idError = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className={ETIQUETA_CONTROL}>
        {etiqueta}
      </label>
      <div className="relative mt-2">
        <input
          {...resto}
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? idError : undefined}
          className={`${CONTROL} h-12 ${accion ? "pr-12" : ""} ${className}`}
        />
        {accion ? <div className="absolute inset-y-0 right-1 flex items-center">{accion}</div> : null}
      </div>
      <p id={idError} className="mt-1.5 min-h-5 text-sm text-error">
        {error ? <span className="entrada-mensaje inline-block">{error}</span> : null}
      </p>
    </div>
  );
}
