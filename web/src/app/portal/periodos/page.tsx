import type { Metadata } from "next";
import { CalendarRange, CircleAlert, Plus } from "lucide-react";
import { Suspense } from "react";
import { AvisoDeLista } from "@/components/portal/AvisoDeLista";
import { BotonRecargar } from "@/components/portal/formularios/BotonRecargar";
import { EsqueletoLista } from "@/components/portal/EsqueletoLista";
import { TablaPeriodos } from "@/components/portal/periodos/TablaPeriodos";
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import { listarPeriodos } from "@/lib/api/clubes";
import { puedeGestionarPeriodos } from "@/lib/portal/permisos";
import { RUTA_PERIODOS } from "@/lib/portal/reglas-periodos";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Períodos académicos",
};

async function AccionPrincipal() {
  const usuario = await exigirSesion();

  if (!puedeGestionarPeriodos(usuario?.rol)) {
    return null;
  }

  return (
    <EnlaceBoton href={`${RUTA_PERIODOS}/nuevo`} className="shrink-0">
      <Plus aria-hidden="true" size={18} />
      Nuevo período
    </EnlaceBoton>
  );
}

async function Resultados() {
  const [usuario, periodos] = await Promise.all([exigirSesion(), listarPeriodos()]);
  const gestionable = puedeGestionarPeriodos(usuario?.rol);

  if (!periodos) {
    return (
      <AvisoDeLista
        urgente
        icono={<CircleAlert size={20} />}
        titulo="No pudimos cargar los períodos"
        accion={<BotonRecargar />}
      >
        El servidor de TIPI 3.0 no responde en este momento. Tu sesión sigue guardada.
      </AvisoDeLista>
    );
  }

  if (periodos.length === 0) {
    return (
      <AvisoDeLista icono={<CalendarRange size={20} />} titulo="Todavía no hay períodos académicos">
        {gestionable
          ? "Registra el primero con el botón Nuevo período. Los clubes siempre pertenecen a un período."
          : "Cuando la administración registre el primer período aparecerá en esta lista."}
      </AvisoDeLista>
    );
  }

  const vigente = periodos.find((periodo) => periodo.activo);

  return (
    <>
      <p role="status" className="text-[0.9375rem] text-tenue">
        {periodos.length === 1 ? "1 período registrado" : `${periodos.length} períodos registrados`}
        {vigente ? `. El vigente es ${vigente.nombre}.` : ". Ninguno está marcado como vigente."}
      </p>
      <div className="mt-4">
        <TablaPeriodos periodos={periodos} gestionable={gestionable} />
      </div>
    </>
  );
}

export default function PaginaPeriodos() {
  return (
    <div className="mx-auto w-full max-w-[78rem] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-medium tracking-tight">Períodos académicos</h1>
          <p className="mt-3 max-w-[70ch] text-tenue">
            Cada club funciona dentro de un período. El período vigente es el que se propone al
            crear clubes nuevos.
          </p>
        </div>
        <Suspense fallback={null}>
          <AccionPrincipal />
        </Suspense>
      </div>
      <div className="mt-8">
        <Suspense fallback={<EsqueletoLista mensaje="Cargando los períodos académicos." />}>
          <Resultados />
        </Suspense>
      </div>
    </div>
  );
}
