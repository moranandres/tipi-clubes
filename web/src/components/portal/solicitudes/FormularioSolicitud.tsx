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
import { consultarOpcionesDeClub, crearSolicitud } from "@/lib/acciones/solicitudes";
import { NIVELES_DE_CURSO, NOMBRES_DE_NIVEL } from "@/lib/portal/filtros-cursos";
import { RUTA_SOLICITUDES } from "@/lib/portal/filtros-solicitudes";
import type { OpcionDeCurso, OpcionDeFormulario } from "@/lib/portal/opciones";
import {
  CAMPOS_DE_SOLICITUD,
  LIMITES_DE_SOLICITUD,
  pideConocimientos,
  pideExperiencia,
  validarSolicitud,
  type CampoDeSolicitud,
  type DatosDeSolicitud,
} from "@/lib/portal/reglas-solicitudes";
import { hayErrores } from "@/lib/portal/validacion";

export type OpcionesIniciales = {
  estudiantes: OpcionDeFormulario[];
  cursos: OpcionDeCurso[];
};

type Props = {
  clubes: OpcionDeFormulario[];
  iniciales: DatosDeSolicitud;
  opcionesIniciales: OpcionesIniciales | null;
};

const OPCIONES_DE_NIVEL = NIVELES_DE_CURSO.map((nivel) => ({
  valor: nivel,
  texto: NOMBRES_DE_NIVEL[nivel],
}));

const CAMPOS_VINCULADOS: readonly (readonly CampoDeSolicitud[])[] = [
  ["nivel", "conocimientos", "experienciaPrevia", "cursoId"],
];

const LEYENDA = "text-lg font-medium";
const REJILLA = "mt-4 grid gap-x-5 gap-y-3 sm:grid-cols-2";
const SIN_OPCIONES: OpcionesIniciales = { estudiantes: [], cursos: [] };

