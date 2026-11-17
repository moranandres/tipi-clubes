import { Check, Circle, X } from "lucide-react";

export type EstadoDePaso = "hecho" | "actual" | "pendiente" | "detenido";

export type Paso = {
  titulo: string;
  detalle?: string;
  estado: EstadoDePaso;
};

type Props = {
  etiqueta: string;
  pasos: Paso[];
};

const MARCAS: Record<EstadoDePaso, string> = {
  hecho: "bg-exito text-fondo",
  actual: "bg-acento text-sobre-acento",
  pendiente: "border border-linea text-tenue",
  detenido: "bg-error text-fondo",
};

const LECTURAS: Record<EstadoDePaso, string> = {
  hecho: "completado",
  actual: "en curso",
  pendiente: "pendiente",
  detenido: "detenido",
};

function Marca({ estado }: { estado: EstadoDePaso }) {
  return (
    <span
      aria-hidden="true"
      className={`grid size-6 shrink-0 place-items-center rounded-full ${MARCAS[estado]}`}
    >
      {estado === "hecho" ? <Check size={14} strokeWidth={2.5} /> : null}
      {estado === "detenido" ? <X size={14} strokeWidth={2.5} /> : null}
      {estado === "actual" ? <Circle size={8} fill="currentColor" strokeWidth={0} /> : null}
    </span>
  );
}

export function PasosDeTramite({ etiqueta, pasos }: Props) {
  return (
    <ol aria-label={etiqueta} className="flex flex-col">
      {pasos.map((paso, indice) => (
        <li
          key={paso.titulo}
          aria-current={paso.estado === "actual" ? "step" : undefined}
          className="grid grid-cols-[auto_1fr] gap-x-3 pb-4 last:pb-0"
        >
          <span className="relative flex justify-center">
            <Marca estado={paso.estado} />
            {indice < pasos.length - 1 ? (
              <span
                aria-hidden="true"
                className={`absolute bottom-[-1rem] top-7 w-px ${paso.estado === "hecho" ? "bg-exito/60" : "bg-linea"}`}
              />
            ) : null}
          </span>
          <div className="min-w-0 pt-0.5">
            <p className={`font-medium ${paso.estado === "pendiente" ? "text-tenue" : ""}`}>
              {paso.titulo}
              <span className="sr-only">, {LECTURAS[paso.estado]}</span>
            </p>
            {paso.detalle ? (
              <p className="cifras mt-0.5 break-words text-sm text-tenue">{paso.detalle}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
