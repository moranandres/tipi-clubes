import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";
import type { Aviso } from "./ganchos";

type Props = {
  aviso: Aviso | null;
  className?: string;
};

export function ZonaDeAviso({ aviso, className = "" }: Props) {
  return (
    <div className={`min-h-6 text-sm ${className}`}>
      {aviso ? (
        <div
          key={aviso.clave}
          role={aviso.tipo === "error" ? "alert" : "status"}
          className="entrada-mensaje"
        >
          <p
            className={`flex items-start gap-2 ${aviso.tipo === "error" ? "text-error" : "text-exito"}`}
          >
            {aviso.tipo === "error" ? (
              <CircleAlert aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
            ) : (
              <CircleCheck aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
            )}
            <span className="min-w-0 break-words">{aviso.texto}</span>
          </p>
          {aviso.detalles.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-1.5">
              {aviso.detalles.map((detalle) => (
                <li
                  key={detalle}
                  className={`flex items-start gap-2 ${aviso.tipo === "error" ? "text-error" : "text-aviso"}`}
                >
                  <TriangleAlert aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
                  <span className="min-w-0 break-words">{detalle}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
