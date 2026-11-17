import type { Metadata } from "next";
import { Suspense } from "react";
import { ProveedorDeBusqueda, ZonaDeResultados } from "@/components/portal/Busqueda";
import { EsqueletoFiltros } from "@/components/portal/ControlesDeFiltro";
import { EsqueletoLista } from "@/components/portal/EsqueletoLista";
import { FiltrosEstudiantes } from "@/components/portal/estudiantes/FiltrosEstudiantes";
import { ResultadosDeEstudiantes } from "@/components/portal/estudiantes/ResultadosDeEstudiantes";
import { listarInstitucionesParaFiltro } from "@/lib/api/clubes";
import { leerFiltrosDeEstudiantes } from "@/lib/portal/filtros-estudiantes";
import { tieneAlcanceGlobal } from "@/lib/portal/menu";
import type { ParametrosDeBusqueda } from "@/lib/portal/parametros";
import { esDocente, soloVeDatosMinimos } from "@/lib/portal/permisos";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Historial del estudiante",
};

type PropsConParametros = {
  parametros: Promise<ParametrosDeBusqueda>;
};

const ANCHOS_DE_FILTROS = ["md:min-w-[16rem] md:flex-1", "md:w-44", "md:w-40", "md:w-64"];

function alcanceDelHistorial(rol?: string): string {
  if (soloVeDatosMinimos(rol)) {
    return "Ves la trayectoria de todas las instituciones identificada solo por el código interno de cada estudiante.";
  }
  if (esDocente(rol)) {
    return "Ves a los estudiantes de tu institución; en cada historial solo aparecen los registros de los clubes que coordinas.";
  }
  if (tieneAlcanceGlobal(rol)) {
    return "Ves la trayectoria completa de los estudiantes de todas las instituciones.";
  }
  return "Ves la trayectoria completa de los estudiantes de tu institución.";
}

async function Alcance() {
  const usuario = await exigirSesion();

  return <p className="mt-2 max-w-[70ch] text-[0.9375rem] text-tenue">{alcanceDelHistorial(usuario?.rol)}</p>;
}

async function Filtros({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeEstudiantes(await parametros);
  const usuario = await exigirSesion();
  const instituciones = tieneAlcanceGlobal(usuario?.rol)
    ? await listarInstitucionesParaFiltro()
    : null;

  return (
    <FiltrosEstudiantes
      filtros={filtros}
      instituciones={instituciones}
      destino="historial"
      soloCodigo={soloVeDatosMinimos(usuario?.rol)}
    />
  );
}

async function Resultados({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeEstudiantes(await parametros);

  return <ResultadosDeEstudiantes filtros={filtros} destino="historial" />;
}

export default function PaginaHistorial({ searchParams }: PageProps<"/portal/historial">) {
  return (
    <div className="mx-auto w-full max-w-[78rem] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <h1 className="text-3xl font-medium tracking-tight">Historial del estudiante</h1>
      <p className="mt-3 max-w-[70ch] text-tenue">
        Busca a un estudiante para revisar su trayectoria: clubes, cursos, retiros, competencias y
        certificados en orden cronológico.
      </p>
      <Suspense fallback={<div className="mt-2 h-6" />}>
        <Alcance />
      </Suspense>
      <ProveedorDeBusqueda>
        <Suspense fallback={<EsqueletoFiltros anchos={ANCHOS_DE_FILTROS} />}>
          <Filtros parametros={searchParams} />
        </Suspense>
        <div className="mt-8">
          <ZonaDeResultados>
            <Suspense fallback={<EsqueletoLista mensaje="Cargando la lista de estudiantes." />}>
              <Resultados parametros={searchParams} />
            </Suspense>
          </ZonaDeResultados>
        </div>
      </ProveedorDeBusqueda>
    </div>
  );
}
