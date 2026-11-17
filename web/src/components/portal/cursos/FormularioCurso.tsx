"use client";

import { Save } from "lucide-react";
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
import { CampoTextoLargo } from "@/components/ui/CampoTextoLargo";
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import { actualizarCurso, crearCurso } from "@/lib/acciones/cursos";
import { MENSAJE_REVISAR_CAMPOS } from "@/lib/acciones/resultado";
import {
  MODALIDADES_DE_CURSO,
  NIVELES_DE_CURSO,
  NOMBRES_DE_MODALIDAD,
  NOMBRES_DE_NIVEL,
  RUTA_CURSOS,
} from "@/lib/portal/filtros-cursos";
import {
  CAMPOS_DE_CURSO,
  LIMITES_DE_CURSO,
  usaEnlace,
  usaLugar,
  validarCurso,
  type CampoDeCurso,
  type ClubParaCurso,
  type DatosDeCurso,
} from "@/lib/portal/reglas-cursos";
import { fechaCorta } from "@/lib/portal/tiempo";
import { hayErrores } from "@/lib/portal/validacion";

type Props = {
  cursoId: number | null;
  iniciales: DatosDeCurso;
  clubes: ClubParaCurso[] | null;
  clubFijo: ClubParaCurso | null;
  inscritosActivos: number;
  bloqueado: boolean;
};

const CAMPOS_AL_EDITAR: readonly CampoDeCurso[] = CAMPOS_DE_CURSO.filter(
  (campo) => campo !== "clubId",
);

const OPCIONES_DE_NIVEL = NIVELES_DE_CURSO.map((nivel) => ({
  valor: nivel,
  texto: NOMBRES_DE_NIVEL[nivel],
}));

const OPCIONES_DE_MODALIDAD = MODALIDADES_DE_CURSO.map((modalidad) => ({
  valor: modalidad,
  texto: NOMBRES_DE_MODALIDAD[modalidad],
}));

const CAMPOS_VINCULADOS: readonly (readonly CampoDeCurso[])[] = [["fechaInicio", "fechaFin"]];

const LEYENDA = "text-lg font-medium";
const REJILLA = "mt-4 grid gap-x-5 gap-y-3 sm:grid-cols-2";

function ayudaDeLugar(modalidad: string): string {
  if (!modalidad) {
    return "Elige primero la modalidad.";
  }
  return usaLugar(modalidad)
    ? "Aula o laboratorio donde se dicta el curso."
    : "No se usa en la modalidad en línea.";
}

function ayudaDeEnlace(modalidad: string): string {
  if (!modalidad) {
    return "Elige primero la modalidad.";
  }
  return usaEnlace(modalidad)
    ? "Dirección https de la sala virtual."
    : "No se usa en la modalidad presencial.";
}

