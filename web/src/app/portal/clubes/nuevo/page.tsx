import type { Metadata } from "next";
import { Suspense } from "react";
import { FormularioClub } from "@/components/portal/clubes/FormularioClub";
import {
  AvisoDeRequisito,
  AvisoSinServicio,
  AvisoSoloLectura,
} from "@/components/portal/formularios/AvisosDeGestion";
import {
  CONTENEDOR_DE_GESTION,
  EncabezadoDeGestion,
  EnlaceVolver,
  EsqueletoDeGestion,
} from "@/components/portal/formularios/PiezasDeGestion";
import {
  listarDocentesActivos,
  listarInstitucionesParaFiltro,
  listarInstitucionesParaFormulario,
  listarPeriodos,
} from "@/lib/api/clubes";
import { RUTA_CLUBES } from "@/lib/portal/filtros-clubes";
import { opcionesConNombre, opcionesDeDocentes } from "@/lib/portal/opciones";
import { puedeElegirInstitucion, puedeGestionarClubesYCursos } from "@/lib/portal/permisos";
import type { DatosDeClub } from "@/lib/portal/reglas-clubes";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Nuevo club",
};

const RECURSO = { recurso: "clubes", rutaDeLista: RUTA_CLUBES };

async function Contenido() {
  const usuario = await exigirSesion();

  if (!usuario) {
    return <AvisoSinServicio />;
  }
  if (!puedeGestionarClubesYCursos(usuario.rol)) {
    return <AvisoSoloLectura {...RECURSO} />;
  }

  const eligeInstitucion = puedeElegirInstitucion(usuario.rol);
  const institucionPropia = usuario.institucionId ?? null;

  if (!eligeInstitucion && !institucionPropia) {
    return (
      <AvisoDeRequisito titulo="Tu cuenta no tiene una institución asignada" {...RECURSO}>
        Pide a la administración de TIPI 3.0 que vincule tu usuario con tu institución para poder
        registrar clubes.
      </AvisoDeRequisito>
    );
  }

  const [periodos, instituciones, docentes] = await Promise.all([
    listarPeriodos(),
    eligeInstitucion ? listarInstitucionesParaFormulario() : listarInstitucionesParaFiltro(),
    institucionPropia && !eligeInstitucion ? listarDocentesActivos(institucionPropia) : [],
  ]);

  if (!periodos || !instituciones || !docentes) {
    return <AvisoSinServicio />;
  }

  if (periodos.length === 0) {
    return (
      <AvisoDeRequisito titulo="Todavía no hay períodos académicos" {...RECURSO}>
        Un club siempre pertenece a un período académico. Un administrador debe registrar el
        período antes de crear clubes.
      </AvisoDeRequisito>
    );
  }

  if (eligeInstitucion && instituciones.length === 0) {
    return (
      <AvisoDeRequisito titulo="Todavía no hay instituciones" {...RECURSO}>
        Registra primero la institución educativa a la que pertenecerá el club.
      </AvisoDeRequisito>
    );
  }

  const vigente = periodos.find((periodo) => periodo.activo) ?? null;
  const propia = instituciones.find((institucion) => institucion.id === institucionPropia);

  const iniciales: DatosDeClub = {
    nombre: "",
    objetivo: "",
    institucionId: eligeInstitucion ? "" : String(institucionPropia),
    periodoId: vigente?.id ? String(vigente.id) : "",
    docenteId: "",
    diaSemana: "",
    horaInicio: "",
    horaFin: "",
    lugar: "",
    cupoMaximo: "",
  };

  return (
    <div className="mt-8 max-w-[52rem]">
      <FormularioClub
        clubId={null}
        iniciales={iniciales}
        instituciones={eligeInstitucion ? opcionesConNombre(instituciones) : null}
        institucionFija={propia?.nombre ?? "Tu institución"}
        periodos={periodos
          .filter((periodo) => typeof periodo.id === "number")
          .map((periodo) => ({
            valor: String(periodo.id),
            texto: periodo.activo ? `${periodo.nombre} (vigente)` : (periodo.nombre ?? ""),
          }))}
        periodoFijo=""
        docentes={opcionesDeDocentes(docentes)}
        integrantesActivos={0}
        bloqueado={false}
      />
    </div>
  );
}

export default function PaginaNuevoClub() {
  return (
    <div className={CONTENEDOR_DE_GESTION}>
      <EnlaceVolver href={RUTA_CLUBES}>Volver a clubes</EnlaceVolver>
      <EncabezadoDeGestion
        titulo="Nuevo club"
        detalle="El club se crea en estado Planificado. Podrás activarlo cuando esté listo para funcionar."
      />
      <Suspense fallback={<EsqueletoDeGestion mensaje="Cargando el formulario del club." />}>
        <Contenido />
      </Suspense>
    </div>
  );
}
