import type { Metadata } from "next";
import { UserPlus } from "lucide-react";
import { Suspense } from "react";
import { ProveedorDeBusqueda, ZonaDeResultados } from "@/components/portal/Busqueda";
import { EsqueletoFiltros } from "@/components/portal/ControlesDeFiltro";
import { EsqueletoLista } from "@/components/portal/EsqueletoLista";
import { FiltrosEstudiantes } from "@/components/portal/estudiantes/FiltrosEstudiantes";
import {
  EsqueletoResumenDeEstudiantes,
  ResumenDeEstudiantes,
} from "@/components/portal/estudiantes/ResumenDeEstudiantes";
import { ResultadosDeEstudiantes } from "@/components/portal/estudiantes/ResultadosDeEstudiantes";
import { AvisoDeResultado } from "@/components/portal/formularios/PiezasDeGestion";
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import { listarInstitucionesParaFiltro } from "@/lib/api/clubes";
import { contarEstudiantesPorEstado } from "@/lib/api/estudiantes";
import { RUTA_ESTUDIANTES, leerFiltrosDeEstudiantes } from "@/lib/portal/filtros-estudiantes";
import { tieneAlcanceGlobal } from "@/lib/portal/menu";
import type { ParametrosDeBusqueda } from "@/lib/portal/parametros";
import { puedeRegistrarEstudiantes, soloVeDatosMinimos } from "@/lib/portal/permisos";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Estudiantes",
};

type PropsConParametros = {
  parametros: Promise<ParametrosDeBusqueda>;
};

const ANCHOS_DE_FILTROS = ["md:min-w-[16rem] md:flex-1", "md:w-44", "md:w-64"];
const AVISO_DE_ELIMINACION = "estudiante-eliminado";

async function AccionPrincipal() {
  const usuario = await exigirSesion();

  if (!puedeRegistrarEstudiantes(usuario?.rol)) {
    return null;
  }

  return (
    <EnlaceBoton href={`${RUTA_ESTUDIANTES}/nuevo`} className="shrink-0">
      <UserPlus aria-hidden="true" size={18} />
      Nuevo estudiante
    </EnlaceBoton>
  );
}

async function AvisoDeAccion({ parametros }: PropsConParametros) {
  const { aviso } = await parametros;

  return aviso === AVISO_DE_ELIMINACION ? (
    <AvisoDeResultado>El estudiante se eliminó del sistema.</AvisoDeResultado>
  ) : null;
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
      destino="estudiantes"
      soloCodigo={soloVeDatosMinimos(usuario?.rol)}
    />
  );
}

async function Resumen({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeEstudiantes(await parametros);
  const conteos = await contarEstudiantesPorEstado(filtros);

  return <ResumenDeEstudiantes filtros={filtros} conteos={conteos} />;
}

async function Resultados({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeEstudiantes(await parametros);

  return <ResultadosDeEstudiantes filtros={filtros} destino="estudiantes" />;
}

export default function PaginaEstudiantes({ searchParams }: PageProps<"/portal/estudiantes">) {
  return (
    <div className="mx-auto w-full max-w-[78rem] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-medium tracking-tight">Estudiantes</h1>
          <p className="mt-3 max-w-[70ch] text-tenue">
            Registra a los estudiantes de cada institución, revisa su autorización de participación
            y consulta su recorrido por los clubes.
          </p>
        </div>
        <Suspense fallback={null}>
          <AccionPrincipal />
        </Suspense>
      </div>
      <Suspense fallback={null}>
        <AvisoDeAccion parametros={searchParams} />
      </Suspense>
      <ProveedorDeBusqueda>
        <Suspense fallback={<EsqueletoFiltros anchos={ANCHOS_DE_FILTROS} />}>
          <Filtros parametros={searchParams} />
        </Suspense>
        <Suspense fallback={<EsqueletoResumenDeEstudiantes />}>
          <Resumen parametros={searchParams} />
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
