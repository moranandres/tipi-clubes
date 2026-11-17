"use client";

import { UserCheck } from "lucide-react";
import { useId, useRef, useState, type FormEvent } from "react";
import { enfocarPrimerInvalido, useEnvio } from "@/components/portal/formularios/ganchos";
import { ZonaDeAviso } from "@/components/portal/formularios/ZonaDeAviso";
import { Boton } from "@/components/ui/Boton";
import { CampoSeleccion } from "@/components/ui/CampoSeleccion";
import { asignarResponsableDeInstitucion } from "@/lib/acciones/instituciones";
import type { OpcionDeFormulario } from "@/lib/portal/opciones";

type Props = {
  institucionId: number;
  responsableId: string;
  responsableNombre: string | null;
  cuentas: OpcionDeFormulario[];
};

export function ResponsableDeInstitucion({
  institucionId,
  responsableId,
  responsableNombre,
  cuentas,
}: Props) {
  const idTitulo = useId();
  const formulario = useRef<HTMLFormElement>(null);
  const [elegido, setElegido] = useState(responsableId);
  const [error, setError] = useState<string | undefined>();
  const { pendiente, aviso, enviar, avisar, limpiarAviso } = useEnvio();

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (pendiente) {
      return;
    }
    if (!elegido) {
      setError("Elige la cuenta del responsable.");
      enfocarPrimerInvalido(formulario.current);
      return;
    }
    if (elegido === responsableId) {
      setError("Esa cuenta ya es la responsable. Elige otra para cambiarla.");
      enfocarPrimerInvalido(formulario.current);
      return;
    }

    limpiarAviso();
    enviar(
      () => asignarResponsableDeInstitucion(institucionId, elegido),
      (resultado) => {
        if (resultado.ok) {
          avisar("exito", resultado.mensaje);
          return;
        }
        if (resultado.errores.usuarioId) {
          setError(resultado.errores.usuarioId);
          enfocarPrimerInvalido(formulario.current);
          avisar("error", resultado.mensaje);
          return;
        }
        avisar("error", resultado.mensaje);
      },
    );
  }

  return (
    <section aria-labelledby={idTitulo} className="rounded-pieza border border-linea p-5">
      <h2 id={idTitulo} className="text-lg font-medium">
        Responsable institucional
      </h2>
      <p className="mt-3 text-sm text-tenue">Responsable actual</p>
      <p className="mt-1 break-words font-medium">{responsableNombre ?? "Sin asignar"}</p>

      {cuentas.length === 0 ? (
        <p className="mt-4 text-[0.9375rem] text-tenue">
          Esta institución no tiene cuentas activas con el rol Responsable institucional. Crea
          primero la cuenta en la sección Usuarios.
        </p>
      ) : (
        <form ref={formulario} onSubmit={alEnviar} noValidate className="mt-5">
          <CampoSeleccion
            etiqueta={responsableNombre ? "Cambiar por" : "Asignar a"}
            name="usuarioId"
            required
            opciones={cuentas}
            textoSinEleccion="Elige una cuenta"
            value={elegido}
            error={error}
            ayuda="Solo aparecen cuentas activas de esta institución."
            onChange={(evento) => {
              setElegido(evento.target.value);
              setError(undefined);
            }}
          />
          <Boton type="submit" cargando={pendiente} textoCargando="Asignando" className="mt-1 w-full">
            <UserCheck aria-hidden="true" size={16} />
            Asignar responsable
          </Boton>
        </form>
      )}
      <ZonaDeAviso aviso={aviso} className="mt-3" />
    </section>
  );
}
