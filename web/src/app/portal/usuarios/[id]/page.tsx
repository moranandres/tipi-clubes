import type { Metadata } from "next";
import Link from "next/link";
import { History } from "lucide-react";
import { Suspense } from "react";
import {
  AvisoDenegado,
  AvisoNoEncontrado,
  AvisoSinAcceso,
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
import { EstadoDelUsuario } from "@/components/portal/usuarios/EstadoDelUsuario";
import { FormularioUsuario } from "@/components/portal/usuarios/FormularioUsuario";
import { RestablecerClave } from "@/components/portal/usuarios/RestablecerClave";
import { listarInstitucionesParaFormulario } from "@/lib/api/clubes";
import { obtenerUsuario, type Usuario } from "@/lib/api/usuarios";
import { rutaDeAuditoria, FILTROS_DE_AUDITORIA_VACIOS } from "@/lib/portal/filtros-auditoria";
import { RUTA_DOCENTES } from "@/lib/portal/filtros-docentes";
import {
  RUTA_USUARIOS,
  estaBloqueado,
  estadoDeUsuario,
  nombreDeRolDeUsuario,
  nombreDeUsuario,
} from "@/lib/portal/filtros-usuarios";
import { opcionesConNombre } from "@/lib/portal/opciones";
import { puedeAdministrarUsuarios } from "@/lib/portal/permisos";
import type { DatosDeUsuario } from "@/lib/portal/reglas-usuarios";
import { momentoCorto } from "@/lib/portal/tiempo";
import { idDe } from "@/lib/portal/validacion";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Cuenta de usuario",
};

type Props = PageProps<"/portal/usuarios/[id]">;

const RECURSO = { recurso: "usuarios", rutaDeLista: RUTA_USUARIOS };
const NO_ENCONTRADO = "Esta cuenta no existe";
const AVISO_CREADO = "creado";

function datosDe(usuario: Usuario): DatosDeUsuario {
  return {
    username: usuario.username ?? "",
    email: usuario.email ?? "",
    nombres: usuario.nombres ?? "",
    apellidos: usuario.apellidos ?? "",
    rolCodigo: usuario.rol ?? "",
    institucionId: usuario.institucionId ? String(usuario.institucionId) : "",
    passwordTemporal: "",
  };
}

function AvisoDeCreacion({ usuario }: { usuario: Usuario }) {
  return (
    <AvisoDeResultado>
      La cuenta se creó y quedó activa. Entrega a la persona su usuario y la contraseña temporal; se
      le pedirá cambiarla al entrar.
      {usuario.rol === "DOCENTE" ? (
        <>
          {" "}
          Para que pase asistencia,{" "}
          <Link href={RUTA_DOCENTES} className="font-medium text-acento">
            vincúlala a su ficha en Docentes
          </Link>
          .
        </>
      ) : null}
    </AvisoDeResultado>
  );
}

async function Contenido({ params, searchParams }: Props) {
  const [{ id: segmento }, consulta, sesion] = await Promise.all([
    params,
    searchParams,
    exigirSesion(),
  ]);
  const id = idDe(segmento);

  if (!sesion) {
    return <AvisoSinServicio />;
  }
  if (!puedeAdministrarUsuarios(sesion.rol)) {
    return <AvisoSinAcceso quienes="el administrador del sistema" />;
  }
  if (!id) {
    return <AvisoNoEncontrado titulo={NO_ENCONTRADO} {...RECURSO} />;
  }

  const [resultado, instituciones] = await Promise.all([
    obtenerUsuario(id),
    listarInstitucionesParaFormulario(),
  ]);

  if (resultado.estado === "no-encontrado") {
    return <AvisoNoEncontrado titulo={NO_ENCONTRADO} {...RECURSO} />;
  }
  if (resultado.estado === "denegado") {
    return <AvisoDenegado mensaje={resultado.mensaje} {...RECURSO} />;
  }
  if (resultado.estado === "sin-servicio" || !instituciones) {
    return <AvisoSinServicio />;
  }

  const usuario = resultado.datos;
  const esPropio = sesion.id === id;
  const bloqueado = estaBloqueado(usuario.bloqueadoHasta);
  const institucion = instituciones.find((opcion) => opcion.id === usuario.institucionId);

  return (
    <>
      <EncabezadoDeGestion
        titulo={nombreDeUsuario(usuario)}
        detalle={[usuario.username, nombreDeRolDeUsuario(usuario.rol), institucion?.nombre]
          .filter(Boolean)
          .join(" · ")}
      />
      {consulta.aviso === AVISO_CREADO ? <AvisoDeCreacion usuario={usuario} /> : null}
      <div className={COLUMNAS_DE_GESTION}>
        <div className="min-w-0">
          <FormularioUsuario
            key={id}
            usuarioId={id}
            iniciales={datosDe(usuario)}
            instituciones={opcionesConNombre(instituciones)}
            esPropio={esPropio}
          />
          <section aria-labelledby="titulo-actividad" className="mt-10">
            <h2 id="titulo-actividad" className="text-lg font-medium">
              Actividad de la cuenta
            </h2>
            <div className="mt-4">
              <ListaDeDatos
                datos={[
                  {
                    termino: "Último acceso",
                    valor: momentoCorto(usuario.ultimoAcceso) || "Todavía no ha iniciado sesión",
                  },
                  {
                    termino: "Contraseña",
                    valor: usuario.debeCambiarPassword
                      ? "Temporal: debe cambiarla en su próximo ingreso"
                      : "Definida por la persona",
                  },
                  bloqueado
                    ? {
                        termino: "Bloqueo por intentos fallidos",
                        valor: `Hasta el ${momentoCorto(usuario.bloqueadoHasta)}. Asignar una contraseña temporal la desbloquea.`,
                        ancho: true,
                      }
                    : null,
                ]}
              />
            </div>
            <Link
              href={rutaDeAuditoria({
                ...FILTROS_DE_AUDITORIA_VACIOS,
                q: usuario.username ?? "",
              })}
              className="mt-6 inline-flex items-center gap-2 text-[0.9375rem] font-medium text-acento"
            >
              <History aria-hidden="true" size={16} />
              Ver sus acciones en la auditoría
            </Link>
          </section>
        </div>
        <div className="flex flex-col gap-6">
          <EstadoDelUsuario
            usuarioId={id}
            estado={estadoDeUsuario(usuario.activo)}
            esPropio={esPropio}
            esAdministrador={usuario.rol === "ADMIN"}
          />
          <RestablecerClave usuarioId={id} esPropio={esPropio} />
        </div>
      </div>
    </>
  );
}

export default function PaginaCuentaDeUsuario(props: Props) {
  return (
    <div className={CONTENEDOR_DE_GESTION}>
      <EnlaceVolver href={RUTA_USUARIOS}>Volver a usuarios</EnlaceVolver>
      <Suspense
        fallback={<EsqueletoDeGestion conEncabezado mensaje="Cargando la cuenta de usuario." />}
      >
        <Contenido {...props} />
      </Suspense>
    </div>
  );
}
