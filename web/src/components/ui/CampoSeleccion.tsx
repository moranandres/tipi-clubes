import { ChevronDown } from "lucide-react";
import { useId, type SelectHTMLAttributes } from "react";
import { CONTROL, ETIQUETA_CONTROL, MENSAJE_CONTROL } from "./estilos-control";

type Opcion = {
  valor: string;
  texto: string;
};

type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, "id" | "children"> & {
  etiqueta: string;
  opciones: readonly Opcion[];
  textoSinEleccion: string;
  error?: string;
  ayuda?: string;
};

export function CampoSeleccion({
  etiqueta,
  opciones,
  textoSinEleccion,
  error,
  ayuda,
  className = "",
  ...resto
}: Props) {
  const id = useId();
  const idMensaje = `${id}-mensaje`;

  return (
    <div className="min-w-0">
      <label htmlFor={id} className={ETIQUETA_CONTROL}>
        {etiqueta}
      </label>
      <div className="relative mt-2">
        <select
          {...resto}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || ayuda ? idMensaje : undefined}
          className={`${CONTROL} h-12 appearance-none truncate pr-10 ${className}`}
        >
          <option value="">{textoSinEleccion}</option>
          {opciones.map((opcion) => (
            <option key={opcion.valor} value={opcion.valor}>
              {opcion.texto}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          size={18}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-tenue"
        />
      </div>
      <p id={idMensaje} className={`${MENSAJE_CONTROL} ${error ? "text-error" : "text-tenue"}`}>
        {error ? <span className="entrada-mensaje inline-block">{error}</span> : ayuda}
      </p>
    </div>
  );
}
