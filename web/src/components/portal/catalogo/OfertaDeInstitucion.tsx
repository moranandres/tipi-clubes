import type { InstitucionDelCatalogo } from "@/lib/api/catalogo";

type Props = {
  institucion: InstitucionDelCatalogo;
};

const FORMATO_NUMERO = new Intl.NumberFormat("es-EC");

function Cifra({ etiqueta, valor }: { etiqueta: string; valor?: number }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-tenue">{etiqueta}</dt>
      <dd className="cifras mt-1 text-2xl font-medium leading-none tracking-tight">
        {FORMATO_NUMERO.format(valor ?? 0)}
      </dd>
    </div>
  );
}

export function OfertaDeInstitucion({ institucion }: Props) {
  return (
    <section
      aria-labelledby="oferta-de-institucion"
      className="mt-6 rounded-pieza border border-linea p-5"
    >
      <h2 id="oferta-de-institucion" className="break-words font-medium">
        Oferta de {institucion.nombre}
      </h2>
      <p className="mt-1 text-sm text-tenue">
        {[
          institucion.codigoAmie ? `AMIE ${institucion.codigoAmie}` : null,
          institucion.canton,
          institucion.periodoNombre ? `Período ${institucion.periodoNombre}` : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        <Cifra etiqueta="Clubes con inscripción abierta" valor={institucion.clubesAbiertos} />
        <Cifra etiqueta="Cupos libres" valor={institucion.cuposDisponibles} />
        <Cifra etiqueta="Cursos abiertos" valor={institucion.cursosAbiertos} />
        <Cifra etiqueta="Estudiantes activos" valor={institucion.estudiantesActivos} />
      </dl>
    </section>
  );
}
