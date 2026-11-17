import type { Metadata } from "next";
import { GraduationCap, Users } from "lucide-react";
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
import { FormularioContacto } from "@/components/portal/instituciones/FormularioContacto";
import { FormularioInstitucion } from "@/components/portal/instituciones/FormularioInstitucion";
import { ResponsableDeInstitucion } from "@/components/portal/instituciones/ResponsableDeInstitucion";
import { ListaDeDatos, type Dato } from "@/components/portal/ListaDeDatos";
import { PuntoDeEstado } from "@/components/portal/PuntoDeEstado";
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import {
  listarResponsablesDeInstitucion,
  obtenerInstitucion,
  type Institucion,
  type UsuarioDetalle,
} from "@/lib/api/instituciones";
import { RUTA_CLUBES } from "@/lib/portal/filtros-clubes";
import { RUTA_DOCENTES } from "@/lib/portal/filtros-docentes";
import {
  NOMBRES_DE_ADHESION,
  PUNTOS_DE_ADHESION,
  RUTA_INSTITUCIONES,
} from "@/lib/portal/filtros-instituciones";
import { tieneAlcanceGlobal } from "@/lib/portal/menu";
import { conOpcionActual, opcionesDeCuentas } from "@/lib/portal/opciones";
import {
  puedeAdministrarInstituciones,
  puedeEditarContactoDeInstitucion,
} from "@/lib/portal/permisos";
import type { DatosDeContacto, DatosDeInstitucion } from "@/lib/portal/reglas-instituciones";
import { fechaCorta } from "@/lib/portal/tiempo";
import { idDe } from "@/lib/portal/validacion";
import { exigirSesion, type UsuarioSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Ficha de la institución",
};

type Props = PageProps<"/portal/instituciones/[id]">;

const RECURSO = { recurso: "instituciones", rutaDeLista: RUTA_INSTITUCIONES };
const NO_ENCONTRADA = "Esta institución no existe";
const AVISO_CREADA = "creada";
const RUTA_DEL_PANEL = "/portal";

function contactoDe(institucion: Institucion): DatosDeContacto {
  return {
    direccion: institucion.direccion ?? "",
    telefono: institucion.telefono ?? "",
    correoContacto: institucion.correoContacto ?? "",
    autoridadNombre: institucion.autoridadNombre ?? "",
    autoridadCargo: institucion.autoridadCargo ?? "",
  };
}

function datosDe(institucion: Institucion): DatosDeInstitucion {
  return {
    ...contactoDe(institucion),
    codigoAmie: institucion.codigoAmie ?? "",
    nombre: institucion.nombre ?? "",
    zona: institucion.zona ?? "",
    circuito: institucion.circuito ?? "",
    provincia: institucion.provincia ?? "",
    canton: institucion.canton ?? "",
    estadoAdhesion: institucion.estadoAdhesion ?? "",
    fechaAdhesion: institucion.fechaAdhesion ?? "",
  };
}

function nombreDeCuenta(cuenta: UsuarioDetalle): string {
  return [cuenta.apellidos, cuenta.nombres].filter(Boolean).join(" ") || cuenta.username || "Cuenta";
}

function datosFijos(institucion: Institucion): Dato[] {
  const estado = institucion.estadoAdhesion;
  return [
    { termino: "Código AMIE", valor: institucion.codigoAmie },
    {
      termino: "Adhesión a TIPI 3.0",
      valor: estado ? (
        <PuntoDeEstado punto={PUNTOS_DE_ADHESION[estado]}>
          {NOMBRES_DE_ADHESION[estado]}
          {institucion.fechaAdhesion ? ` desde ${fechaCorta(institucion.fechaAdhesion)}` : ""}
        </PuntoDeEstado>
      ) : null,
    },
    { termino: "Provincia", valor: institucion.provincia },
    { termino: "Cantón", valor: institucion.canton },
    { termino: "Zona", valor: institucion.zona },
    { termino: "Circuito", valor: institucion.circuito },
  ];
}

function datosDeContacto(institucion: Institucion): Dato[] {
  const autoridad = [institucion.autoridadNombre, institucion.autoridadCargo]
    .filter(Boolean)
    .join(", ");
  return [
    { termino: "Dirección", valor: institucion.direccion, ancho: true },
    { termino: "Teléfono", valor: institucion.telefono },
    { termino: "Correo de contacto", valor: institucion.correoContacto },
    { termino: "Autoridad", valor: autoridad },
  ];
}

function ResponsableFijo({
  institucion,
  usuario,
}: {
  institucion: Institucion;
  usuario: UsuarioSesion;
}) {
  const esPropio = Boolean(institucion.responsableId) && institucion.responsableId === usuario.id;
  return (
    <section aria-labelledby="titulo-responsable" className="rounded-pieza border border-linea p-5">
      <h2 id="titulo-responsable" className="text-lg font-medium">
        Responsable institucional
      </h2>
      <p className="mt-3 font-medium">
        {esPropio ? "Tú" : institucion.responsableId ? "Asignado" : "Sin asignar"}
      </p>
      <p className="mt-2 text-sm text-tenue">
        Solo la administración de TIPI 3.0 asigna o cambia al responsable institucional.
      </p>
    </section>
  );
}

