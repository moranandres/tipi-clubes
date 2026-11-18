"use client";

import { Save, TriangleAlert } from "lucide-react";
import { useRef, type FormEvent } from "react";
import { DatoFijo } from "@/components/portal/formularios/DatoFijo";
import {
  enfocarPrimerInvalido,
  repartirErrores,
  useCampos,
  useEnvio,
  useReinicioTrasCrear,
} from "@/components/portal/formularios/ganchos";
import { ZonaDeAviso } from "@/components/portal/formularios/ZonaDeAviso";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { CampoSeleccion } from "@/components/ui/CampoSeleccion";
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import { MENSAJE_REVISAR_CAMPOS } from "@/lib/acciones/resultado";
import { actualizarUsuario, crearUsuario } from "@/lib/acciones/usuarios";
import {
  DESCRIPCIONES_DE_ROL_DE_USUARIO,
  NOMBRES_DE_ROL_DE_USUARIO,
  ROLES_DE_USUARIO,
  RUTA_USUARIOS,
  esRolDeUsuario,
  rolRequiereInstitucion,
} from "@/lib/portal/filtros-usuarios";
import type { OpcionDeFormulario } from "@/lib/portal/opciones";
import {
  CAMPOS_AL_EDITAR_USUARIO,
  CAMPOS_DE_USUARIO,
  LIMITES_DE_USUARIO,
  validarUsuario,
  type DatosDeUsuario,
} from "@/lib/portal/reglas-usuarios";
import { hayErrores } from "@/lib/portal/validacion";
import { CampoDeClave } from "./CampoDeClave";

type Props = {
  usuarioId: number | null;
  iniciales: DatosDeUsuario;
  instituciones: OpcionDeFormulario[];
  esPropio: boolean;
};

const LEYENDA = "text-lg font-medium";
const REJILLA = "mt-4 grid gap-x-5 gap-y-3 sm:grid-cols-2";

const OPCIONES_DE_ROL = ROLES_DE_USUARIO.map((rol) => ({
  valor: rol,
  texto: NOMBRES_DE_ROL_DE_USUARIO[rol],
}));

