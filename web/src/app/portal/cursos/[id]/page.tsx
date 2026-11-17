import type { Metadata } from "next";
import { Suspense } from "react";
import { EliminarCurso } from "@/components/portal/cursos/EliminarCurso";
import { EstadoDelCurso } from "@/components/portal/cursos/EstadoDelCurso";
import { FormularioCurso } from "@/components/portal/cursos/FormularioCurso";
import { HorariosDelCurso } from "@/components/portal/cursos/HorariosDelCurso";
import {
  AvisoDenegado,
  AvisoNoEncontrado,
  AvisoSinServicio,
  AvisoSoloLectura,
} from "@/components/portal/formularios/AvisosDeGestion";
import {
  AvisoDeResultado,
  COLUMNAS_DE_GESTION,
  CONTENEDOR_DE_GESTION,
  EncabezadoDeGestion,
  EnlaceVolver,
  EsqueletoDeGestion,
} from "@/components/portal/formularios/PiezasDeGestion";
import { listarPeriodos, obtenerClub } from "@/lib/api/clubes";
import { obtenerCurso, type Curso } from "@/lib/api/cursos";
import { NOMBRES_DE_ESTADO_DE_CURSO, RUTA_CURSOS } from "@/lib/portal/filtros-cursos";
import { puedeGestionarClubesYCursos } from "@/lib/portal/permisos";
import {
  clubParaCurso,
  cursoEsEditable,
  type ClubParaCurso,
  type DatosDeCurso,
} from "@/lib/portal/reglas-cursos";
import { idDe } from "@/lib/portal/validacion";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Gestionar curso",
};

type Props = PageProps<"/portal/cursos/[id]">;

const RECURSO = { recurso: "cursos", rutaDeLista: RUTA_CURSOS };
const AVISO_CREADO = "creado";
const ESTADO_PLANIFICADO = "PLANIFICADO";
const ESTADO_EN_CURSO = "EN_CURSO";
const CLUB_ACTIVO = "ACTIVO";

function datosDe(curso: Curso): DatosDeCurso {
  return {
    clubId: curso.clubId ? String(curso.clubId) : "",
    nombre: curso.nombre ?? "",
    descripcion: curso.descripcion ?? "",
    nivel: curso.nivel ?? "",
    modalidad: curso.modalidad ?? "",
    lugar: curso.lugar ?? "",
    enlaceVirtual: curso.enlaceVirtual ?? "",
    fechaInicio: curso.fechaInicio ?? "",
    fechaFin: curso.fechaFin ?? "",
    duracionHoras: typeof curso.duracionHoras === "number" ? String(curso.duracionHoras) : "",
    cupoMaximo: typeof curso.cupoMaximo === "number" ? String(curso.cupoMaximo) : "",
  };
}

async function Contenido({ params, searchParams }: Props) {
  const [{ id: segmento }, consulta, usuario] = await Promise.all([
    params,
    searchParams,
    exigirSesion(),
  ]);
  const id = idDe(segmento);

  if (!id) {
    return <AvisoNoEncontrado titulo="Este curso no existe" {...RECURSO} />;
  }
  if (!usuario) {
    return <AvisoSinServicio />;
  }
  if (!puedeGestionarClubesYCursos(usuario.rol)) {
    return <AvisoSoloLectura {...RECURSO} />;
  }

  const resultado = await obtenerCurso(id);

  if (resultado.estado === "no-encontrado") {
    return <AvisoNoEncontrado titulo="Este curso no existe" {...RECURSO} />;
  }
  if (resultado.estado === "denegado") {
    return <AvisoDenegado mensaje={resultado.mensaje} {...RECURSO} />;
  }
  if (resultado.estado === "sin-servicio") {
    return <AvisoSinServicio />;
  }

  const curso = resultado.datos;
  const estado = curso.estado ?? ESTADO_PLANIFICADO;
  const editable = cursoEsEditable(estado);
  const horarios = curso.horarios ?? [];

  const [club, periodos] = await Promise.all([
    curso.clubId ? obtenerClub(curso.clubId) : null,
    listarPeriodos(),
  ]);

  const datosDelClub = club?.estado === "ok" ? club.datos : null;
  const clubFijo: ClubParaCurso = datosDelClub
    ? clubParaCurso(datosDelClub, periodos ?? [], false)
    : {
        valor: String(curso.clubId ?? ""),
        texto: curso.clubNombre ?? "Club",
        cupoMaximo: null,
        periodo: null,
      };

  return (
    <>
      <EncabezadoDeGestion
        titulo={curso.nombre ?? "Curso"}
        detalle={[curso.clubNombre, curso.institucionNombre].filter(Boolean).join(" · ")}
      />
      {consulta.aviso === AVISO_CREADO ? (
        <AvisoDeResultado>
          El curso se creó en estado Planificado. Agrega su horario semanal y, cuando esté listo,
          inícialo en el panel de estado.
        </AvisoDeResultado>
      ) : null}
      <div className={COLUMNAS_DE_GESTION}>
        <div className="flex min-w-0 flex-col gap-10">
          <div>
            {editable ? null : (
              <p className="mb-6 rounded-control bg-superficie px-4 py-3 text-[0.9375rem] text-tenue">
                Este curso está {NOMBRES_DE_ESTADO_DE_CURSO[estado].toLowerCase()} y sus datos ya
                no se pueden modificar.
              </p>
            )}
            <FormularioCurso
              key={id}
              cursoId={id}
              iniciales={datosDe(curso)}
              clubes={null}
              clubFijo={clubFijo}
              inscritosActivos={curso.inscritosActivos ?? 0}
              bloqueado={!editable}
            />
          </div>
          <HorariosDelCurso
            key={id}
            cursoId={id}
            horarios={horarios}
            modalidad={curso.modalidad}
            editable={editable}
            enCurso={estado === ESTADO_EN_CURSO}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <EstadoDelCurso
            key={id}
            cursoId={id}
            estado={estado}
            tieneHorarios={horarios.length > 0}
            clubActivo={datosDelClub ? datosDelClub.estado === CLUB_ACTIVO : null}
          />
          {estado === ESTADO_PLANIFICADO ? <EliminarCurso key={id} cursoId={id} /> : null}
        </div>
      </div>
    </>
  );
}

export default function PaginaGestionDeCurso(props: Props) {
  return (
    <div className={CONTENEDOR_DE_GESTION}>
      <EnlaceVolver href={RUTA_CURSOS}>Volver a cursos</EnlaceVolver>
      <Suspense
        fallback={<EsqueletoDeGestion conEncabezado mensaje="Cargando los datos del curso." />}
      >
        <Contenido {...props} />
      </Suspense>
    </div>
  );
}