function EnEstaInstitucion({ institucionId, global }: { institucionId: number; global: boolean }) {
  const filtro = global ? `?institucion=${institucionId}` : "";
  return (
    <section aria-labelledby="titulo-relacionados" className="rounded-pieza border border-linea p-5">
      <h2 id="titulo-relacionados" className="text-lg font-medium">
        En esta institución
      </h2>
      <div className="mt-4 flex flex-col gap-2">
        <EnlaceBoton href={`${RUTA_DOCENTES}${filtro}`} variante="secundario" className="w-full">
          <GraduationCap aria-hidden="true" size={18} />
          Ver docentes
        </EnlaceBoton>
        <EnlaceBoton href={`${RUTA_CLUBES}${filtro}`} variante="secundario" className="w-full">
          <Users aria-hidden="true" size={18} />
          Ver clubes
        </EnlaceBoton>
      </div>
    </section>
  );
}

function EsqueletoDePanel() {
  return <div aria-hidden="true" className="h-64 rounded-pieza bg-superficie motion-safe:animate-pulse" />;
}

async function PanelDeResponsable({ institucion }: { institucion: Institucion }) {
  const id = institucion.id ?? 0;
  const cuentas = await listarResponsablesDeInstitucion(id);
  const actual = cuentas?.find((cuenta) => cuenta.id === institucion.responsableId);
  const responsableId = institucion.responsableId ? String(institucion.responsableId) : "";
  const responsableNombre = actual
    ? `${nombreDeCuenta(actual)}${actual.activo ? "" : " (cuenta inactiva)"}`
    : responsableId
      ? "Cuenta no disponible"
      : null;

  return (
    <ResponsableDeInstitucion
      key={id}
      institucionId={id}
      responsableId={responsableId}
      responsableNombre={responsableNombre}
      cuentas={conOpcionActual(
        opcionesDeCuentas((cuentas ?? []).filter((cuenta) => cuenta.activo)),
        responsableId,
        responsableNombre ?? "Responsable actual",
      )}
    />
  );
}

async function Ficha({ params, searchParams }: Props) {
  const [{ id: segmento }, consulta, usuario] = await Promise.all([
    params,
    searchParams,
    exigirSesion(),
  ]);
  const id = idDe(segmento);

  if (!id) {
    return <AvisoNoEncontrado titulo={NO_ENCONTRADA} {...RECURSO} />;
  }
  if (!usuario) {
    return <AvisoSinServicio />;
  }

  const resultado = await obtenerInstitucion(id);

  if (resultado.estado === "no-encontrado") {
    return <AvisoNoEncontrado titulo={NO_ENCONTRADA} {...RECURSO} />;
  }
  if (resultado.estado === "denegado") {
    return <AvisoDenegado mensaje={resultado.mensaje} {...RECURSO} />;
  }
  if (resultado.estado === "sin-servicio") {
    return <AvisoSinServicio />;
  }

  const institucion = resultado.datos;
  const administra = puedeAdministrarInstituciones(usuario.rol);
  const editaContacto = !administra && puedeEditarContactoDeInstitucion(usuario.rol);
  const global = tieneAlcanceGlobal(usuario.rol);

  return (
    <>
      <EncabezadoDeGestion
        titulo={institucion.nombre ?? "Institución"}
        detalle={[
          institucion.codigoAmie ? `AMIE ${institucion.codigoAmie}` : null,
          [institucion.canton, institucion.provincia].filter(Boolean).join(", "),
        ]
          .filter(Boolean)
          .join(" · ")}
      />
      {consulta.aviso === AVISO_CREADA ? (
        <AvisoDeResultado>
          La institución se registró. El siguiente paso es asignarle su responsable institucional
          en el panel de la derecha.
        </AvisoDeResultado>
      ) : null}
      <div className={COLUMNAS_DE_GESTION}>
        <div className="min-w-0">
          {administra ? (
            <FormularioInstitucion key={id} institucionId={id} iniciales={datosDe(institucion)} />
          ) : (
            <>
              <section aria-labelledby="titulo-datos">
                <h2 id="titulo-datos" className="text-lg font-medium">
                  Datos de la institución
                </h2>
                <div className="mt-4">
                  <ListaDeDatos
                    datos={
                      editaContacto
                        ? datosFijos(institucion)
                        : [...datosFijos(institucion), ...datosDeContacto(institucion)]
                    }
                  />
                </div>
              </section>
              {editaContacto ? (
                <div className="mt-10 border-t border-linea pt-8">
                  <FormularioContacto
                    key={id}
                    institucionId={id}
                    iniciales={contactoDe(institucion)}
                  />
                </div>
              ) : null}
            </>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          {administra ? (
            <Suspense fallback={<EsqueletoDePanel />}>
              <PanelDeResponsable institucion={institucion} />
            </Suspense>
          ) : (
            <ResponsableFijo institucion={institucion} usuario={usuario} />
          )}
          <EnEstaInstitucion institucionId={id} global={global} />
        </div>
      </div>
    </>
  );
}

async function Contenido(props: Props) {
  const usuario = await exigirSesion();
  const global = tieneAlcanceGlobal(usuario?.rol);

  return (
    <>
      <EnlaceVolver href={global ? RUTA_INSTITUCIONES : RUTA_DEL_PANEL}>
        {global ? "Volver a instituciones" : "Volver al panel principal"}
      </EnlaceVolver>
      <Ficha {...props} />
    </>
  );
}

export default function PaginaFichaDeInstitucion(props: Props) {
  return (
    <div className={CONTENEDOR_DE_GESTION}>
      <Suspense
        fallback={
          <>
            <div aria-hidden="true" className="h-6" />
            <EsqueletoDeGestion conEncabezado mensaje="Cargando la ficha de la institución." />
          </>
        }
      >
        <Contenido {...props} />
      </Suspense>
    </div>
  );
}
