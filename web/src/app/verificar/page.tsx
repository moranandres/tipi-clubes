import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, CircleAlert, CircleX } from "lucide-react";
import { Suspense, type ReactNode } from "react";
import { BotonRecargar } from "@/components/portal/formularios/BotonRecargar";
import { ListaDeDatos } from "@/components/portal/ListaDeDatos";
import { Marca } from "@/components/ui/Marca";
import { SelectorTema } from "@/components/ui/SelectorTema";
import { ComprobarArchivo } from "@/components/verificacion/ComprobarArchivo";
import { FormularioDeVerificacion } from "@/components/verificacion/FormularioDeVerificacion";
import {
  codigoDeConsulta,
  verificarCertificado,
  type VerificacionPublica,
} from "@/lib/api/verificacion";
import {
  NOMBRES_DE_TIPO_DE_CERTIFICADO,
  type TipoCertificado,
} from "@/lib/portal/filtros-certificados";
import { fechaCorta } from "@/lib/portal/tiempo";

export const metadata: Metadata = {
  title: "Verificar certificado",
  description:
    "Comprueba si un certificado emitido por TIPI 3.0 es válido con su código de verificación.",
};

type Props = PageProps<"/verificar">;

const RUTA_VERIFICAR = "/verificar";

function nombreDeTipo(tipo?: TipoCertificado): string | null {
  return tipo ? NOMBRES_DE_TIPO_DE_CERTIFICADO[tipo] : null;
}

function CertificadoValido({ datos }: { datos: VerificacionPublica }) {
  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="titulo-resultado" className="rounded-pieza bg-superficie p-6 sm:p-8">
        <p className="flex items-center gap-2.5 font-medium text-exito">
          <BadgeCheck aria-hidden="true" size={22} />
          <span id="titulo-resultado">Certificado válido</span>
        </p>
        <h2 className="mt-4 break-words text-2xl font-medium tracking-tight">{datos.titulo}</h2>
        <div className="mt-6">
          <ListaDeDatos
            datos={[
              { termino: "Tipo", valor: nombreDeTipo(datos.tipo) },
              { termino: "Institución", valor: datos.institucionNombre },
              { termino: "Emitido el", valor: fechaCorta(datos.fechaEmision) },
              {
                termino: "Código",
                valor: <span className="cifras tracking-wide">{datos.codigoVerificacion}</span>,
              },
              datos.archivoHash
                ? {
                    termino: "Huella SHA-256 del PDF",
                    valor: <span className="cifras break-all text-sm">{datos.archivoHash}</span>,
                    ancho: true,
                  }
                : null,
            ]}
          />
        </div>
      </section>
      {datos.archivoHash ? <ComprobarArchivo huella={datos.archivoHash} /> : null}
    </div>
  );
}

function CertificadoAnulado({ datos }: { datos: VerificacionPublica }) {
  return (
    <section aria-labelledby="titulo-resultado" className="rounded-pieza bg-superficie p-6 sm:p-8">
      <p className="flex items-center gap-2.5 font-medium text-error">
        <CircleX aria-hidden="true" size={22} />
        <span id="titulo-resultado">Certificado anulado</span>
      </p>
      <h2 className="mt-4 break-words text-2xl font-medium tracking-tight">{datos.titulo}</h2>
      <p className="mt-3 max-w-[60ch] text-tenue">{datos.mensaje}</p>
      <div className="mt-6">
        <ListaDeDatos
          datos={[
            { termino: "Tipo", valor: nombreDeTipo(datos.tipo) },
            { termino: "Institución", valor: datos.institucionNombre },
            { termino: "Emitido el", valor: fechaCorta(datos.fechaEmision) },
            { termino: "Anulado el", valor: fechaCorta(datos.fechaAnulacion) },
            {
              termino: "Código",
              valor: <span className="cifras tracking-wide">{datos.codigoVerificacion}</span>,
            },
          ]}
        />
      </div>
    </section>
  );
}

function Aviso({
  icono,
  titulo,
  children,
  accion,
}: {
  icono: ReactNode;
  titulo: string;
  children: ReactNode;
  accion?: ReactNode;
}) {
  return (
    <section role="alert" className="rounded-pieza bg-superficie p-6 sm:p-8">
      <p className="flex items-center gap-2.5 font-medium">
        {icono}
        {titulo}
      </p>
      <p className="mt-3 max-w-[60ch] text-tenue">{children}</p>
      {accion ? <div className="mt-5">{accion}</div> : null}
    </section>
  );
}

