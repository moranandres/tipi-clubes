import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { Suspense } from "react";
import { EstadoDelClub } from "@/components/portal/clubes/EstadoDelClub";
import { FormularioClub } from "@/components/portal/clubes/FormularioClub";
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
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import {
  listarDocentesActivos,
  obtenerClub,
  previsualizarCierreDeClub,
  type Club,
} from "@/lib/api/clubes";
import { RUTA_CLUBES } from "@/lib/portal/filtros-clubes";
import { RUTA_CURSOS } from "@/lib/portal/filtros-cursos";
import { conOpcionActual, opcionesDeDocentes } from "@/lib/portal/opciones";
import { puedeGestionarClubesYCursos, puedeReabrirClubes } from "@/lib/portal/permisos";
import { ESTADO_DE_CLUB_CERRADO, type DatosDeClub } from "@/lib/portal/reglas-clubes";
import { horaCorta } from "@/lib/portal/tiempo";
import { idDe } from "@/lib/portal/validacion";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Gestionar club",
};

type Props = PageProps<"/portal/clubes/[id]">;

const RECURSO = { recurso: "clubes", rutaDeLista: RUTA_CLUBES };
const AVISO_CREADO = "creado";
const SIN_VERIFICAR_CIERRE =
  "No pudimos verificar si el club se puede cerrar. Recarga la página e inténtalo de nuevo.";

function datosDe(club: Club): DatosDeClub {
  return {
    nombre: club.nombre ?? "",
    objetivo: club.objetivo ?? "",
    institucionId: club.institucionId ? String(club.institucionId) : "",
    periodoId: club.periodoId ? String(club.periodoId) : "",
    docenteId: club.docenteId ? String(club.docenteId) : "",
    diaSemana: club.diaSemana ? String(club.diaSemana) : "",
    horaInicio: horaCorta(club.horaInicio),
    horaFin: horaCorta(club.horaFin),
    lugar: club.lugar ?? "",
    cupoMaximo: typeof club.cupoMaximo === "number" ? String(club.cupoMaximo) : "",
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
    return <AvisoNoEncontrado titulo="Este club no existe" {...RECURSO} />;
  }
  if (!usuario) {
    return <AvisoSinServicio />;
  }
  if (!puedeGestionarClubesYCursos(usuario.rol)) {
    return <AvisoSoloLectura {...RECURSO} />;
  }

  const resultado = await obtenerClub(id);

  if (resultado.estado === "no-encontrado") {
    return <AvisoNoEncontrado titulo="Este club no existe" {...RECURSO} />;
  }
  if (resultado.estado === "denegado") {
    return <AvisoDenegado mensaje={resultado.mensaje} {...RECURSO} />;
  }
  if (resultado.estado === "sin-servicio") {
    return <AvisoSinServicio />;
  }

  const club = resultado.datos;
  const estado = club.estado ?? "PLANIFICADO";
  const estaCerrado = estado === ESTADO_DE_CLUB_CERRADO;

  const [docentes, cierre] = await Promise.all([
    club.institucionId ? listarDocentesActivos(club.institucionId) : [],
    estaCerrado ? null : previsualizarCierreDeClub(id),
  ]);

  if (!docentes) {
    return <AvisoSinServicio />;
  }

  const iniciales = datosDe(club);
  const opcionesDeDocente = conOpcionActual(
    opcionesDeDocentes(docentes),
    iniciales.docenteId,
    `${club.docenteNombre ?? "Docente actual"} (inactivo)`,
  );

  const bloqueosDeCierre = cierre
    ? cierre.puedeCerrar
      ? []
      : (cierre.bloqueos ?? [])
    : [SIN_VERIFICAR_CIERRE];

  return (
    <>
      <EncabezadoDeGestion
        titulo={club.nombre ?? "Club"}
        detalle={[club.institucionNombre, club.periodoNombre].filter(Boolean).join(" · ")}
      />
      {consulta.aviso === AVISO_CREADO ? (
        <AvisoDeResultado>
          El club se creó en estado Planificado. Actívalo en el panel de estado cuando esté listo
          para funcionar.
        </AvisoDeResultado>
      ) : null}
      <div className={COLUMNAS_DE_GESTION}>
        <div className="min-w-0">
          {estaCerrado ? (
            <p className="mb-6 rounded-control bg-superficie px-4 py-3 text-[0.9375rem] text-tenue">
              Este club está cerrado y sus datos no se pueden modificar.
              {puedeReabrirClubes(usuario.rol)
                ? " Reábrelo en el panel de estado para volver a editarlo."
                : " Solo un administrador puede reabrirlo."}
            </p>
          ) : null}
          <FormularioClub
            key={id}
            clubId={id}
            iniciales={iniciales}
            instituciones={null}
            institucionFija={club.institucionNombre ?? "Sin institución"}
            periodos={null}
            periodoFijo={club.periodoNombre ?? "Sin período"}
            docentes={opcionesDeDocente}
            integrantesActivos={club.integrantesActivos ?? 0}
            bloqueado={estaCerrado}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <EstadoDelClub
            key={id}
            clubId={id}
            estado={estado}
            puedeReabrir={puedeReabrirClubes(usuario.rol)}
            bloqueosDeCierre={bloqueosDeCierre}
            avisosDeCierre={cierre?.avisos ?? []}
          />
          {estaCerrado ? null : (
            <section
              aria-labelledby="titulo-cursos-del-club"
              className="rounded-pieza border border-linea p-5"
            >
              <h2 id="titulo-cursos-del-club" className="text-lg font-medium">
                Cursos del club
              </h2>
              <p className="mt-2 text-[0.9375rem] text-tenue">
                Cada curso tiene su propio nivel, modalidad, fechas y horario semanal.
              </p>
              <EnlaceBoton
                href={`${RUTA_CURSOS}/nuevo?club=${id}`}
                variante="secundario"
                className="mt-4 w-full"
              >
                <Plus aria-hidden="true" size={18} />
                Crear curso en este club
              </EnlaceBoton>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

export default function PaginaGestionDeClub(props: Props) {
  return (
    <div className={CONTENEDOR_DE_GESTION}>
      <EnlaceVolver href={RUTA_CLUBES}>Volver a clubes</EnlaceVolver>
      <Suspense
        fallback={<EsqueletoDeGestion conEncabezado mensaje="Cargando los datos del club." />}
      >
        <Contenido {...props} />
      </Suspense>
    </div>
  );
}
