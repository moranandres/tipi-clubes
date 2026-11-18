import type { Metadata } from "next";
import { Suspense } from "react";
import {
  type OpcionDeCompetencia,
  type OpcionDeIntegrante,
  FormularioParticipacion,
} from "@/components/portal/competencias/FormularioParticipacion";
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
import { listarClubesParaFormulario } from "@/lib/api/clubes";
import {
  listarAutorizadosDeParticipacion,
  listarIntegrantesActivos,
  obtenerCatalogoActivo,
  type CompetenciaConCatalogo,
} from "@/lib/api/competencias";
import { NOMBRES_DE_NIVEL_DE_CATEGORIA, RUTA_COMPETENCIAS } from "@/lib/portal/filtros-competencias";
import { tieneAlcanceGlobal } from "@/lib/portal/menu";
import { opcionesDeIntegrantes } from "@/lib/portal/opciones";
import { primerValor } from "@/lib/portal/parametros";
import { puedeRegistrarParticipaciones } from "@/lib/portal/permisos";
import { RESULTADOS_VACIOS, textoDeEdicion, type DatosDeParticipacion } from "@/lib/portal/reglas-competencias";
import { hoyEnGuayaquil } from "@/lib/portal/tiempo";
import { idDe } from "@/lib/portal/validacion";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Registrar participación",
};

type Props = PageProps<"/portal/competencias/nueva">;

const RECURSO = { recurso: "competencias", rutaDeLista: RUTA_COMPETENCIAS };
const QUIENES = "el administrador, el responsable institucional y el docente del club";
const CLUBES_OPERATIVOS = ["PLANIFICADO", "ACTIVO"];
const SIN_AUTORIZACION = "sin autorización de participación";

function opcionesDeCompetencias(catalogo: CompetenciaConCatalogo[]): OpcionDeCompetencia[] {
  return catalogo
    .filter((entrada) => entrada.ediciones.length > 0 && entrada.categorias.length > 0)
    .map(({ competencia, ediciones, categorias }) => ({
      valor: String(competencia.id),
      texto: competencia.nombre ?? "Competencia",
      ediciones: ediciones.map((edicion) => ({
        valor: String(edicion.id),
        texto: textoDeEdicion(edicion),
        inicio: edicion.fechaInicio ?? null,
      })),
      categorias: categorias.map((categoria) => ({
        valor: String(categoria.id),
        texto: [categoria.nombre, categoria.nivel ? NOMBRES_DE_NIVEL_DE_CATEGORIA[categoria.nivel] : null]
          .filter(Boolean)
          .join(" · "),
      })),
    }));
}

async function Contenido({ searchParams }: Pick<Props, "searchParams">) {
  const [consulta, usuario] = await Promise.all([searchParams, exigirSesion()]);

  if (!usuario) {
    return <AvisoSinServicio />;
  }
  if (!puedeRegistrarParticipaciones(usuario.rol)) {
    return <AvisoSoloLectura {...RECURSO} quienes={QUIENES} />;
  }

  const [clubes, inscripciones, catalogo, autorizados] = await Promise.all([
    listarClubesParaFormulario(),
    listarIntegrantesActivos(),
    obtenerCatalogoActivo(),
    listarAutorizadosDeParticipacion(),
  ]);

  if (!clubes || !inscripciones || !catalogo) {
    return <AvisoSinServicio />;
  }

  const competencias = opcionesDeCompetencias(catalogo);
  if (competencias.length === 0) {
    return (
      <AvisoDeRequisito titulo="No hay competencias disponibles" {...RECURSO}>
        Para registrar una participación hace falta una competencia activa con al menos una edición
        y una categoría activas. El administrador las agrega en el catálogo de competencias.
      </AvisoDeRequisito>
    );
  }

  const operativos = new Set(
    clubes
      .filter((club) => typeof club.id === "number" && CLUBES_OPERATIVOS.includes(club.estado ?? ""))
      .map((club) => club.id as number),
  );
  const activas = inscripciones.filter(
    (inscripcion) =>
      typeof inscripcion.id === "number" &&
      typeof inscripcion.clubId === "number" &&
      operativos.has(inscripcion.clubId),
  );

  if (activas.length === 0) {
    return (
      <AvisoDeRequisito titulo="No hay integrantes para inscribir" {...RECURSO}>
        Solo se registran participaciones de integrantes activos de clubes planificados o activos.
        Cuando el club tenga integrantes podrás inscribirlos en una competencia.
      </AvisoDeRequisito>
    );
  }

  const global = tieneAlcanceGlobal(usuario.rol);
  const clubesConIntegrantes = clubes
    .filter((club) => activas.some((inscripcion) => inscripcion.clubId === club.id))
    .map((club) => ({
      valor: String(club.id),
      texto: [club.nombre, global ? club.institucionNombre : null].filter(Boolean).join(" · "),
    }));

  const integrantes: OpcionDeIntegrante[] = opcionesDeIntegrantes(activas).map((opcion, indice) => {
    const inscripcion = activas[indice];
    const autorizado =
      autorizados && typeof inscripcion.estudianteId === "number"
        ? autorizados.has(inscripcion.estudianteId)
        : null;
    return {
      ...opcion,
      texto: autorizado === false ? `${opcion.texto} · ${SIN_AUTORIZACION}` : opcion.texto,
      clubId: String(inscripcion.clubId),
      autorizado,
    };
  });

  const pedido = idDe(primerValor(consulta.club));
  const clubInicial =
    clubesConIntegrantes.find((club) => club.valor === String(pedido))?.valor ??
    (clubesConIntegrantes.length === 1 ? clubesConIntegrantes[0].valor : "");

  const iniciales: DatosDeParticipacion = {
    clubId: clubInicial,
    inscripcionId: "",
    competenciaId: competencias.length === 1 ? competencias[0].valor : "",
    edicionId: "",
    categoriaId: "",
    ...RESULTADOS_VACIOS,
  };

  return (
    <div className="mt-8 max-w-[52rem]">
      <FormularioParticipacion
        iniciales={iniciales}
        clubes={clubesConIntegrantes}
        integrantes={integrantes}
        competencias={competencias}
        hoy={hoyEnGuayaquil()}
      />
    </div>
  );
}

export default function PaginaNuevaParticipacion({ searchParams }: Props) {
  return (
    <div className={CONTENEDOR_DE_GESTION}>
      <EnlaceVolver href={RUTA_COMPETENCIAS}>Volver a competencias</EnlaceVolver>
      <EncabezadoDeGestion
        titulo="Registrar participación"
        detalle="Inscribe a un integrante del club en una categoría de una edición. El puesto y el reconocimiento puedes completarlos después, desde que empieza la edición."
      />
      <Suspense fallback={<EsqueletoDeGestion mensaje="Cargando el formulario de la participación." />}>
        <Contenido searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