async function Resultado({ codigo }: { codigo: string }) {
  const resultado = await verificarCertificado(codigo);

  if (resultado.estado === "sin-servicio") {
    return (
      <Aviso
        icono={<CircleAlert aria-hidden="true" size={22} className="text-aviso" />}
        titulo="No pudimos consultar el certificado"
        accion={<BotonRecargar />}
      >
        El servidor de TIPI 3.0 no responde en este momento. Vuelve a intentarlo en unos minutos.
      </Aviso>
    );
  }

  if (resultado.estado === "rechazado") {
    return (
      <Aviso
        icono={<CircleX aria-hidden="true" size={22} className="text-error" />}
        titulo="No encontramos ese certificado"
      >
        {resultado.mensaje} Revisa que lo hayas copiado completo; las letras O, I y L se leen
        como 0, 1 y 1.
      </Aviso>
    );
  }

  return resultado.datos.valido ? (
    <CertificadoValido datos={resultado.datos} />
  ) : (
    <CertificadoAnulado datos={resultado.datos} />
  );
}

function EsqueletoResultado() {
  return (
    <div aria-busy="true">
      <p className="sr-only" role="status">
        Consultando el certificado.
      </p>
      <div aria-hidden="true" className="h-72 rounded-pieza bg-superficie motion-safe:animate-pulse" />
    </div>
  );
}

function Indicaciones() {
  return (
    <section className="rounded-pieza border border-dashed border-linea p-6 sm:p-8">
      <h2 className="font-medium">Cómo funciona</h2>
      <ol className="mt-4 flex list-decimal flex-col gap-2.5 pl-5 text-[0.9375rem] text-tenue marker:text-tinta">
        <li>Escribe el código que aparece al pie del certificado o escanea su código QR.</li>
        <li>Te diremos si el certificado está vigente o si fue anulado, y quién lo emitió.</li>
        <li>Si es válido, puedes comprobar que tu PDF no fue modificado comparando su huella.</li>
      </ol>
    </section>
  );
}

async function Contenido({ searchParams }: Pick<Props, "searchParams">) {
  const codigo = codigoDeConsulta((await searchParams).codigo);

  return (
    <div className="grid gap-12 lg:grid-cols-12 lg:gap-6">
      <div className="lg:col-span-5">
        <h1 className="text-seccion">Verificar certificado</h1>
        <p className="mt-5 max-w-[44ch] text-tenue">
          Comprueba si un certificado de un club TIPI 3.0 es auténtico y sigue vigente. No
          necesitas una cuenta.
        </p>
        <FormularioDeVerificacion key={codigo} ruta={RUTA_VERIFICAR} codigo={codigo} />
      </div>
      <div className="lg:col-span-6 lg:col-start-7">
        {codigo ? (
          <Suspense key={codigo} fallback={<EsqueletoResultado />}>
            <Resultado codigo={codigo} />
          </Suspense>
        ) : (
          <Indicaciones />
        )}
      </div>
    </div>
  );
}

function EsqueletoContenido() {
  return (
    <div aria-hidden="true" className="grid gap-12 motion-safe:animate-pulse lg:grid-cols-12 lg:gap-6">
      <div className="lg:col-span-5">
        <div className="h-12 w-80 max-w-full rounded-[8px] bg-superficie" />
        <div className="mt-5 h-12 max-w-[44ch] rounded-[8px] bg-superficie" />
        <div className="mt-8 h-12 rounded-control bg-superficie" />
      </div>
      <div className="h-72 rounded-pieza bg-superficie lg:col-span-6 lg:col-start-7" />
    </div>
  );
}

export default function PaginaVerificar({ searchParams }: Props) {
  return (
    <>
      <header className="border-b border-linea">
        <div className="contenedor flex h-16 items-center justify-between gap-6">
          <Marca />
          <SelectorTema />
        </div>
      </header>
      <main id="contenido" className="flex-1 py-16 lg:py-24">
        <div className="contenedor">
          <Suspense fallback={<EsqueletoContenido />}>
            <Contenido searchParams={searchParams} />
          </Suspense>
          <Link
            href="/"
            className="group mt-12 inline-flex items-center gap-2 text-[0.9375rem] font-medium text-acento"
          >
            <ArrowLeft
              aria-hidden="true"
              size={16}
              className="transition-transform duration-150 ease-salida group-hover:-translate-x-0.5 motion-reduce:transform-none"
            />
            Volver al inicio
          </Link>
        </div>
      </main>
    </>
  );
}
