import { useId, type TextareaHTMLAttributes } from "react";
import { CONTROL, ETIQUETA_CONTROL, MENSAJE_CONTROL } from "./estilos-control";

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> & {
  etiqueta: string;
  error?: string;
  ayuda?: string;
};

export function CampoTextoLargo({
  etiqueta,
  error,
  ayuda,
  className = "",
  rows = 4,
  ...resto
}: Props) {
  const id = useId();
  const idMensaje = `${id}-mensaje`;

  return (
    <div className="min-w-0">
      <label htmlFor={id} className={ETIQUETA_CONTROL}>
        {etiqueta}
      </label>
      <textarea
        {...resto}
        id={id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || ayuda ? idMensaje : undefined}
        className={`${CONTROL} mt-2 block resize-y py-3 leading-relaxed ${className}`}
      />
      <p id={idMensaje} className={`${MENSAJE_CONTROL} ${error ? "text-error" : "text-tenue"}`}>
        {error ? <span className="entrada-mensaje inline-block">{error}</span> : ayuda}
      </p>
    </div>
  );
}
