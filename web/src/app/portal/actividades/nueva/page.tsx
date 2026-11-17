import type { Metadata } from "next";
import { Suspense } from "react";
import { FormularioActividad } from "@/components/portal/actividades/FormularioActividad";
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
import { listarContenidosActivos, listarCursosDelAlcance } from "@/lib/api/actividades";
import { listarClubesParaFormulario } from "@/lib/api/clubes";
import { RUTA_ACTIVIDADES } from "@/lib/portal/filtros-actividades";
import { tieneAlcanceGlobal } from "@/lib/portal/menu";
import { primerValor } from "@/lib/portal/parametros";
import { puedeGestionarActividades } from "@/lib/portal/permisos";
import {
  CLUBES_PROGRAMABLES,
  clubParaActividad,
  contenidosElegibles,
  cursosParaActividad,
  type DatosDeActividad,
} from "@/lib/portal/reglas-actividades";
import { idDe } from "@/lib/portal/validacion";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Nueva actividad",
};

type Props = PageProps<"/portal/actividades/nueva">;

const RECURSO = { recurso: "actividades", rutaDeLista: RUTA_ACTIVIDADES };
const QUIENES = "el administrador, el responsable institucional y el docente del club";

async function Contenido({ searchParams }: Pick<Props, "searchParams">) {
  const [consulta, usuario] = await Promise.all([searchParams, exigirSesion()]);

  if (!usuario) {
    return <AvisoSinServicio />;
  }
  if (!puedeGestionarActividades(usuario.rol)) {
    return <AvisoSoloLectura {...RECURSO} quienes={QUIENES} />;
  }

  const [clubes, cursos, contenidos] = await Promise.all([
    listarClubesParaFormulario(),
    listarCursosDelAlcance(),
    listarContenidosActivos(),
  ]);

  if (!clubes || !cursos || !contenidos) {
    return <AvisoSinServicio />;
  }

  const programables = clubes.filter(
    (club) =>
      typeof club.id === "number" &&
      CLUBES_PROGRAMABLES.some((estado) => estado === club.estado),
  );

  if (programables.length === 0) {
    return (
      <AvisoDeRequisito titulo="No hay clubes donde programar" {...RECURSO}>
        Las actividades se planifican en clubes planificados o activos. Cuando tengas uno
        disponible podrás registrar sus sesiones.
      </AvisoDeRequisito>
    );
  }

  const opciones = programables.map((club) =>
    clubParaActividad(club, tieneAlcanceGlobal(usuario.rol)),
  );
  const pedido = idDe(primerValor(consulta.club));
  const elegido = opciones.find((opcion) => opcion.valor === String(pedido));

  const iniciales: DatosDeActividad = {
    clubId: elegido?.valor ?? (opciones.length === 1 ? opciones[0].valor : ""),
    cursoId: "",
    responsableId: "",
    fecha: "",
    horaInicio: "",
    horaFin: "",
    tema: "",
    objetivo: "",
    descripcion: "",
    lugar: "",
    motivoReprogramacion: "",
  };

  return (
    <div className="mt-8 max-w-[52rem]">
      <FormularioActividad
        actividadId={null}
        iniciales={iniciales}
        contenidosIniciales={[]}
        contenidos={contenidosElegibles(contenidos, [])}
        clubes={opciones}
        clubFijo={null}
        cursos={cursosParaActividad(cursos)}
        responsables={null}
        responsableActual=""
        original={null}
        bloqueado={false}
      />
    </div>
  );
}

export default function PaginaNuevaActividad({ searchParams }: Props) {
  return (
    <div className={CONTENEDOR_DE_GESTION}>
      <EnlaceVolver href={RUTA_ACTIVIDADES}>Volver a actividades</EnlaceVolver>
      <EncabezadoDeGestion
        titulo="Nueva actividad"
        detalle="La sesión se crea como Planificada y su responsable es el docente coordinador del club. Después de realizarla registrarás su ejecución, la asistencia y las evidencias."
      />
      <Suspense fallback={<EsqueletoDeGestion mensaje="Cargando el formulario de la actividad." />}>
        <Contenido searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
