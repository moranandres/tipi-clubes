import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { Suspense } from "react";
import { ElementoDelCatalogo } from "@/components/portal/competencias/ElementoDelCatalogo";
import { FormularioCategoria } from "@/components/portal/competencias/FormularioCategoria";
import { FormularioCompetencia } from "@/components/portal/competencias/FormularioCompetencia";
import { FormularioEdicion } from "@/components/portal/competencias/FormularioEdicion";
import { PUNTO_ACTIVA, PUNTO_INACTIVA } from "@/components/portal/competencias/PiezasDeCompetencia";
import {
  AvisoDenegado,
  AvisoNoEncontrado,
  AvisoSinServicio,
} from "@/components/portal/formularios/AvisosDeGestion";
import { CambioDeEstado } from "@/components/portal/formularios/CambioDeEstado";
import {
  AvisoDeResultado,
  COLUMNAS_DE_GESTION,
  CONTENEDOR_DE_GESTION,
  EncabezadoDeGestion,
  EnlaceVolver,
  EsqueletoDeGestion,
} from "@/components/portal/formularios/PiezasDeGestion";
import { ListaDeDatos } from "@/components/portal/ListaDeDatos";
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import {
  cambiarEstadoCategoria,
  cambiarEstadoCompetencia,
  cambiarEstadoEdicion,
} from "@/lib/acciones/competencias";
import {
  listarCategorias,
  listarEdiciones,
  obtenerCompetencia,
  type Categoria,
  type Edicion,
} from "@/lib/api/competencias";
import {
  NIVELES_DE_CATEGORIA,
  NOMBRES_DE_NIVEL_DE_CATEGORIA,
  PLURALES_DE_NIVEL_DE_CATEGORIA,
  RUTA_CATALOGO_DE_COMPETENCIAS,
  rutaDeParticipaciones,
  FILTROS_DE_PARTICIPACIONES_VACIOS,
} from "@/lib/portal/filtros-competencias";
import { puedeAdministrarCatalogoDeCompetencias } from "@/lib/portal/permisos";
import { fechasDeEdicion, type DatosDeCategoria, type DatosDeEdicion } from "@/lib/portal/reglas-competencias";
import { hoyEnGuayaquil } from "@/lib/portal/tiempo";
import { idDe } from "@/lib/portal/validacion";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Competencia",
};

type Props = PageProps<"/portal/competencias/catalogo/[id]">;

const RECURSO = { recurso: "competencias", rutaDeLista: RUTA_CATALOGO_DE_COMPETENCIAS };
const NO_ENCONTRADA = "Esta competencia no existe";
const AVISOS: Record<string, string> = {
  creada: "La competencia quedó en el catálogo. Agrega ahora sus ediciones y categorías.",
};

function participacionesDe(cantidad?: number): string {
  const total = cantidad ?? 0;
  return total === 1 ? "1 participación" : `${total} participaciones`;
}

function datosDeEdicion(edicion: Edicion): DatosDeEdicion {
  return {
    nombre: edicion.nombre ?? "",
    anio: typeof edicion.anio === "number" ? String(edicion.anio) : "",
    fechaInicio: edicion.fechaInicio ?? "",
    fechaFin: edicion.fechaFin ?? "",
    sede: edicion.sede ?? "",
  };
}

function datosDeCategoria(categoria: Categoria): DatosDeCategoria {
  return {
    nivel: categoria.nivel ?? "",
    nombre: categoria.nombre ?? "",
    descripcion: categoria.descripcion ?? "",
  };
}

