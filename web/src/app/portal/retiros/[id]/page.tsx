import type { Metadata } from "next";
import { Ban, Lock, XCircle } from "lucide-react";
import { Suspense } from "react";
import {
  AvisoDenegado,
  AvisoNoEncontrado,
  AvisoSinServicio,
} from "@/components/portal/formularios/AvisosDeGestion";
import {
  AvisoDeResultado,
  COLUMNAS_DE_GESTION,
  CONTENEDOR_DE_GESTION,
  EncabezadoDeGestion,
  EnlaceVolver,
  EsqueletoDeGestion,
} from "@/components/portal/formularios/PiezasDeGestion";
import { ResolverConMotivo } from "@/components/portal/formularios/ResolverConMotivo";
import { ListaDeDatos } from "@/components/portal/ListaDeDatos";
import { PasosDeTramite, type Paso } from "@/components/portal/PasosDeTramite";
import {
  AprobarRetiro,
  type EfectoDeCupo,
  type EfectosVisibles,
} from "@/components/portal/retiros/AprobarRetiro";
import { cancelarRetiro, rechazarRetiro } from "@/lib/acciones/retiros";
import {
  obtenerEfectosDeRetiro,
  obtenerRetiro,
  type CupoTrasRetiro,
  type EfectosDeRetiro,
  type Retiro,
} from "@/lib/api/retiros";
import { NOMBRES_DE_ESTADO_DE_RETIRO, RUTA_RETIROS } from "@/lib/portal/filtros-retiros";
import { identidadDe } from "@/lib/portal/identidad";
import {
  esDocente,
  puedeRegistrarSolicitudes,
  puedeResolverSolicitudes,
  soloVeDatosMinimos,
} from "@/lib/portal/permisos";
import { fechaCorta, momentoCorto } from "@/lib/portal/tiempo";
import { idDe } from "@/lib/portal/validacion";
import { exigirSesion, type UsuarioSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Solicitud de retiro",
};

type Props = PageProps<"/portal/retiros/[id]">;

const RECURSO = { recurso: "retiros", rutaDeLista: RUTA_RETIROS };
const NO_ENCONTRADO = "Esta solicitud de retiro no existe";
const ESTADO_PENDIENTE = "PENDIENTE";
const SIN_LIMITE = "sin límite";

const AVISOS: Record<string, string> = {
  aprobado: "El retiro se aprobó. El estudiante salió del club y su cupo quedó libre.",
  rechazado: "El retiro se rechazó. El estudiante sigue en el club.",
  cancelado: "El retiro se canceló. El estudiante sigue en el club.",
};

function porQuien(nombre?: string, fecha?: string): string {
  return [momentoCorto(fecha), nombre ? `por ${nombre}` : null].filter(Boolean).join(", ");
}

function pasosDe(retiro: Retiro): Paso[] {
  const estado = retiro.estado ?? ESTADO_PENDIENTE;
  const pendiente = estado === ESTADO_PENDIENTE;
  return [
    {
      titulo: "Registrado",
      detalle: porQuien(retiro.solicitadoPorNombre, retiro.fechaSolicitud),
      estado: "hecho",
    },
    {
      titulo: pendiente ? "Aprobado o rechazado" : NOMBRES_DE_ESTADO_DE_RETIRO[estado],
      detalle: pendiente ? "Pendiente de resolución" : porQuien(retiro.resueltoPorNombre, retiro.fechaResolucion),
      estado: pendiente ? "actual" : estado === "APROBADA" ? "hecho" : "detenido",
    },
  ];
}

function disponibles(cupo: CupoTrasRetiro, cuando: "ahora" | "despues"): string {
  if (typeof cupo.cupoMaximo !== "number") {
    return SIN_LIMITE;
  }
  const valor = cuando === "ahora" ? cupo.disponiblesAhora : cupo.disponiblesTrasAprobar;
  return `${valor ?? 0} de ${cupo.cupoMaximo}`;
}

