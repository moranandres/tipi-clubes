import type { Metadata } from "next";
import { GraduationCap, Trophy } from "lucide-react";
import { Suspense, type ReactNode } from "react";
import { SelectorDeDestino } from "@/components/portal/certificados/SelectorDeDestino";
import { AvisoSinServicio, AvisoSoloLectura } from "@/components/portal/formularios/AvisosDeGestion";
import {
  CONTENEDOR_DE_GESTION,
  EncabezadoDeGestion,
  EnlaceVolver,
  EsqueletoDeGestion,
} from "@/components/portal/formularios/PiezasDeGestion";
import { listarCursosParaCertificar } from "@/lib/api/certificados";
import { listarParticipacionesDelAlcance } from "@/lib/api/competencias";
import { RUTA_CERTIFICADOS, rutaDeParticipantesDeCurso } from "@/lib/portal/filtros-certificados";
import { rutaDeParticipacion } from "@/lib/portal/filtros-competencias";
import { NOMBRES_DE_ESTADO_DE_CURSO } from "@/lib/portal/filtros-cursos";
import { identidadDe } from "@/lib/portal/identidad";
import { tieneAlcanceGlobal } from "@/lib/portal/menu";
import { puedeEmitirCertificados, puedeRegistrarResultadosDeCurso } from "@/lib/portal/permisos";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Emitir certificado",
};

const RECURSO = { recurso: "certificados", rutaDeLista: RUTA_CERTIFICADOS };
const QUIENES = "el administrador, el responsable institucional y el docente del club";

function Origen({
  id,
  icono,
  titulo,
  descripcion,
  children,
}: {
  id: string;
  icono: ReactNode;
  titulo: string;
  descripcion: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col rounded-pieza border border-linea p-5 sm:p-6">
      <span
        aria-hidden="true"
        className="grid size-10 place-items-center rounded-control bg-superficie text-tenue"
      >
        {icono}
      </span>
      <h2 id={id} className="mt-4 text-lg font-medium">
        {titulo}
      </h2>
      <p className="mt-2 text-[0.9375rem] text-tenue">{descripcion}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

async function Contenido() {
  const usuario = await exigirSesion();

  if (!usuario) {
    return <AvisoSinServicio />;
  }
  if (!puedeRegistrarResultadosDeCurso(usuario.rol)) {
    return <AvisoSoloLectura {...RECURSO} quienes={QUIENES} />;
  }

  const emite = puedeEmitirCertificados(usuario.rol);
  const global = tieneAlcanceGlobal(usuario.rol);
  const [cursos, participaciones] = await Promise.all([
    listarCursosParaCertificar(),
    emite ? listarParticipacionesDelAlcance() : null,
  ]);

  if (!cursos || (emite && !participaciones)) {
    return <AvisoSinServicio />;
  }

  const opcionesDeCursos = cursos
    .filter((curso) => typeof curso.id === "number")
    .map((curso) => ({
      valor: rutaDeParticipantesDeCurso(curso.id as number),
      texto: [
        curso.nombre,
        curso.clubNombre,
        global ? curso.institucionNombre : null,
        curso.estado ? NOMBRES_DE_ESTADO_DE_CURSO[curso.estado] : null,
      ]
        .filter(Boolean)
        .join(" · "),
    }));

  const opcionesDeParticipaciones = (participaciones ?? [])
    .filter((participacion) => typeof participacion.id === "number")
    .map((participacion) => ({
      valor: rutaDeParticipacion(participacion.id as number),
      texto: [
        identidadDe(
          {
            nombres: participacion.estudianteNombres,
            apellidos: participacion.estudianteApellidos,
            codigo: participacion.estudianteCodigo,
          },
          false,
        ).principal,
        participacion.competenciaNombre,
        participacion.edicionNombre,
        participacion.categoriaNombre,
      ]
        .filter(Boolean)
        .join(" · "),
    }));

  return (
    <>
      <EncabezadoDeGestion
        titulo={emite ? "Emitir certificado" : "Resultados de cursos"}
        detalle={
          emite
            ? "El sistema valida la elegibilidad antes de generar el PDF: un curso debe estar terminado y una competencia debe haber empezado. No se emiten dos certificados vigentes del mismo tipo."
            : "Registra el resultado final de los participantes de los cursos de tus clubes cuando el curso termina."
        }
      />
      <div className="mt-8 grid gap-5 lg:grid-cols-2">
      <Origen
        id="origen-curso"
        icono={<GraduationCap size={20} />}
        titulo={emite ? "De un curso" : "Resultado final de un curso"}
        descripcion={
          emite
            ? "Registra el resultado final de cada participante y emite su certificado de participación o de aprobación. Solo para quienes terminaron el curso."
            : "Registra si cada participante aprobó el curso. Con ese resultado la institución emite sus certificados."
        }
      >
        {opcionesDeCursos.length > 0 ? (
          <SelectorDeDestino
            etiqueta="Curso"
            nombre="curso"
            opciones={opcionesDeCursos}
            textoSinEleccion="Elige el curso"
            ayuda="Los cursos finalizados aparecen primero."
            errorSinEleccion="Elige el curso para ver a sus participantes."
            textoDelBoton="Ver participantes"
          />
        ) : (
          <p className="text-[0.9375rem] text-tenue">Todavía no hay cursos registrados en tu alcance.</p>
        )}
      </Origen>
      {emite ? (
        <Origen
          id="origen-competencia"
          icono={<Trophy size={20} />}
          titulo="De una competencia"
          descripcion="Elige la participación del estudiante para emitir su certificado de participación o de reconocimiento. La edición debe haber empezado."
        >
          {opcionesDeParticipaciones.length > 0 ? (
            <SelectorDeDestino
              etiqueta="Participación"
              nombre="participacion"
              opciones={opcionesDeParticipaciones}
              textoSinEleccion="Elige la participación"
              ayuda="Estudiante · competencia · edición · categoría."
              errorSinEleccion="Elige la participación que vas a certificar."
              textoDelBoton="Abrir participación"
            />
          ) : (
            <p className="text-[0.9375rem] text-tenue">
              Todavía no hay participaciones en competencias registradas en tu alcance.
            </p>
          )}
        </Origen>
      ) : null}
      </div>
    </>
  );
}

export default function PaginaEmitirCertificado() {
  return (
    <div className={CONTENEDOR_DE_GESTION}>
      <EnlaceVolver href={RUTA_CERTIFICADOS}>Volver a certificados</EnlaceVolver>
      <Suspense fallback={<EsqueletoDeGestion conEncabezado mensaje="Cargando los cursos y las participaciones." />}>
        <Contenido />
      </Suspense>
    </div>
  );
}
