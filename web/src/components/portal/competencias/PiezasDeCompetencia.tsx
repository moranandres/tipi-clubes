import { Award } from "lucide-react";
import { PuntoDeEstado } from "@/components/portal/PuntoDeEstado";
import {
  NOMBRES_DE_NIVEL_DE_CATEGORIA,
  PUNTOS_DE_NIVEL_DE_CATEGORIA,
  type NivelCategoria,
} from "@/lib/portal/filtros-competencias";
import { textoDePuesto } from "@/lib/portal/reglas-competencias";

export const PUNTO_ACTIVA = "bg-exito";
export const PUNTO_INACTIVA = "bg-tenue";

export function NivelDeCategoria({ nivel }: { nivel?: NivelCategoria }) {
  if (!nivel) {
    return null;
  }
  return (
    <PuntoDeEstado punto={PUNTOS_DE_NIVEL_DE_CATEGORIA[nivel]}>
      {NOMBRES_DE_NIVEL_DE_CATEGORIA[nivel]}
    </PuntoDeEstado>
  );
}

export function EstadoDeCatalogo({ activa, femenino = true }: { activa?: boolean; femenino?: boolean }) {
  return activa ? (
    <PuntoDeEstado punto={PUNTO_ACTIVA}>{femenino ? "Activa" : "Activo"}</PuntoDeEstado>
  ) : (
    <PuntoDeEstado punto={PUNTO_INACTIVA}>{femenino ? "Inactiva" : "Inactivo"}</PuntoDeEstado>
  );
}

export function ResultadoDeParticipacion({
  puesto,
  reconocimiento,
}: {
  puesto?: number;
  reconocimiento?: string;
}) {
  const texto = [textoDePuesto(puesto), reconocimiento].filter(Boolean).join(" · ");
  if (!texto) {
    return <span className="text-tenue">Sin resultado</span>;
  }
  return (
    <span className="inline-flex min-w-0 items-start gap-1.5">
      <Award aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-aviso" />
      <span className="min-w-0 break-words">{texto}</span>
    </span>
  );
}
