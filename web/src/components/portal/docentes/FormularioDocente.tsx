"use client";

import { Save } from "lucide-react";
import { useRef, useState, useTransition, type FormEvent } from "react";
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
import {
  actualizarDocente,
  consultarCuentasDeInstitucion,
  crearDocente,
} from "@/lib/acciones/docentes";
import { MENSAJE_REVISAR_CAMPOS } from "@/lib/acciones/resultado";
import { RUTA_DOCENTES } from "@/lib/portal/filtros-docentes";
import type { OpcionDeFormulario } from "@/lib/portal/opciones";
import {
  CAMPOS_DE_DOCENTE,
  LIMITES_DE_DOCENTE,
  validarDocente,
  type CampoDeDocente,
  type DatosDeDocente,
} from "@/lib/portal/reglas-docentes";
import { hayErrores } from "@/lib/portal/validacion";

type Props = {
  docenteId: number | null;
  iniciales: DatosDeDocente;
  instituciones: OpcionDeFormulario[] | null;
  institucionFija: string;
  cuentas: OpcionDeFormulario[];
};

const CAMPOS_AL_EDITAR: readonly CampoDeDocente[] = CAMPOS_DE_DOCENTE.filter(
  (campo) => campo !== "institucionId",
);

const LEYENDA = "text-lg font-medium";
const REJILLA = "mt-4 grid gap-x-5 gap-y-3 sm:grid-cols-2";

export function FormularioDocente({
  docenteId,
  iniciales,
  instituciones,
  institucionFija,
  cuentas,
}: Props) {
  const esNuevo = docenteId === null;
  const formulario = useRef<HTMLFormElement>(null);
  const consulta = useRef(0);
  const { valores, errores, cambiar, setValores, setErrores } = useCampos(iniciales);
  const { pendiente, aviso, enviar, navegar, avisar, limpiarAviso } = useEnvio();
  const [cuentasDisponibles, setCuentasDisponibles] = useState(cuentas);
  const [avisoDeCuentas, setAvisoDeCuentas] = useState<string | undefined>();
  const [cargandoCuentas, iniciarCarga] = useTransition();
  const reiniciarAlSalir = useReinicioTrasCrear(() => {
    setValores(iniciales);
    setErrores({});
    setCuentasDisponibles(cuentas);
    setAvisoDeCuentas(undefined);
  });

  function alElegirInstitucion(institucionId: string) {
    cambiar("institucionId", institucionId);
    cambiar("usuarioId", "");
    setCuentasDisponibles([]);
    setAvisoDeCuentas(undefined);
    consulta.current += 1;
    const turno = consulta.current;

    if (!institucionId) {
      return;
    }

    iniciarCarga(async () => {
      const resultado = await consultarCuentasDeInstitucion(institucionId).catch(() => null);
      if (turno !== consulta.current) {
        return;
      }
      if (resultado?.ok) {
        setCuentasDisponibles(resultado.cuentas);
        return;
      }
      setAvisoDeCuentas(
        resultado?.mensaje ?? "No pudimos cargar las cuentas. Vuelve a elegir la institución.",
      );
    });
  }

  function ayudaDeCuenta(): string {
    if (cargandoCuentas) {
      return "Cargando las cuentas de la institución.";
    }
    if (avisoDeCuentas) {
      return avisoDeCuentas;
    }
    if (instituciones && !valores.institucionId) {
      return "Elige primero la institución.";
    }
    if (cuentasDisponibles.length === 0) {
      return "No hay cuentas docentes libres en la institución. Puedes vincularla después.";
    }
    return "Le permite entrar al portal para pasar asistencia y cargar evidencias.";
  }

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (pendiente) {
      return;
    }

    const encontrados = validarDocente(valores, esNuevo);
    if (hayErrores(encontrados)) {
      setErrores(encontrados);
      avisar("error", MENSAJE_REVISAR_CAMPOS);
      enfocarPrimerInvalido(formulario.current);
      return;
    }

    limpiarAviso();
    enviar(
      () => (esNuevo ? crearDocente(valores) : actualizarDocente(docenteId, valores)),
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
          esNuevo ? CAMPOS_DE_DOCENTE : CAMPOS_AL_EDITAR,
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
      aria-label={esNuevo ? "Datos del nuevo docente" : "Datos del docente"}
    >
      <fieldset className="min-w-0">
        <legend className={LEYENDA}>Datos del docente</legend>
        <div className={REJILLA}>
          <div className="sm:col-span-2">
            {esNuevo && instituciones ? (
              <CampoSeleccion
                etiqueta="Institución"
                name="institucionId"
                required
                opciones={instituciones}
                textoSinEleccion="Elige una institución"
                value={valores.institucionId}
                error={errores.institucionId}
                ayuda="No se puede cambiar después del registro."
                onChange={(evento) => alElegirInstitucion(evento.target.value)}
              />
            ) : (
              <DatoFijo
                etiqueta="Institución"
                valor={institucionFija}
                ayuda={esNuevo ? "Se asigna según tu cuenta." : "No se puede cambiar."}
              />
            )}
          </div>
          <Campo
            etiqueta="Nombres"
            name="nombres"
            type="text"
            autoComplete="off"
            autoCapitalize="words"
            required
            maxLength={LIMITES_DE_DOCENTE.nombres}
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
            maxLength={LIMITES_DE_DOCENTE.apellidos}
            value={valores.apellidos}
            error={errores.apellidos}
            onChange={(evento) => cambiar("apellidos", evento.target.value)}
          />
          <Campo
            etiqueta="Correo (opcional)"
            name="correo"
            type="email"
            autoComplete="off"
            spellCheck={false}
            maxLength={LIMITES_DE_DOCENTE.correo}
            value={valores.correo}
            error={errores.correo}
            onChange={(evento) => cambiar("correo", evento.target.value)}
          />
          <Campo
            etiqueta="Teléfono (opcional)"
            name="telefono"
            type="tel"
            autoComplete="off"
            inputMode="tel"
            maxLength={LIMITES_DE_DOCENTE.telefono}
            className="cifras"
            value={valores.telefono}
            error={errores.telefono}
            onChange={(evento) => cambiar("telefono", evento.target.value)}
          />
        </div>
      </fieldset>

      <fieldset className="mt-8 min-w-0">
        <legend className={LEYENDA}>Acceso al portal</legend>
        <div className={REJILLA}>
          <div className="sm:col-span-2">
            <CampoSeleccion
              etiqueta="Cuenta de usuario (opcional)"
              name="usuarioId"
              opciones={cuentasDisponibles}
              textoSinEleccion={cargandoCuentas ? "Cargando cuentas" : "Sin cuenta vinculada"}
              value={valores.usuarioId}
              disabled={cargandoCuentas || (Boolean(instituciones) && !valores.institucionId)}
              error={errores.usuarioId}
              ayuda={ayudaDeCuenta()}
              onChange={(evento) => cambiar("usuarioId", evento.target.value)}
            />
          </div>
        </div>
      </fieldset>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Boton type="submit" cargando={pendiente} textoCargando="Guardando">
          <Save aria-hidden="true" size={16} />
          {esNuevo ? "Registrar docente" : "Guardar cambios"}
        </Boton>
        <EnlaceBoton href={RUTA_DOCENTES} variante="secundario">
          {esNuevo ? "Cancelar" : "Volver a la lista"}
        </EnlaceBoton>
      </div>
      <ZonaDeAviso aviso={aviso} className="mt-4" />
    </form>
  );
}
