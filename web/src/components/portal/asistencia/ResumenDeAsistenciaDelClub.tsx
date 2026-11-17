import type { ConteoDeAsistencia, ResumenDeAsistencia } from "@/lib/api/asistencia";
import { identidadDe } from "@/lib/portal/identidad";
import { porcentajeLegible, type Conteo } from "@/lib/portal/reglas-asistencia";
import { fechaCorta } from "@/lib/portal/tiempo";
import { ConteoDePlanilla } from "./ConteoDePlanilla";

type Props = {
  resumen: ResumenDeAsistencia;
  minima: boolean;
};

const FORMATO_NUMERO = new Intl.NumberFormat("es-EC");
const CELDA = "px-4 py-3 align-top";
const ENCABEZADO = "px-4 py-3 text-left text-sm font-medium text-tenue";
const NUMERO = "cifras text-right";

function conteoDe(conteo: ConteoDeAsistencia | undefined, pendientes: number): Conteo {
  return {
    PRESENTE: conteo?.presentes ?? 0,
    ATRASADO: conteo?.atrasados ?? 0,
    AUSENTE: conteo?.ausentes ?? 0,
    JUSTIFICADO: conteo?.justificados ?? 0,
    pendientes,
  };
}

function Indicador({ termino, valor, detalle }: { termino: string; valor: string; detalle: string }) {
  return (
    <div className="min-w-0 rounded-pieza border border-linea p-4">
      <dt className="text-sm text-tenue">{termino}</dt>
      <dd className="cifras mt-2 text-2xl font-medium leading-none tracking-tight">{valor}</dd>
      <dd className="mt-2 text-sm text-tenue">{detalle}</dd>
    </div>
  );
}

export function ResumenDeAsistenciaDelClub({ resumen, minima }: Props) {
  const estudiantes = resumen.estudiantes ?? [];
  const sesiones = resumen.sesionesEjecutadas ?? 0;

  return (
    <section aria-labelledby="resumen-del-club" className="mt-8">
      <h2 id="resumen-del-club" className="text-lg font-medium">
        Resumen de {resumen.clubNombre ?? "el club"}
      </h2>
      <p className="cifras mt-1.5 text-[0.9375rem] text-tenue">
        Del {fechaCorta(resumen.desde)} al {fechaCorta(resumen.hasta)}
      </p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <Indicador
          termino="Sesiones ejecutadas"
          valor={FORMATO_NUMERO.format(sesiones)}
          detalle="En el rango de fechas"
        />
        <Indicador
          termino="Registro completo"
          valor={porcentajeLegible(resumen.porcentajeCompletitud)}
          detalle={`${FORMATO_NUMERO.format(resumen.registrosTomados ?? 0)} de ${FORMATO_NUMERO.format(resumen.registrosEsperados ?? 0)} registros`}
        />
        <Indicador
          termino="Asistencia efectiva"
          valor={porcentajeLegible(resumen.porcentajeAsistencia)}
          detalle="Presentes y atrasados, sin justificados"
        />
      </dl>
      <div className="mt-3">
        <ConteoDePlanilla
          conteo={conteoDe(resumen.conteo, resumen.registrosPendientes ?? 0)}
          textoPendientes="Sin registrar"
        />
      </div>

      {estudiantes.length > 0 ? (
        <>
          <div className="mt-6 hidden overflow-x-auto rounded-pieza bg-superficie lg:block">
            <table className="w-full border-collapse text-[0.9375rem]">
              <caption className="sr-only">Asistencia por estudiante</caption>
              <thead>
                <tr className="border-b border-linea">
                  <th scope="col" className={ENCABEZADO}>
                    Estudiante
                  </th>
                  <th scope="col" className={`${ENCABEZADO} text-right`}>
                    Sesiones
                  </th>
                  <th scope="col" className={`${ENCABEZADO} text-right`}>
                    Presente
                  </th>
                  <th scope="col" className={`${ENCABEZADO} text-right`}>
                    Atrasado
                  </th>
                  <th scope="col" className={`${ENCABEZADO} text-right`}>
                    Ausente
                  </th>
                  <th scope="col" className={`${ENCABEZADO} text-right`}>
                    Justificado
                  </th>
                  <th scope="col" className={`${ENCABEZADO} text-right`}>
                    Asistencia
                  </th>
                </tr>
              </thead>
              <tbody>
                {estudiantes.map((fila) => {
                  const identidad = identidadDe(
                    { nombres: fila.estudianteNombres, apellidos: fila.estudianteApellidos, codigo: fila.estudianteCodigo },
                    minima,
                  );
                  return (
                    <tr key={fila.estudianteId} className="border-b border-linea last:border-b-0">
                      <th scope="row" className={`${CELDA} text-left font-medium`}>
                        <span className={`block break-words ${identidad.codigo ? "" : "cifras"}`}>
                          {identidad.principal}
                        </span>
                        {identidad.codigo ? (
                          <span className="cifras mt-0.5 block text-sm font-normal text-tenue">
                            {identidad.codigo}
                          </span>
                        ) : null}
                      </th>
                      <td className={`${CELDA} ${NUMERO}`}>
                        {fila.registradas ?? 0} de {fila.sesionesEsperadas ?? 0}
                      </td>
                      <td className={`${CELDA} ${NUMERO}`}>{fila.conteo?.presentes ?? 0}</td>
                      <td className={`${CELDA} ${NUMERO}`}>{fila.conteo?.atrasados ?? 0}</td>
                      <td className={`${CELDA} ${NUMERO}`}>{fila.conteo?.ausentes ?? 0}</td>
                      <td className={`${CELDA} ${NUMERO}`}>{fila.conteo?.justificados ?? 0}</td>
                      <td className={`${CELDA} ${NUMERO} font-medium`}>
                        {porcentajeLegible(fila.porcentajeAsistencia)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <ul className="mt-6 flex flex-col gap-3 lg:hidden">
            {estudiantes.map((fila) => {
              const identidad = identidadDe(
                { nombres: fila.estudianteNombres, apellidos: fila.estudianteApellidos, codigo: fila.estudianteCodigo },
                minima,
              );
              return (
                <li key={fila.estudianteId} className="rounded-pieza bg-superficie p-4">
                  <div className="flex items-start justify-between gap-4">
                    <p className="min-w-0">
                      <span className={`block break-words font-medium ${identidad.codigo ? "" : "cifras"}`}>
                        {identidad.principal}
                      </span>
                      {identidad.codigo ? (
                        <span className="cifras mt-0.5 block text-sm text-tenue">{identidad.codigo}</span>
                      ) : null}
                    </p>
                    <span className="cifras shrink-0 font-medium">
                      {porcentajeLegible(fila.porcentajeAsistencia)}
                    </span>
                  </div>
                  <p className="cifras mt-2 text-sm text-tenue">
                    {fila.registradas ?? 0} de {fila.sesionesEsperadas ?? 0} sesiones registradas
                  </p>
                  <p className="cifras mt-0.5 text-sm text-tenue">
                    {fila.conteo?.presentes ?? 0} presentes, {fila.conteo?.atrasados ?? 0} atrasados,{" "}
                    {fila.conteo?.ausentes ?? 0} ausentes, {fila.conteo?.justificados ?? 0} justificados
                  </p>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </section>
  );
}
