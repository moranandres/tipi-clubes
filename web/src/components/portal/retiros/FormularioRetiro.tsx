"use client";

import { Send } from "lucide-react";
import { useRef, useState, useTransition, type FormEvent } from "react";
import {
  enfocarPrimerInvalido,
  repartirErrores,
  useCampos,
  useEnvio,
  useReinicioTrasCrear,
} from "@/components/portal/formularios/ganchos";
import { ZonaDeAviso } from "@/components/portal/formularios/ZonaDeAviso";
import { Boton } from "@/components/ui/Boton";
import { CampoSeleccion } from "@/components/ui/CampoSeleccion";
import { CampoTextoLargo } from "@/components/ui/CampoTextoLargo";
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import { MENSAJE_REVISAR_CAMPOS } from "@/lib/acciones/resultado";
import { consultarIntegrantesDeClub, crearRetiro } from "@/lib/acciones/retiros";
import { RUTA_RETIROS } from "@/lib/portal/filtros-retiros";
import type { OpcionDeFormulario } from "@/lib/portal/opciones";
import {
  CAMPOS_DE_RETIRO,
  MOTIVO_MAXIMO_DE_RETIRO,
  MOTIVO_MINIMO_DE_RETIRO,
  validarRetiro,
  type DatosDeRetiro,
} from "@/lib/portal/reglas-retiros";
import { hayErrores } from "@/lib/portal/validacion";

type Props = {
  clubes: OpcionDeFormulario[];
  iniciales: DatosDeRetiro;
  integrantesIniciales: OpcionDeFormulario[] | null;
};

const LEYENDA = "text-lg font-medium";

export function FormularioRetiro({ clubes, iniciales, integrantesIniciales }: Props) {
  const formulario = useRef<HTMLFormElement>(null);
  const consulta = useRef(0);
  const { valores, errores, cambiar, setValores, setErrores } = useCampos(iniciales);
  const { pendiente, aviso, enviar, navegar, avisar, limpiarAviso } = useEnvio();
  const [integrantes, setIntegrantes] = useState<OpcionDeFormulario[]>(integrantesIniciales ?? []);
  const [avisoDeIntegrantes, setAvisoDeIntegrantes] = useState<string | undefined>();
  const [cargando, iniciarCarga] = useTransition();
  const reiniciarAlSalir = useReinicioTrasCrear(() => {
    setValores(iniciales);
    setErrores({});
    setIntegrantes(integrantesIniciales ?? []);
    setAvisoDeIntegrantes(undefined);
  });

  const sinClub = !valores.clubId;
  const longitud = valores.motivo.trim().length;

  function alElegirClub(clubId: string) {
    cambiar("clubId", clubId);
    cambiar("inscripcionId", "");
    setIntegrantes([]);
    setAvisoDeIntegrantes(undefined);
    consulta.current += 1;
    const turno = consulta.current;

    if (!clubId) {
      return;
    }

    iniciarCarga(async () => {
      const resultado = await consultarIntegrantesDeClub(clubId).catch(() => null);
      if (turno !== consulta.current) {
        return;
      }
      if (resultado?.ok) {
        setIntegrantes(resultado.integrantes);
        return;
      }
      setAvisoDeIntegrantes(
        resultado?.mensaje ?? "No pudimos cargar los integrantes del club. Vuelve a elegirlo.",
      );
    });
  }

  function ayudaDeIntegrante(): string {
    if (sinClub) {
      return "Elige primero el club.";
    }
    if (cargando) {
      return "Cargando los integrantes activos del club.";
    }
    if (avisoDeIntegrantes) {
      return avisoDeIntegrantes;
    }
    return integrantes.length === 0
      ? "El club no tiene integrantes activos."
      : "Solo aparecen los integrantes activos del club.";
  }

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (pendiente) {
      return;
    }

    const encontrados = validarRetiro(valores);
    if (sinClub) {
      encontrados.clubId = "Elige el club del que sale el estudiante.";
    }
    if (hayErrores(encontrados)) {
      setErrores(encontrados);
      avisar("error", MENSAJE_REVISAR_CAMPOS);
      enfocarPrimerInvalido(formulario.current);
      return;
    }

    limpiarAviso();
    enviar(
      () => crearRetiro(valores),
      (resultado) => {
        if (resultado.ok) {
          if (resultado.destino) {
            reiniciarAlSalir();
            navegar(resultado.destino);
            return;
          }
          avisar("exito", resultado.mensaje, resultado.avisos);
          return;
        }
        const { deCampos, ajenos } = repartirErrores(resultado.errores, CAMPOS_DE_RETIRO);
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
      aria-label="Datos de la nueva solicitud de retiro"
    >
      <fieldset className="min-w-0">
        <legend className={LEYENDA}>Integrante que se retira</legend>
        <div className="mt-4 grid gap-x-5 gap-y-3 sm:grid-cols-2">
          <CampoSeleccion
            etiqueta="Club"
            name="clubId"
            required
            opciones={clubes}
            textoSinEleccion="Elige un club"
            value={valores.clubId}
            error={errores.clubId}
            onChange={(evento) => alElegirClub(evento.target.value)}
          />
          <CampoSeleccion
            etiqueta="Estudiante"
            name="inscripcionId"
            required
            disabled={sinClub || cargando}
            aria-busy={cargando || undefined}
            opciones={integrantes}
            textoSinEleccion={cargando ? "Cargando integrantes" : "Elige un integrante"}
            value={valores.inscripcionId}
            error={errores.inscripcionId}
            ayuda={ayudaDeIntegrante()}
            onChange={(evento) => cambiar("inscripcionId", evento.target.value)}
          />
        </div>
      </fieldset>

      <fieldset className="mt-8 min-w-0">
        <legend className={LEYENDA}>Motivo</legend>
        <div className="mt-4">
          <CampoTextoLargo
            etiqueta="Motivo del retiro"
            name="motivo"
            rows={4}
            required
            minLength={MOTIVO_MINIMO_DE_RETIRO}
            maxLength={MOTIVO_MAXIMO_DE_RETIRO}
            value={valores.motivo}
            error={errores.motivo}
            ayuda={`${longitud} de ${MOTIVO_MAXIMO_DE_RETIRO} caracteres, mínimo ${MOTIVO_MINIMO_DE_RETIRO}. Por ejemplo: cambio de horario escolar o traslado de institución.`}
            onChange={(evento) => cambiar("motivo", evento.target.value)}
          />
        </div>
      </fieldset>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Boton type="submit" cargando={pendiente} textoCargando="Registrando">
          <Send aria-hidden="true" size={16} />
          Registrar retiro
        </Boton>
        <EnlaceBoton href={RUTA_RETIROS} variante="secundario">
          Cancelar
        </EnlaceBoton>
      </div>
      <ZonaDeAviso aviso={aviso} className="mt-4" />
    </form>
  );
}
