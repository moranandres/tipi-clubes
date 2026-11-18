"use client";

import { Plus, Save } from "lucide-react";
import { useRef, type FormEvent } from "react";
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
import { actualizarCompetencia, crearCompetencia } from "@/lib/acciones/competencias";
import { MENSAJE_REVISAR_CAMPOS } from "@/lib/acciones/resultado";
import {
  CAMPOS_DE_COMPETENCIA,
  LIMITES_DE_CATALOGO,
  validarCompetencia,
  type DatosDeCompetencia,
} from "@/lib/portal/reglas-competencias";
import { hayErrores } from "@/lib/portal/validacion";

type Props = {
  competenciaId: number | null;
  iniciales: DatosDeCompetencia;
};

export function FormularioCompetencia({ competenciaId, iniciales }: Props) {
  const esNueva = competenciaId === null;
  const formulario = useRef<HTMLFormElement>(null);
  const { valores, errores, cambiar, setValores, setErrores } = useCampos(iniciales);
  const { pendiente, aviso, enviar, navegar, avisar, limpiarAviso } = useEnvio();
  const reiniciarAlSalir = useReinicioTrasCrear(() => {
    setValores(iniciales);
    setErrores({});
  });

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (pendiente) {
      return;
    }

    const encontrados = validarCompetencia(valores);
    if (hayErrores(encontrados)) {
      setErrores(encontrados);
      avisar("error", MENSAJE_REVISAR_CAMPOS);
      enfocarPrimerInvalido(formulario.current);
      return;
    }

    limpiarAviso();
    enviar(
      () => (esNueva ? crearCompetencia(valores) : actualizarCompetencia(competenciaId, valores)),
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
        const { deCampos, ajenos } = repartirErrores(resultado.errores, CAMPOS_DE_COMPETENCIA);
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
      aria-label={esNueva ? "Datos de la nueva competencia" : "Datos de la competencia"}
    >
      <div className="flex flex-col gap-3">
        <Campo
          etiqueta="Nombre"
          name="nombre"
          type="text"
          autoComplete="off"
          required
          maxLength={LIMITES_DE_CATALOGO.nombreDeCompetencia}
          placeholder="World Robot Olympiad"
          value={valores.nombre}
          error={errores.nombre}
          ayuda="No puede repetirse con otra competencia del catálogo."
          onChange={(evento) => cambiar("nombre", evento.target.value)}
        />
        <Campo
          etiqueta="Organizador (opcional)"
          name="organizador"
          type="text"
          autoComplete="off"
          maxLength={LIMITES_DE_CATALOGO.organizador}
          value={valores.organizador}
          error={errores.organizador}
          onChange={(evento) => cambiar("organizador", evento.target.value)}
        />
        <Campo
          etiqueta="Sitio web (opcional)"
          name="sitioWeb"
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          maxLength={LIMITES_DE_CATALOGO.sitioWeb}
          placeholder="https://"
          value={valores.sitioWeb}
          error={errores.sitioWeb}
          ayuda="Debe empezar con http:// o https://."
          onChange={(evento) => cambiar("sitioWeb", evento.target.value)}
        />
      </div>
      <div className="mt-2">
        <Boton type="submit" cargando={pendiente} textoCargando="Guardando" className={esNueva ? "w-full" : ""}>
          {esNueva ? <Plus aria-hidden="true" size={16} /> : <Save aria-hidden="true" size={16} />}
          {esNueva ? "Agregar competencia" : "Guardar cambios"}
        </Boton>
      </div>
      <ZonaDeAviso aviso={aviso} className="mt-3" />
    </form>
  );
}