export function FormularioSolicitud({ clubes, iniciales, opcionesIniciales }: Props) {
  const formulario = useRef<HTMLFormElement>(null);
  const consulta = useRef(0);
  const { valores, errores, cambiar, setValores, setErrores } = useCampos(iniciales, CAMPOS_VINCULADOS);
  const { pendiente, aviso, enviar, navegar, avisar, limpiarAviso } = useEnvio();
  const [opciones, setOpciones] = useState<OpcionesIniciales>(opcionesIniciales ?? SIN_OPCIONES);
  const [avisoDeOpciones, setAvisoDeOpciones] = useState<string | undefined>();
  const [cargando, iniciarCarga] = useTransition();
  const reiniciarAlSalir = useReinicioTrasCrear(() => {
    setValores(iniciales);
    setErrores({});
    setOpciones(opcionesIniciales ?? SIN_OPCIONES);
    setAvisoDeOpciones(undefined);
  });

  const cursosDelNivel = valores.nivel
    ? opciones.cursos.filter((curso) => curso.nivel === valores.nivel)
    : opciones.cursos;
  const conConocimientos = pideConocimientos(valores.nivel);
  const conExperiencia = pideExperiencia(valores.nivel);
  const sinClub = !valores.clubId;

  function alElegirClub(clubId: string) {
    cambiar("clubId", clubId);
    cambiar("estudianteId", "");
    cambiar("cursoId", "");
    setOpciones(SIN_OPCIONES);
    setAvisoDeOpciones(undefined);
    consulta.current += 1;
    const turno = consulta.current;

    if (!clubId) {
      return;
    }

    iniciarCarga(async () => {
      const resultado = await consultarOpcionesDeClub(clubId).catch(() => null);
      if (turno !== consulta.current) {
        return;
      }
      if (resultado?.ok) {
        setOpciones({ estudiantes: resultado.estudiantes, cursos: resultado.cursos });
        return;
      }
      setAvisoDeOpciones(
        resultado?.mensaje ?? "No pudimos cargar los datos del club. Vuelve a elegirlo.",
      );
    });
  }

  function alElegirNivel(nivel: string) {
    cambiar("nivel", nivel);
    const curso = opciones.cursos.find((candidato) => candidato.valor === valores.cursoId);
    if (curso && curso.nivel !== nivel) {
      cambiar("cursoId", "");
    }
  }

  function ayudaDeEstudiante(): string {
    if (sinClub) {
      return "Elige primero el club.";
    }
    if (cargando) {
      return "Cargando los estudiantes activos de la institución.";
    }
    if (avisoDeOpciones) {
      return avisoDeOpciones;
    }
    return opciones.estudiantes.length === 0
      ? "La institución del club no tiene estudiantes activos. Regístralos en Estudiantes."
      : "Solo aparecen estudiantes activos de la institución del club.";
  }

  function ayudaDeCurso(): string {
    if (sinClub || cargando) {
      return "Opcional. Elige primero el club.";
    }
    if (opciones.cursos.length === 0) {
      return "El club no tiene cursos abiertos; la solicitud será solo para el club.";
    }
    if (valores.nivel && cursosDelNivel.length === 0) {
      return "No hay cursos abiertos de este nivel; la solicitud será solo para el club.";
    }
    return "Opcional. Si lo dejas vacío, la solicitud es solo para entrar al club.";
  }

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (pendiente) {
      return;
    }

    const encontrados = validarSolicitud(valores);
    if (hayErrores(encontrados)) {
      setErrores(encontrados);
      avisar("error", MENSAJE_REVISAR_CAMPOS);
      enfocarPrimerInvalido(formulario.current);
      return;
    }

    limpiarAviso();
    enviar(
      () => crearSolicitud(valores),
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
        const { deCampos, ajenos } = repartirErrores(resultado.errores, CAMPOS_DE_SOLICITUD);
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
      aria-label="Datos de la nueva solicitud de inscripción"
    >
      <fieldset className="min-w-0">
        <legend className={LEYENDA}>Estudiante y club</legend>
        <div className={REJILLA}>
          <CampoSeleccion
            etiqueta="Club"
            name="clubId"
            required
            opciones={clubes}
            textoSinEleccion="Elige un club"
            value={valores.clubId}
            error={errores.clubId}
            ayuda="Solo aparecen los clubes abiertos de tu alcance."
            onChange={(evento) => alElegirClub(evento.target.value)}
          />
          <CampoSeleccion
            etiqueta="Estudiante"
            name="estudianteId"
            required
            disabled={sinClub || cargando}
            aria-busy={cargando || undefined}
            opciones={opciones.estudiantes}
            textoSinEleccion={cargando ? "Cargando estudiantes" : "Elige un estudiante"}
            value={valores.estudianteId}
            error={errores.estudianteId}
            ayuda={ayudaDeEstudiante()}
            onChange={(evento) => cambiar("estudianteId", evento.target.value)}
          />
          <CampoSeleccion
            etiqueta="Nivel de conocimiento"
            name="nivel"
            required
            opciones={OPCIONES_DE_NIVEL}
            textoSinEleccion="Elige un nivel"
            value={valores.nivel}
            error={errores.nivel}
            ayuda="Nivel que declara el estudiante. Quien resuelve asigna el definitivo."
            onChange={(evento) => alElegirNivel(evento.target.value)}
          />
          <CampoSeleccion
            etiqueta="Curso (opcional)"
            name="cursoId"
            disabled={sinClub || cargando || cursosDelNivel.length === 0}
            opciones={cursosDelNivel}
            textoSinEleccion="Solo el club"
            value={valores.cursoId}
            error={errores.cursoId}
            ayuda={ayudaDeCurso()}
            onChange={(evento) => cambiar("cursoId", evento.target.value)}
          />
        </div>
      </fieldset>

      <fieldset className="mt-8 min-w-0">
        <legend className={LEYENDA}>Perfil del estudiante</legend>
        <div className="mt-4 flex flex-col gap-y-3">
          <CampoTextoLargo
            etiqueta={conConocimientos ? "Conocimientos previos" : "Conocimientos previos (opcional)"}
            name="conocimientos"
            rows={3}
            required={conConocimientos}
            maxLength={LIMITES_DE_SOLICITUD.texto}
            value={valores.conocimientos}
            error={errores.conocimientos}
            ayuda={
              conConocimientos
                ? "Obligatorio desde el nivel intermedio: herramientas o temas que ya domina."
                : "Herramientas o temas que ya conoce, si los hay."
            }
            onChange={(evento) => cambiar("conocimientos", evento.target.value)}
          />
          <CampoTextoLargo
            etiqueta={conExperiencia ? "Experiencia previa" : "Experiencia previa (opcional)"}
            name="experienciaPrevia"
            rows={3}
            required={conExperiencia}
            maxLength={LIMITES_DE_SOLICITUD.texto}
            value={valores.experienciaPrevia}
            error={errores.experienciaPrevia}
            ayuda={
              conExperiencia
                ? "Obligatoria en el nivel avanzado: proyectos, concursos o cursos anteriores."
                : "Proyectos, concursos o cursos anteriores, si los tiene."
            }
            onChange={(evento) => cambiar("experienciaPrevia", evento.target.value)}
          />
          <CampoTextoLargo
            etiqueta="Motivación"
            name="motivacion"
            rows={4}
            required
            maxLength={LIMITES_DE_SOLICITUD.texto}
            value={valores.motivacion}
            error={errores.motivacion}
            ayuda={`Por qué quiere entrar al club, con al menos ${LIMITES_DE_SOLICITUD.motivacionMinima} caracteres.`}
            onChange={(evento) => cambiar("motivacion", evento.target.value)}
          />
        </div>
      </fieldset>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Boton type="submit" cargando={pendiente} textoCargando="Registrando">
          <Send aria-hidden="true" size={16} />
          Registrar solicitud
        </Boton>
        <EnlaceBoton href={RUTA_SOLICITUDES} variante="secundario">
          Cancelar
        </EnlaceBoton>
      </div>
      <ZonaDeAviso aviso={aviso} className="mt-4" />
    </form>
  );
}