async function Contenido({ params, searchParams }: Props) {
  const [{ id: segmento }, consulta, usuario] = await Promise.all([params, searchParams, exigirSesion()]);
  const id = idDe(segmento);

  if (!id) {
    return <AvisoNoEncontrado titulo={NO_ENCONTRADA} {...RECURSO} />;
  }
  if (!usuario) {
    return <AvisoSinServicio />;
  }

  const [resultado, ediciones, categorias] = await Promise.all([
    obtenerCompetencia(id),
    listarEdiciones(id),
    listarCategorias(id),
  ]);

  if (resultado.estado === "no-encontrado") {
    return <AvisoNoEncontrado titulo={NO_ENCONTRADA} {...RECURSO} />;
  }
  if (resultado.estado === "denegado") {
    return <AvisoDenegado mensaje={resultado.mensaje} {...RECURSO} />;
  }
  if (resultado.estado === "sin-servicio" || !ediciones || !categorias) {
    return <AvisoSinServicio />;
  }

  const competencia = resultado.datos;
  const activa = Boolean(competencia.activa);
  const gestionable = puedeAdministrarCatalogoDeCompetencias(usuario.rol);
  const agrega = gestionable && activa;
  const aviso = typeof consulta.aviso === "string" ? AVISOS[consulta.aviso] : undefined;
  const edicionVacia: DatosDeEdicion = {
    nombre: "",
    anio: hoyEnGuayaquil().slice(0, 4),
    fechaInicio: "",
    fechaFin: "",
    sede: "",
  };

  return (
    <>
      <EncabezadoDeGestion
        titulo={competencia.nombre ?? "Competencia"}
        detalle={competencia.organizador ?? undefined}
      />
      {aviso ? <AvisoDeResultado>{aviso}</AvisoDeResultado> : null}
      <div className={COLUMNAS_DE_GESTION}>
        <div className="flex min-w-0 flex-col gap-10">
          <section aria-labelledby="datos-de-competencia">
            <h2 id="datos-de-competencia" className="text-lg font-medium">
              Datos de la competencia
            </h2>
            <div className="mt-4 max-w-[40rem]">
              {gestionable ? (
                <FormularioCompetencia
                  key={`competencia-${id}`}
                  competenciaId={id}
                  iniciales={{
                    nombre: competencia.nombre ?? "",
                    organizador: competencia.organizador ?? "",
                    sitioWeb: competencia.sitioWeb ?? "",
                  }}
                />
              ) : (
                <ListaDeDatos
                  datos={[
                    { termino: "Organizador", valor: competencia.organizador },
                    {
                      termino: "Sitio web",
                      valor: competencia.sitioWeb ? (
                        <a
                          href={competencia.sitioWeb}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 break-all font-medium text-acento"
                        >
                          {competencia.sitioWeb}
                          <ExternalLink aria-hidden="true" size={14} className="shrink-0" />
                        </a>
                      ) : null,
                    },
                  ]}
                />
              )}
            </div>
          </section>

          <section aria-labelledby="ediciones">
            <h2 id="ediciones" className="text-lg font-medium">
              Ediciones
            </h2>
            <p className="mt-2 max-w-[60ch] text-[0.9375rem] text-tenue">
              Cada edición corresponde a un año. Los resultados y certificados se registran desde su
              fecha de inicio.
            </p>
            {ediciones.length === 0 ? (
              <p className="mt-4 rounded-control bg-superficie px-4 py-3 text-[0.9375rem] text-tenue">
                Esta competencia todavía no tiene ediciones.
              </p>
            ) : (
              <ul className="mt-4 flex flex-col gap-2">
                {ediciones.map((edicion) => (
                  <ElementoDelCatalogo
                    key={edicion.id}
                    titulo={`${edicion.nombre ?? "Edición"} ${edicion.anio ?? ""}`.trim()}
                    detalle={
                      <span className="cifras">
                        {fechasDeEdicion(edicion)}
                        {edicion.sede ? ` · ${edicion.sede}` : ""} · {participacionesDe(edicion.participaciones)}
                      </span>
                    }
                    activa={Boolean(edicion.activa)}
                    gestionable={gestionable}
                    cambiarEstado={cambiarEstadoEdicion.bind(null, id, edicion.id ?? 0)}
                    formulario={
                      <FormularioEdicion
                        competenciaId={id}
                        edicionId={edicion.id ?? 0}
                        iniciales={datosDeEdicion(edicion)}
                      />
                    }
                  />
                ))}
              </ul>
            )}
            {agrega ? (
              <div className="mt-5 rounded-pieza border border-linea p-4 sm:p-5">
                <h3 className="font-medium">Agregar edición</h3>
                <div className="mt-3">
                  <FormularioEdicion competenciaId={id} edicionId={null} iniciales={edicionVacia} />
                </div>
              </div>
            ) : null}
          </section>

          <section aria-labelledby="categorias">
            <h2 id="categorias" className="text-lg font-medium">
              Categorías
            </h2>
            {NIVELES_DE_CATEGORIA.map((nivel) => {
              const delNivel = categorias.filter((categoria) => categoria.nivel === nivel);
              return (
                <div key={nivel} className="mt-4">
                  <h3 className="text-[0.9375rem] font-medium text-tenue">{PLURALES_DE_NIVEL_DE_CATEGORIA[nivel]}</h3>
                  {delNivel.length === 0 ? (
                    <p className="mt-2 text-[0.9375rem] text-tenue">
                      Sin categorías de nivel {NOMBRES_DE_NIVEL_DE_CATEGORIA[nivel].toLowerCase()}.
                    </p>
                  ) : (
                    <ul className="mt-2 flex flex-col gap-2">
                      {delNivel.map((categoria) => (
                        <ElementoDelCatalogo
                          key={categoria.id}
                          titulo={categoria.nombre ?? "Categoría"}
                          detalle={
                            <span>
                              {categoria.descripcion ? `${categoria.descripcion} · ` : ""}
                              <span className="cifras">{participacionesDe(categoria.participaciones)}</span>
                            </span>
                          }
                          activa={Boolean(categoria.activa)}
                          gestionable={gestionable}
                          cambiarEstado={cambiarEstadoCategoria.bind(null, id, categoria.id ?? 0)}
                          formulario={
                            <FormularioCategoria
                              competenciaId={id}
                              categoriaId={categoria.id ?? 0}
                              iniciales={datosDeCategoria(categoria)}
                              nivelFijo={(categoria.participaciones ?? 0) > 0}
                            />
                          }
                        />
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
            {agrega ? (
              <div className="mt-5 rounded-pieza border border-linea p-4 sm:p-5">
                <h3 className="font-medium">Agregar categoría</h3>
                <div className="mt-3">
                  <FormularioCategoria
                    key="nueva-categoria"
                    competenciaId={id}
                    categoriaId={null}
                    iniciales={{ nivel: "BASICA", nombre: "", descripcion: "" }}
                    nivelFijo={false}
                  />
                </div>
              </div>
            ) : null}
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          {gestionable ? (
            <CambioDeEstado
              titulo="Estado en el catálogo"
              estadoActual={activa ? "Activa" : "Inactiva"}
              puntoActual={activa ? PUNTO_ACTIVA : PUNTO_INACTIVA}
              conMotivo={false}
              sinOpciones=""
              opciones={[
                activa
                  ? {
                      estado: "INACTIVA",
                      accion: "Desactivar",
                      descripcion: "Deja de admitir nuevas participaciones, ediciones y categorías. Lo registrado se conserva.",
                      exigeMotivo: false,
                      bloqueos: [],
                      avisos: [],
                    }
                  : {
                      estado: "ACTIVA",
                      accion: "Activar",
                      descripcion: "Vuelve a admitir nuevas ediciones, categorías y participaciones.",
                      exigeMotivo: false,
                      bloqueos: [],
                      avisos: [],
                    },
              ]}
              cambiar={cambiarEstadoCompetencia.bind(null, id)}
            />
          ) : null}
          <section aria-labelledby="uso-de-competencia" className="rounded-pieza border border-linea p-5">
            <h2 id="uso-de-competencia" className="text-lg font-medium">
              Participaciones
            </h2>
            <p className="cifras mt-2 text-[0.9375rem] text-tenue">
              {participacionesDe(ediciones.reduce((suma, edicion) => suma + (edicion.participaciones ?? 0), 0))} en{" "}
              {ediciones.length === 1 ? "1 edición" : `${ediciones.length} ediciones`}.
            </p>
            <EnlaceBoton
              href={rutaDeParticipaciones({ ...FILTROS_DE_PARTICIPACIONES_VACIOS, competencia: id })}
              variante="secundario"
              className="mt-4 w-full"
            >
              Ver participaciones
            </EnlaceBoton>
          </section>
        </div>
      </div>
    </>
  );
}

export default function PaginaCompetenciaDelCatalogo(props: Props) {
  return (
    <div className={CONTENEDOR_DE_GESTION}>
      <EnlaceVolver href={RUTA_CATALOGO_DE_COMPETENCIAS}>Volver al catálogo</EnlaceVolver>
      <Suspense fallback={<EsqueletoDeGestion conEncabezado mensaje="Cargando la competencia." />}>
        <Contenido {...props} />
      </Suspense>
    </div>
  );
}