function efectoDe(cupo: CupoTrasRetiro, tipo: EfectoDeCupo["tipo"]): EfectoDeCupo {
  return {
    nombre: cupo.nombre ?? (tipo === "club" ? "Club" : "Curso"),
    tipo,
    ahora: disponibles(cupo, "ahora"),
    despues: disponibles(cupo, "despues"),
  };
}

function visiblesDe(efectos: EfectosDeRetiro | null): EfectosVisibles | null {
  if (!efectos) {
    return null;
  }
  return {
    aprobable: efectos.aprobable ?? true,
    impedimentos: efectos.impedimentos ?? [],
    cupos: [
      ...(efectos.club ? [efectoDe(efectos.club, "club")] : []),
      ...(efectos.cursos ?? []).map((curso) => efectoDe(curso, "curso")),
    ],
    solicitudesACancelar: efectos.solicitudesInscripcionACancelar?.length ?? 0,
  };
}

function puedeCancelar(usuario: UsuarioSesion, retiro: Retiro): boolean {
  if (!puedeRegistrarSolicitudes(usuario.rol)) {
    return false;
  }
  return esDocente(usuario.rol) ? retiro.solicitadoPorId === usuario.id : true;
}

function BloqueoPorAutoria() {
  return (
    <section className="rounded-pieza border border-linea p-5">
      <h2 className="flex items-center gap-2 text-lg font-medium">
        <Lock aria-hidden="true" size={18} className="text-tenue" />
        Resolución a cargo de otra persona
      </h2>
      <p className="mt-2 text-[0.9375rem] text-tenue">
        Tú registraste este retiro. Por separación de funciones, otro responsable institucional o
        un administrador debe aprobarlo o rechazarlo.
      </p>
    </section>
  );
}

async function PanelDeAprobacion({ retiroId, destino }: { retiroId: number; destino: string }) {
  const efectos = await obtenerEfectosDeRetiro(retiroId);
  return <AprobarRetiro key={retiroId} retiroId={retiroId} efectos={visiblesDe(efectos)} destino={destino} />;
}

