import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import type { Certificado } from "@/lib/api/certificados";
import { rutaDeCertificado } from "@/lib/portal/filtros-certificados";
import { identidadDe } from "@/lib/portal/identidad";
import { fechaCorta } from "@/lib/portal/tiempo";
import { CodigoDeVerificacion, EstadoDeCertificado, nombreDeTipo } from "./PiezasDeCertificado";

type Props = {
  certificados: Certificado[];
  minima: boolean;
  mostrarInstitucion: boolean;
};

const CELDA = "px-5 py-3.5 align-top";
const ENCABEZADO = "px-5 py-3 text-left text-sm font-medium text-tenue";

function Estudiante({ certificado, minima }: { certificado: Certificado; minima: boolean }) {
  const identidad = identidadDe(
    {
      nombres: certificado.estudianteNombres,
      apellidos: certificado.estudianteApellidos,
      codigo: certificado.estudianteCodigo,
    },
    minima,
  );
  return (
    <>
      <span className="block break-words">{identidad.principal}</span>
      {identidad.codigo ? (
        <span className="cifras mt-0.5 block text-sm font-normal text-tenue">{identidad.codigo}</span>
      ) : null}
    </>
  );
}

function grupoDe(certificado: Certificado, mostrarInstitucion: boolean): string {
  return [certificado.clubNombre, mostrarInstitucion ? certificado.institucionNombre : null]
    .filter(Boolean)
    .join(" · ");
}

function Enlace({ certificado }: { certificado: Certificado }) {
  return (
    <EnlaceBoton
      href={rutaDeCertificado(certificado.id ?? 0)}
      variante="elevado"
      tamano="compacto"
      className="whitespace-nowrap"
    >
      Ver certificado
      <span className="sr-only"> {certificado.codigoVerificacion}</span>
    </EnlaceBoton>
  );
}

export function TablaCertificados({ certificados, minima, mostrarInstitucion }: Props) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-pieza bg-superficie xl:block">
        <table className="w-full border-collapse text-[0.9375rem]">
          <caption className="sr-only">Lista de certificados</caption>
          <thead>
            <tr className="border-b border-linea">
              <th scope="col" className={`${ENCABEZADO} w-[20%]`}>
                Estudiante
              </th>
              <th scope="col" className={ENCABEZADO}>
                Certificado
              </th>
              <th scope="col" className={`${ENCABEZADO} w-[11rem]`}>
                Código
              </th>
              <th scope="col" className={ENCABEZADO}>
                Estado
              </th>
              <th scope="col" className={`${ENCABEZADO} text-right`}>
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {certificados.map((certificado) => (
              <tr key={certificado.id} className="border-b border-linea last:border-b-0">
                <th scope="row" className={`${CELDA} text-left font-medium`}>
                  <Estudiante certificado={certificado} minima={minima} />
                </th>
                <td className={CELDA}>
                  <span className="block break-words">{certificado.titulo ?? nombreDeTipo(certificado.tipo)}</span>
                  <span className="mt-0.5 block break-words text-sm text-tenue">
                    {[nombreDeTipo(certificado.tipo), grupoDe(certificado, mostrarInstitucion)]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </td>
                <td className={CELDA}>
                  <CodigoDeVerificacion codigo={certificado.codigoVerificacion} />
                  <span className="cifras mt-0.5 block text-sm text-tenue">
                    {fechaCorta(certificado.fechaEmision)}
                  </span>
                </td>
                <td className={CELDA}>
                  <EstadoDeCertificado estado={certificado.estado} />
                </td>
                <td className="px-5 py-2.5 text-right align-top">
                  <Enlace certificado={certificado} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 xl:hidden">
        {certificados.map((certificado) => (
          <li key={certificado.id} className="rounded-pieza bg-superficie p-4">
            <div className="flex items-start justify-between gap-4">
              <p className="min-w-0 font-medium">
                <Estudiante certificado={certificado} minima={minima} />
              </p>
              <span className="shrink-0 text-sm">
                <EstadoDeCertificado estado={certificado.estado} />
              </span>
            </div>
            <p className="mt-2 break-words text-[0.9375rem]">
              {certificado.titulo ?? nombreDeTipo(certificado.tipo)}
            </p>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[0.9375rem]">
              <dt className="text-tenue">Tipo</dt>
              <dd className="min-w-0 break-words">{nombreDeTipo(certificado.tipo)}</dd>
              <dt className="text-tenue">Código</dt>
              <dd className="min-w-0">
                <CodigoDeVerificacion codigo={certificado.codigoVerificacion} />
              </dd>
              <dt className="text-tenue">Emitido</dt>
              <dd className="cifras min-w-0">{fechaCorta(certificado.fechaEmision)}</dd>
              <dt className="text-tenue">Club</dt>
              <dd className="min-w-0 break-words">{grupoDe(certificado, mostrarInstitucion)}</dd>
            </dl>
            <div className="mt-4">
              <Enlace certificado={certificado} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
