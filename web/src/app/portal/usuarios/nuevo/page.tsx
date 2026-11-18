import type { Metadata } from "next";
import { Suspense } from "react";
import {
  AvisoSinAcceso,
  AvisoSinServicio,
} from "@/components/portal/formularios/AvisosDeGestion";
import {
  CONTENEDOR_DE_GESTION,
  EncabezadoDeGestion,
  EnlaceVolver,
  EsqueletoDeGestion,
} from "@/components/portal/formularios/PiezasDeGestion";
import { FormularioUsuario } from "@/components/portal/usuarios/FormularioUsuario";
import { listarInstitucionesParaFormulario } from "@/lib/api/clubes";
import { RUTA_USUARIOS } from "@/lib/portal/filtros-usuarios";
import { opcionesConNombre } from "@/lib/portal/opciones";
import { puedeAdministrarUsuarios } from "@/lib/portal/permisos";
import type { DatosDeUsuario } from "@/lib/portal/reglas-usuarios";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Nueva cuenta",
};

const INICIALES: DatosDeUsuario = {
  username: "",
  email: "",
  nombres: "",
  apellidos: "",
  rolCodigo: "",
  institucionId: "",
  passwordTemporal: "",
};

async function Contenido() {
  const usuario = await exigirSesion();

  if (!usuario) {
    return <AvisoSinServicio />;
  }
  if (!puedeAdministrarUsuarios(usuario.rol)) {
    return <AvisoSinAcceso quienes="el administrador del sistema" />;
  }

  const instituciones = await listarInstitucionesParaFormulario();

  if (!instituciones) {
    return <AvisoSinServicio />;
  }

  return (
    <div className="mt-8 max-w-[52rem]">
      <FormularioUsuario
        usuarioId={null}
        iniciales={INICIALES}
        instituciones={opcionesConNombre(instituciones)}
        esPropio={false}
      />
    </div>
  );
}

export default function PaginaNuevaCuenta() {
  return (
    <div className={CONTENEDOR_DE_GESTION}>
      <EnlaceVolver href={RUTA_USUARIOS}>Volver a usuarios</EnlaceVolver>
      <EncabezadoDeGestion
        titulo="Nueva cuenta"
        detalle="La cuenta queda activa con una contraseña temporal que la persona deberá cambiar en su primer ingreso."
      />
      <Suspense fallback={<EsqueletoDeGestion mensaje="Cargando el formulario de la cuenta." />}>
        <Contenido />
      </Suspense>
    </div>
  );
}