async function Contenido({ params, searchParams }: Props) {
  const [{ id: segmento }, consulta, usuario] = await Promise.all([
    params,
    searchParams,
    exigirSesion(),
  ]);
  const id = idDe(segmento);

  if (!id) {
    return <AvisoNoEncontrado titulo={NO_ENCONTRADO} {...RECURSO} />;
  }
  if (!usuario) {
    return <AvisoSinServicio />;
  }

  const resultado = await obtenerRetiro(id);

  if (resultado.estado === "no-encontrado") {
    return <AvisoNoEncontrado titulo={NO_ENCONTRADO} {...RECURSO} />;
  }
  if (resultado.estado === "denegado") {
    return <AvisoDenegado mensaje={resultado.mensaje} {...RECURSO} />;
  }
  if (resultado.estado === "sin-servicio") {
    return <AvisoSinServicio />;
  }

  const retiro = resultado.datos;
  const pendiente = (retiro.estado ?? ESTADO_PENDIENTE) === ESTADO_PENDIENTE;
  const minima = soloVeDatosMinimos(usuario.rol);
  const resolutor = puedeResolverSolicitudes(usuario.rol);
  const autor = retiro.solicitadoPorId === usuario.id;
  const ruta = `${RUTA_RETIROS}/${id}`;
  const conPanel = pendiente && !minima;
  const identidad = identidadDe(
    { nombres: retiro.estudianteNombres, apellidos: retiro.estudianteApellidos, codigo: retiro.estudianteCodigo },
    minima,
  );
  const aviso = typeof consulta.aviso === "string" ? AVISOS[consulta.aviso] : undefined;
  const cursosRetirados = Array.isArray(retiro.cursosRetirados) ? retiro.cursosRetirados : [];

  return (
    <>
      <EncabezadoDeGestion
        titulo={identidad.principal}
        detalle={[identidad.codigo, retiro.clubNombre, retiro.institucionNombre].filter(Boolean).join(" · ")}
      />
      {aviso ? <AvisoDeResultado>{aviso}</AvisoDeResultado> : null}
      <div className={conPanel ? COLUMNAS_DE_GESTION : "mt-8 max-w-[52rem]"}>
        <div className="flex min-w-0 flex-col gap-10">
          <section aria-labelledby="avance">
            <h2 id="avance" className="text-lg font-medium">
              Avance del retiro
            </h2>
            <div className="mt-4">
              <PasosDeTramite etiqueta="Etapas del retiro" pasos={pasosDe(retiro)} />
            </div>
          </section>
          <section aria-labelledby="detalle">
            <h2 id="detalle" className="text-lg font-medium">
              Detalle
            </h2>
            <div className="mt-4">
              <ListaDeDatos
                datos={[
                  { termino: "Club", valor: retiro.clubNombre },
                  { termino: "Fecha de salida", valor: fechaCorta(retiro.fechaRetiro) },
                  cursosRetirados.length > 0
                    ? {
                        termino: "Cursos cerrados",
                        valor: cursosRetirados
                          .map((curso) => curso.cursoNombre ?? "Curso")
                          .join("\n"),
                      }
                    : null,
                  { termino: "Motivo del retiro", valor: retiro.motivo, ancho: true },
                  {
                    termino: retiro.estado === "APROBADA" ? "Observación de la aprobación" : "Motivo de la resolución",
                    valor: retiro.observacionResolucion,
                    ancho: true,
                  },
                ]}
              />
            </div>
          </section>
        </div>
        {conPanel ? (
          <div className="flex min-w-0 flex-col gap-6">
            {resolutor && autor ? <BloqueoPorAutoria /> : null}
            {resolutor && !autor ? (
              <>
                <PanelDeAprobacion retiroId={id} destino={`${ruta}?aviso=aprobado`} />
                <ResolverConMotivo
                  key={`rechazo-${id}`}
                  titulo="Rechazar el retiro"
                  descripcion="El estudiante sigue siendo integrante del club. El motivo queda registrado."
                  etiqueta="Rechazar retiro"
                  confirmar="Sí, rechazar"
                  textoCargando="Rechazando"
                  icono={<XCircle aria-hidden="true" size={16} />}
                  destino={`${ruta}?aviso=rechazado`}
                  resolver={rechazarRetiro.bind(null, id)}
                />
              </>
            ) : null}
            {!resolutor ? (
              <section className="rounded-pieza border border-linea p-5">
                <h2 className="text-lg font-medium">Pendiente de resolución</h2>
                <p className="mt-2 text-[0.9375rem] text-tenue">
                  El responsable de la institución o un administrador lo aprobará o rechazará.
                </p>
              </section>
            ) : null}
            {puedeCancelar(usuario, retiro) ? (
              <ResolverConMotivo
                key={`cancelacion-${id}`}
                titulo="Cancelar el retiro"
                descripcion="Úsalo si el estudiante decide quedarse o el retiro se registró por error."
                etiqueta="Cancelar retiro"
                confirmar="Sí, cancelar"
                textoCargando="Cancelando"
                variante="secundario"
                icono={<Ban aria-hidden="true" size={16} />}
                destino={`${ruta}?aviso=cancelado`}
                resolver={cancelarRetiro.bind(null, id)}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );
}

export default function PaginaRetiro(props: Props) {
  return (
    <div className={CONTENEDOR_DE_GESTION}>
      <EnlaceVolver href={RUTA_RETIROS}>Volver a retiros</EnlaceVolver>
      <Suspense fallback={<EsqueletoDeGestion conEncabezado mensaje="Cargando la solicitud de retiro." />}>
        <Contenido {...props} />
      </Suspense>
    </div>
  );
}
