import { useId } from "react";
import { ETIQUETA_CONTROL, MENSAJE_CONTROL } from "@/components/ui/estilos-control";

type Props = {
  etiqueta: string;
  valor: string;
  ayuda?: string;
};

export function DatoFijo({ etiqueta, valor, ayuda }: Props) {
  const id = useId();

  return (
    <div className="min-w-0">
      <p id={id} className={ETIQUETA_CONTROL}>
        {etiqueta}
      </p>
      <p
        aria-labelledby={id}
        className="mt-2 flex h-12 items-center rounded-control border border-dashed border-linea px-3.5 text-tenue"
      >
        <span className="truncate">{valor}</span>
      </p>
      <p className={`${MENSAJE_CONTROL} text-tenue`}>{ayuda}</p>
    </div>
  );
}
