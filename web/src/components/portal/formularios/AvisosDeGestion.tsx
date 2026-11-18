import Link from "next/link";
import { CircleAlert, Eye, SearchX, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import { AvisoDeLista } from "@/components/portal/AvisoDeLista";
import { BotonRecargar } from "./BotonRecargar";

type PropsDeRecurso = {
  recurso: string;
  rutaDeLista: string;
};

function EnlaceALaLista({ recurso, rutaDeLista }: PropsDeRecurso) {
  return (
    <Link href={rutaDeLista} className="font-medium text-acento">
      Ver la lista de {recurso}
    </Link>
  );
}

export function AvisoSoloLectura({
  recurso,
  rutaDeLista,
  quienes = "el administrador y el responsable institucional",
}: PropsDeRecurso & { quienes?: string }) {
  return (
    <div className="mt-8">
      <AvisoDeLista
        urgente
        icono={<Eye size={20} />}
        titulo="Tu rol solo permite consultar"
        accion={<EnlaceALaLista recurso={recurso} rutaDeLista={rutaDeLista} />}
      >
        Solo {quienes} {quienes.includes(" y ") ? "pueden" : "puede"} crear o modificar {recurso}.
      </AvisoDeLista>
    </div>
  );
}

export function AvisoSinServicio() {
  return (
    <div className="mt-8">
      <AvisoDeLista
        urgente
        icono={<CircleAlert size={20} />}
        titulo="No pudimos cargar los datos"
        accion={<BotonRecargar />}
      >
        El servidor de TIPI 3.0 no responde en este momento. Tu sesión sigue guardada.
      </AvisoDeLista>
    </div>
  );
}

export function AvisoNoEncontrado({
  titulo,
  recurso,
  rutaDeLista,
}: PropsDeRecurso & { titulo: string }) {
  return (
    <div className="mt-8">
      <AvisoDeLista
        urgente
        icono={<SearchX size={20} />}
        titulo={titulo}
        accion={<EnlaceALaLista recurso={recurso} rutaDeLista={rutaDeLista} />}
      >
        Es posible que se haya eliminado o que la dirección esté incompleta.
      </AvisoDeLista>
    </div>
  );
}

export function AvisoDenegado({
  mensaje,
  recurso,
  rutaDeLista,
}: PropsDeRecurso & { mensaje: string }) {
  return (
    <div className="mt-8">
      <AvisoDeLista
        urgente
        icono={<ShieldAlert size={20} />}
        titulo="No tienes acceso a este registro"
        accion={<EnlaceALaLista recurso={recurso} rutaDeLista={rutaDeLista} />}
      >
        {mensaje}
      </AvisoDeLista>
    </div>
  );
}

export function AvisoSinAcceso({ quienes }: { quienes: string }) {
  return (
    <div className="mt-8">
      <AvisoDeLista
        urgente
        icono={<ShieldAlert size={20} />}
        titulo="Tu rol no tiene acceso a esta sección"
        accion={
          <Link href="/portal" className="font-medium text-acento">
            Volver al panel principal
          </Link>
        }
      >
        Esta sección es solo para {quienes}. Si crees que es un error, avisa a la coordinación de
        TIPI 3.0.
      </AvisoDeLista>
    </div>
  );
}

export function AvisoDeRequisito({
  titulo,
  children,
  recurso,
  rutaDeLista,
}: PropsDeRecurso & { titulo: string; children: ReactNode }) {
  return (
    <div className="mt-8">
      <AvisoDeLista
        icono={<CircleAlert size={20} />}
        titulo={titulo}
        accion={<EnlaceALaLista recurso={recurso} rutaDeLista={rutaDeLista} />}
      >
        {children}
      </AvisoDeLista>
    </div>
  );
}
