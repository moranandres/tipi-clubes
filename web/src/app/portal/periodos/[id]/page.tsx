import type { Metadata } from "next";
import { Suspense } from "react";
import {
  AvisoDenegado,
  AvisoNoEncontrado,
  AvisoSinServicio,
  AvisoSoloLectura,
} from "@/components/portal/formularios/AvisosDeGestion";
import {
  AvisoDeResultado,
  COLUMNAS_DE_GESTION,
  CONTENEDOR_DE_GESTION,
  EncabezadoDeGestion,
  EnlaceVolver,
  EsqueletoDeGestion,
} from "@/components/portal/formularios/PiezasDeGestion";
import { FormularioPeriodo } from "@/components/portal/periodos/FormularioPeriodo";
import { VigenciaDelPeriodo } from "@/components/portal/periodos/VigenciaDelPeriodo";
import { listarPeriodos } from "@/lib/api/clubes";
import { obtenerPeriodo } from "@/lib/api/periodos";
import { puedeGestionarPeriodos } from "@/lib/portal/permisos";
import { RUTA_PERIODOS } from "@/lib/portal/reglas-periodos";
import { fechaCorta } from "@/lib/portal/tiempo";
import { idDe } from "@/lib/portal/validacion";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Gestionar período",
};

type Props = PageProps<"/portal/periodos/[id]">;

const RECURSO = { recurso: "períodos", rutaDeLista: RUTA_PERIODOS };
const NO_ENCONTRADO = "Este período no existe";
const AVISO_CREADO = "creado";

async function Contenido({ params, searchParams }: Props) {
  const [{ id: segmento }, consulta, usuario] = await Promise.all([
    params,
    searchParams,
    exigirSesion(),
  ]);
  const id = idDe(segmento);

  if (!id) {
    return <AvisoNoEncontrado titulo={NO_ENCONTRADO} {...RECURSO} />;
  }
  if (!usuario) {
    return <AvisoSinServicio />;
  }
  if (!puedeGestionarPeriodos(usuario.rol)) {
    return <AvisoSoloLectura {...RECURSO} quienes="el administrador" />;
  }

  const [resultado, periodos] = await Promise.all([obtenerPeriodo(id), listarPeriodos()]);

  if (resultado.estado === "no-encontrado") {
    return <AvisoNoEncontrado titulo={NO_ENCONTRADO} {...RECURSO} />;
  }
  if (resultado.estado === "denegado") {
    return <AvisoDenegado mensaje={resultado.mensaje} {...RECURSO} />;
  }
  if (resultado.estado === "sin-servicio") {
    return <AvisoSinServicio />;
  }

  const periodo = resultado.datos;
  const vigente = Boolean(periodo.activo);
  const actual = periodos?.find((candidato) => candidato.activo && candidato.id !== id);

  return (
    <>
      <EncabezadoDeGestion
        titulo={periodo.nombre ?? "Período"}
        detalle={`Del ${fechaCorta(periodo.fechaInicio)} al ${fechaCorta(periodo.fechaFin)}`}
      />
      {consulta.aviso === AVISO_CREADO ? (
        <AvisoDeResultado>
          El período se registró como no vigente. Márcalo como vigente en el panel de la derecha
          cuando quieras que los clubes nuevos lo usen.
        </AvisoDeResultado>
      ) : null}
      <div className={COLUMNAS_DE_GESTION}>
        <div className="min-w-0 max-w-[40rem]">
          <FormularioPeriodo
            key={id}
            periodoId={id}
            iniciales={{
              nombre: periodo.nombre ?? "",
              fechaInicio: periodo.fechaInicio ?? "",
              fechaFin: periodo.fechaFin ?? "",
            }}
          />
        </div>
        <VigenciaDelPeriodo
          key={id}
          periodoId={id}
          vigente={vigente}
          vigenteActual={actual?.nombre ?? null}
        />
      </div>
    </>
  );
}

export default function PaginaGestionDePeriodo(props: Props) {
  return (
    <div className={CONTENEDOR_DE_GESTION}>
      <EnlaceVolver href={RUTA_PERIODOS}>Volver a períodos</EnlaceVolver>
      <Suspense
        fallback={<EsqueletoDeGestion conEncabezado mensaje="Cargando los datos del período." />}
      >
        <Contenido {...props} />
      </Suspense>
    </div>
  );
}
