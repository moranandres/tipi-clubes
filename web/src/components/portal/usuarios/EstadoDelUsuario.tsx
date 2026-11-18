"use client";

import { CambioDeEstado } from "@/components/portal/formularios/CambioDeEstado";
import { cambiarEstadoDeUsuario } from "@/lib/acciones/usuarios";
import {
  NOMBRE_DE_ESTADO_DE_USUARIO,
  PUNTOS_DE_ESTADO_DE_USUARIO,
  type EstadoUsuario,
} from "@/lib/portal/filtros-usuarios";

type Props = {
  usuarioId: number;
  estado: EstadoUsuario;
  esPropio: boolean;
  esAdministrador: boolean;
};

const DESTINOS: Record<EstadoUsuario, EstadoUsuario> = {
  ACTIVO: "INACTIVO",
  INACTIVO: "ACTIVO",
};

const ACCIONES: Record<EstadoUsuario, string> = {
  ACTIVO: "Reactivar la cuenta",
  INACTIVO: "Desactivar la cuenta",
};

const DESCRIPCIONES: Record<EstadoUsuario, string> = {
  ACTIVO: "Vuelve a permitir el inicio de sesión con su contraseña actual.",
  INACTIVO: "Impide el inicio de sesión y cierra sus sesiones abiertas. Sus registros se conservan.",
};

export function EstadoDelUsuario({ usuarioId, estado, esPropio, esAdministrador }: Props) {
  const destino = DESTINOS[estado];
  const bloqueos =
    destino === "INACTIVO" && esPropio
      ? ["No puedes desactivar tu propia cuenta. Pide a otro administrador que lo haga."]
      : [];
  const avisos =
    destino === "INACTIVO" && esAdministrador && !esPropio
      ? ["Debe quedar al menos otro administrador activo; si no, el sistema lo impedirá."]
      : [];

  return (
    <CambioDeEstado
      titulo="Estado de la cuenta"
      estadoActual={NOMBRE_DE_ESTADO_DE_USUARIO[estado]}
      puntoActual={PUNTOS_DE_ESTADO_DE_USUARIO[estado]}
      opciones={[
        {
          estado: destino,
          accion: ACCIONES[destino],
          descripcion: DESCRIPCIONES[destino],
          exigeMotivo: false,
          bloqueos,
          avisos,
        },
      ]}
      sinOpciones=""
      conMotivo={false}
      cambiar={(nuevo) => cambiarEstadoDeUsuario(usuarioId, nuevo)}
    />
  );
}