export function FormularioCurso({
  cursoId,
  iniciales,
  clubes,
  clubFijo,
  inscritosActivos,
  bloqueado,
}: Props) {
  const esNuevo = cursoId === null;
  const formulario = useRef<HTMLFormElement>(null);
  const { valores, errores, cambiar, setValores, setErrores } = useCampos(iniciales, CAMPOS_VINCULADOS);
  const { pendiente, aviso, enviar, navegar, avisar, limpiarAviso } = useEnvio();
  const reiniciarAlSalir = useReinicioTrasCrear(() => {
    setValores(iniciales);
    setErrores({});
  });

  const club = clubes
    ? (clubes.find((candidato) => candidato.valor === valores.clubId) ?? null)
    : clubFijo;
  const periodo = club?.periodo ?? null;
  const cupoDelClub = club?.cupoMaximo ?? null;
  const conLugar = usaLugar(valores.modalidad);
  const conEnlace = usaEnlace(valores.modalidad);

  function ayudaDeCupo(): string {
    const partes: string[] = [];
    if (cupoDelClub !== null) {
      partes.push(`Hasta ${cupoDelClub}, el cupo del club.`);
    }
    if (!esNuevo) {
      partes.push(
        `Ahora hay ${inscritosActivos} ${inscritosActivos === 1 ? "inscrito" : "inscritos"}.`,
      );
    }
    return partes.join(" ") || "Número de participantes que admite el curso.";
  }

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (pendiente || bloqueado) {
      return;
    }

    const encontrados = validarCurso(valores, {
      esNuevo,
      inscritosActivos,
      cupoDelClub,
      periodo,
    });
    if (hayErrores(encontrados)) {
      setErrores(encontrados);
      avisar("error", MENSAJE_REVISAR_CAMPOS);
      enfocarPrimerInvalido(formulario.current);
      return;
    }

    limpiarAviso();
    enviar(
      () => (esNuevo ? crearCurso(valores) : actualizarCurso(cursoId, valores)),
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
          esNuevo ? CAMPOS_DE_CURSO : CAMPOS_AL_EDITAR,
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
      aria-label={esNuevo ? "Datos del nuevo curso" : "Datos del curso"}
    >
      <fieldset disabled={bloqueado} className="min-w-0">
        <legend className={LEYENDA}>Datos del curso</legend>
        <div className={REJILLA}>
          <div className="sm:col-span-2">
            {clubes ? (
              <CampoSeleccion
                etiqueta="Club"
                name="clubId"
                required
                opciones={clubes}
                textoSinEleccion="Elige un club"
                value={valores.clubId}
                error={errores.clubId}
                ayuda="No se puede cambiar después de crear el curso."
                onChange={(evento) => cambiar("clubId", evento.target.value)}
              />
            ) : (
              <DatoFijo
                etiqueta="Club"
                valor={clubFijo?.texto ?? "Sin club"}
                ayuda="No se puede cambiar."
              />
            )}
          </div>
          <div className="sm:col-span-2">
            <Campo
              etiqueta="Nombre"
              name="nombre"
              type="text"
              autoComplete="off"
              required
              maxLength={LIMITES_DE_CURSO.nombre}
              value={valores.nombre}
              error={errores.nombre}
              onChange={(evento) => cambiar("nombre", evento.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <CampoTextoLargo
              etiqueta="Descripción (opcional)"
              name="descripcion"
              maxLength={LIMITES_DE_CURSO.descripcion}
              value={valores.descripcion}
              error={errores.descripcion}
              ayuda="Temas o proyectos que se trabajarán en el curso."
              onChange={(evento) => cambiar("descripcion", evento.target.value)}
            />
          </div>
          <CampoSeleccion
            etiqueta="Nivel"
            name="nivel"
            required
            opciones={OPCIONES_DE_NIVEL}
            textoSinEleccion="Elige un nivel"
            value={valores.nivel}
            error={errores.nivel}
            onChange={(evento) => cambiar("nivel", evento.target.value)}
          />
          <CampoSeleccion
            etiqueta="Modalidad"
            name="modalidad"
            required
            opciones={OPCIONES_DE_MODALIDAD}
            textoSinEleccion="Elige una modalidad"
            value={valores.modalidad}
            error={errores.modalidad}
            onChange={(evento) => cambiar("modalidad", evento.target.value)}
          />
          <Campo
            etiqueta="Lugar"
            name="lugar"
            type="text"
            autoComplete="off"
            required={conLugar}
            disabled={!conLugar}
            maxLength={LIMITES_DE_CURSO.lugar}
            value={valores.lugar}
            error={conLugar ? errores.lugar : undefined}
            ayuda={ayudaDeLugar(valores.modalidad)}
            onChange={(evento) => cambiar("lugar", evento.target.value)}
          />
          <Campo
            etiqueta="Enlace de la sala virtual"
            name="enlaceVirtual"
            type="url"
            inputMode="url"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            required={conEnlace}
            disabled={!conEnlace}
            maxLength={LIMITES_DE_CURSO.enlaceVirtual}
            placeholder="https://"
            value={valores.enlaceVirtual}
            error={conEnlace ? errores.enlaceVirtual : undefined}
            ayuda={ayudaDeEnlace(valores.modalidad)}
            onChange={(evento) => cambiar("enlaceVirtual", evento.target.value)}
          />
        </div>
      </fieldset>

      <fieldset disabled={bloqueado} className="mt-8 min-w-0">
        <legend className={LEYENDA}>Fechas y cupo</legend>
        <p className="mt-1.5 text-[0.9375rem] text-tenue">
          {periodo
            ? `Las fechas deben estar dentro del período ${periodo.nombre}: del ${fechaCorta(periodo.fechaInicio)} al ${fechaCorta(periodo.fechaFin)}.`
            : "Las fechas deben estar dentro del período académico del club."}
        </p>
        <div className={REJILLA}>
          <Campo
            etiqueta="Fecha de inicio"
            name="fechaInicio"
            type="date"
            required
            className="cifras"
            min={periodo?.fechaInicio}
            max={periodo?.fechaFin}
            value={valores.fechaInicio}
            error={errores.fechaInicio}
            onChange={(evento) => cambiar("fechaInicio", evento.target.value)}
          />
          <Campo
            etiqueta="Fecha de fin"
            name="fechaFin"
            type="date"
            required
            className="cifras"
            min={valores.fechaInicio || periodo?.fechaInicio}
            max={periodo?.fechaFin}
            value={valores.fechaFin}
            error={errores.fechaFin}
            onChange={(evento) => cambiar("fechaFin", evento.target.value)}
          />
          <Campo
            etiqueta="Duración en horas (opcional)"
            name="duracionHoras"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={3}
            className="cifras"
            value={valores.duracionHoras}
            error={errores.duracionHoras}
            ayuda="Total de horas del curso, de 1 a 500."
            onChange={(evento) => cambiar("duracionHoras", evento.target.value)}
          />
          <Campo
            etiqueta="Cupo máximo"
            name="cupoMaximo"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            required
            maxLength={3}
            className="cifras"
            value={valores.cupoMaximo}
            error={errores.cupoMaximo}
            ayuda={ayudaDeCupo()}
            onChange={(evento) => cambiar("cupoMaximo", evento.target.value)}
          />
        </div>
      </fieldset>

      {bloqueado ? null : (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Boton type="submit" cargando={pendiente} textoCargando="Guardando">
            <Save aria-hidden="true" size={16} />
            {esNuevo ? "Crear curso" : "Guardar cambios"}
          </Boton>
          <EnlaceBoton href={RUTA_CURSOS} variante="secundario">
            {esNuevo ? "Cancelar" : "Volver a la lista"}
          </EnlaceBoton>
        </div>
      )}
      <ZonaDeAviso aviso={aviso} className="mt-4" />
    </form>
  );
}