export function FormularioUsuario({ usuarioId, iniciales, instituciones, esPropio }: Props) {
  const esNuevo = usuarioId === null;
  const formulario = useRef<HTMLFormElement>(null);
  const { valores, errores, cambiar, setValores, setErrores } = useCampos(iniciales, [
    ["rolCodigo", "institucionId"],
  ]);
  const { pendiente, aviso, enviar, navegar, avisar, limpiarAviso } = useEnvio();
  const reiniciarAlSalir = useReinicioTrasCrear(() => {
    setValores(iniciales);
    setErrores({});
  });

  const conInstitucion = rolRequiereInstitucion(valores.rolCodigo);
  const cambiaAcceso =
    !esNuevo &&
    (valores.rolCodigo !== iniciales.rolCodigo ||
      (conInstitucion && valores.institucionId !== iniciales.institucionId));

  function alElegirRol(rol: string) {
    cambiar("rolCodigo", rol);
    if (!rolRequiereInstitucion(rol)) {
      cambiar("institucionId", "");
    }
  }

  function ayudaDeRol(): string {
    if (esPropio) {
      return "No puedes cambiar el rol de tu propia cuenta.";
    }
    return esRolDeUsuario(valores.rolCodigo)
      ? DESCRIPCIONES_DE_ROL_DE_USUARIO[valores.rolCodigo]
      : "Define qué secciones del portal verá la persona.";
  }

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (pendiente) {
      return;
    }

    const encontrados = validarUsuario(valores, esNuevo);
    if (hayErrores(encontrados)) {
      setErrores(encontrados);
      avisar("error", MENSAJE_REVISAR_CAMPOS);
      enfocarPrimerInvalido(formulario.current);
      return;
    }

    limpiarAviso();
    enviar(
      () => (esNuevo ? crearUsuario(valores) : actualizarUsuario(usuarioId, valores)),
      (resultado) => {
        if (resultado.ok) {
          if (resultado.destino) {
            reiniciarAlSalir();
            navegar(resultado.destino);
            return;
          }
          avisar("exito", resultado.mensaje);
          return;
        }
        const { deCampos, ajenos } = repartirErrores(
          resultado.errores,
          esNuevo ? CAMPOS_DE_USUARIO : CAMPOS_AL_EDITAR_USUARIO,
        );
        setErrores(deCampos);
        avisar("error", resultado.mensaje, ajenos);
        enfocarPrimerInvalido(formulario.current);
      },
    );
  }

  return (
    <form
      ref={formulario}
      onSubmit={alEnviar}
      noValidate
      aria-label={esNuevo ? "Datos de la nueva cuenta" : "Datos de la cuenta"}
    >
      <fieldset className="min-w-0">
        <legend className={LEYENDA}>Datos de la persona</legend>
        <div className={REJILLA}>
          <Campo
            etiqueta="Nombres"
            name="nombres"
            type="text"
            autoComplete="off"
            autoCapitalize="words"
            required
            maxLength={LIMITES_DE_USUARIO.nombres}
            value={valores.nombres}
            error={errores.nombres}
            onChange={(evento) => cambiar("nombres", evento.target.value)}
          />
          <Campo
            etiqueta="Apellidos"
            name="apellidos"
            type="text"
            autoComplete="off"
            autoCapitalize="words"
            required
            maxLength={LIMITES_DE_USUARIO.apellidos}
            value={valores.apellidos}
            error={errores.apellidos}
            onChange={(evento) => cambiar("apellidos", evento.target.value)}
          />
          <Campo
            etiqueta="Correo"
            name="email"
            type="email"
            autoComplete="off"
            spellCheck={false}
            required
            maxLength={LIMITES_DE_USUARIO.email}
            value={valores.email}
            error={errores.email}
            ayuda="Sirve para iniciar sesión y recuperar la contraseña."
            onChange={(evento) => cambiar("email", evento.target.value)}
          />
          {esNuevo ? (
            <Campo
              etiqueta="Usuario"
              name="username"
              type="text"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              required
              maxLength={LIMITES_DE_USUARIO.username}
              value={valores.username}
              error={errores.username}
              ayuda="De 3 a 50 caracteres. No se puede cambiar después."
              onChange={(evento) => cambiar("username", evento.target.value)}
            />
          ) : (
            <DatoFijo etiqueta="Usuario" valor={valores.username} ayuda="No se puede cambiar." />
          )}
        </div>
      </fieldset>

      <fieldset className="mt-8 min-w-0">
        <legend className={LEYENDA}>Rol y alcance</legend>
        <div className={REJILLA}>
          <div className={conInstitucion ? "" : "sm:col-span-2"}>
            <CampoSeleccion
              etiqueta="Rol"
              name="rolCodigo"
              required
              opciones={OPCIONES_DE_ROL}
              textoSinEleccion="Elige un rol"
              value={valores.rolCodigo}
              disabled={esPropio}
              error={errores.rolCodigo}
              ayuda={ayudaDeRol()}
              onChange={(evento) => alElegirRol(evento.target.value)}
            />
          </div>
          {conInstitucion ? (
            <CampoSeleccion
              etiqueta="Institución"
              name="institucionId"
              required
              opciones={instituciones}
              textoSinEleccion={
                instituciones.length > 0 ? "Elige una institución" : "No hay instituciones registradas"
              }
              value={valores.institucionId}
              disabled={instituciones.length === 0}
              error={errores.institucionId}
              ayuda="Limita lo que ve y modifica a esta institución."
              onChange={(evento) => cambiar("institucionId", evento.target.value)}
            />
          ) : null}
        </div>
        {cambiaAcceso ? (
          <p role="status" className="entrada-mensaje mt-1 flex items-start gap-2 text-sm text-aviso">
            <TriangleAlert aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
            <span className="min-w-0">
              Al guardar se cerrarán las sesiones abiertas de esta cuenta, porque cambia su acceso.
            </span>
          </p>
        ) : null}
      </fieldset>

      {esNuevo ? (
        <fieldset className="mt-8 min-w-0">
          <legend className={LEYENDA}>Contraseña temporal</legend>
          <div className="mt-4 max-w-[26rem]">
            <CampoDeClave
              etiqueta="Contraseña temporal"
              valor={valores.passwordTemporal}
              error={errores.passwordTemporal}
              ayuda="Mínimo 10 caracteres con mayúscula, minúscula y número. Se pedirá cambiarla al entrar."
              alCambiar={(valor) => cambiar("passwordTemporal", valor)}
            />
          </div>
        </fieldset>
      ) : null}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Boton type="submit" cargando={pendiente} textoCargando="Guardando">
          <Save aria-hidden="true" size={16} />
          {esNuevo ? "Crear cuenta" : "Guardar cambios"}
        </Boton>
        <EnlaceBoton href={RUTA_USUARIOS} variante="secundario">
          {esNuevo ? "Cancelar" : "Volver a la lista"}
        </EnlaceBoton>
      </div>
      <ZonaDeAviso aviso={aviso} className="mt-4" />
    </form>
  );
}
