import type { Metadata } from "next";
import { Suspense } from "react";
import { EstadoDelDocente } from "@/components/portal/docentes/EstadoDelDocente";
import { FormularioDocente } from "@/components/portal/docentes/FormularioDocente";
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
import { ListaDeDatos } from "@/components/portal/ListaDeDatos";
import { PuntoDeEstado } from "@/components/portal/PuntoDeEstado";
import type { Docente } from "@/lib/api/clubes";
import { listarCuentasDisponibles, obtenerDocente } from "@/lib/api/docentes";
import { obtenerInstitucion } from "@/lib/api/instituciones";
import {
  NOMBRES_DE_ESTADO_DE_DOCENTE,
  PUNTOS_DE_ESTADO_DE_DOCENTE,
  RUTA_DOCENTES,
  estadoDeDocente,
} from "@/lib/portal/filtros-docentes";
import { conOpcionActual, opcionesDeCuentas } from "@/lib/portal/opciones";
import { puedeGestionarDocentes } from "@/lib/portal/permisos";
import type { DatosDeDocente } from "@/lib/portal/reglas-docentes";
import { idDe } from "@/lib/portal/validacion";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Ficha del docente",
};

type Props = PageProps<"/portal/docentes/[id]">;

const RECURSO = { recurso: "docentes", rutaDeLista: RUTA_DOCENTES };
const NO_ENCONTRADO = "Este docente no existe";
const AVISO_CREADO = "creado";

function nombreDe(docente: Docente): string {
  return [docente.apellidos, docente.nombres].filter(Boolean).join(" ") || "Docente";
}

function datosDe(docente: Docente): DatosDeDocente {
  return {
    institucionId: docente.institucionId ? String(docente.institucionId) : "",
    nombres: docente.nombres ?? "",
    apellidos: docente.apellidos ?? "",
    correo: docente.correo ?? "",
    telefono: docente.telefono ?? "",
    usuarioId: docente.usuarioId ? String(docente.usuarioId) : "",
  };
}

async function nombreDeInstitucion(id?: number): Promise<string | null> {
  if (!id) {
    return null;
  }
  const resultado = await obtenerInstitucion(id);
  return resultado.estado === "ok" ? (resultado.datos.nombre ?? null) : null;
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

  const resultado = await obtenerDocente(id);

  if (resultado.estado === "no-encontrado") {
    return <AvisoNoEncontrado titulo={NO_ENCONTRADO} {...RECURSO} />;
  }
  if (resultado.estado === "denegado") {
    return <AvisoDenegado mensaje={resultado.mensaje} {...RECURSO} />;
  }
  if (resultado.estado === "sin-servicio") {
    return <AvisoSinServicio />;
  }

  const docente = resultado.datos;
  const gestionable = puedeGestionarDocentes(usuario.rol);
  const estado = estadoDeDocente(docente.activo);
  const iniciales = datosDe(docente);

  const [institucion, cuentas] = await Promise.all([
    nombreDeInstitucion(docente.institucionId),
    gestionable && docente.institucionId
      ? listarCuentasDisponibles(docente.institucionId, id)
      : [],
  ]);

  if (!cuentas) {
    return <AvisoSinServicio />;
  }

  return (
    <>
      <EncabezadoDeGestion
        titulo={nombreDe(docente)}
        detalle={[institucion, docente.correo].filter(Boolean).join(" · ")}
      />
      {consulta.aviso === AVISO_CREADO ? (
        <AvisoDeResultado>
          El docente se registró y quedó activo. Ya puedes asignarlo como responsable de un club.
        </AvisoDeResultado>
      ) : null}
      <div className={COLUMNAS_DE_GESTION}>
        <div className="min-w-0">
          {gestionable ? (
            <FormularioDocente
              key={id}
              docenteId={id}
              iniciales={iniciales}
              instituciones={null}
              institucionFija={institucion ?? "Institución"}
              cuentas={conOpcionActual(
                opcionesDeCuentas(cuentas),
                iniciales.usuarioId,
                "Cuenta actual (inactiva)",
              )}
            />
          ) : (
            <section aria-labelledby="titulo-datos">
              <h2 id="titulo-datos" className="text-lg font-medium">
                Datos del docente
              </h2>
              <div className="mt-4">
                <ListaDeDatos
                  datos={[
                    { termino: "Institución", valor: institucion },
                    { termino: "Correo", valor: docente.correo },
                    { termino: "Teléfono", valor: docente.telefono },
                    {
                      termino: "Acceso al portal",
                      valor: docente.usuarioId ? "Con cuenta vinculada" : "Sin cuenta vinculada",
                    },
                  ]}
                />
              </div>
            </section>
          )}
        </div>
        {gestionable ? (
          <EstadoDelDocente key={id} docenteId={id} estado={estado} />
        ) : (
          <section aria-labelledby="titulo-estado" className="rounded-pieza border border-linea p-5">
            <h2 id="titulo-estado" className="text-lg font-medium">
              Estado del docente
            </h2>
            <p className="mt-3 font-medium">
              <PuntoDeEstado punto={PUNTOS_DE_ESTADO_DE_DOCENTE[estado]}>
                {NOMBRES_DE_ESTADO_DE_DOCENTE[estado]}
              </PuntoDeEstado>
            </p>
            <p className="mt-3 text-sm text-tenue">
              Solo el administrador y el responsable institucional modifican a los docentes.
            </p>
          </section>
        )}
      </div>
    </>
  );
}

export default function PaginaFichaDeDocente(props: Props) {
  return (
    <div className={CONTENEDOR_DE_GESTION}>
      <EnlaceVolver href={RUTA_DOCENTES}>Volver a docentes</EnlaceVolver>
      <Suspense
        fallback={<EsqueletoDeGestion conEncabezado mensaje="Cargando la ficha del docente." />}
      >
        <Contenido {...props} />
      </Suspense>
    </div>
  );
}
