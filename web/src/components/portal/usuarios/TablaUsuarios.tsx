import { PuntoDeEstado } from "@/components/portal/PuntoDeEstado";
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import type { Usuario } from "@/lib/api/usuarios";
import {
  NOMBRE_DE_ESTADO_DE_USUARIO,
  PUNTOS_DE_ESTADO_DE_USUARIO,
  estaBloqueado,
  estadoDeUsuario,
  nombreDeRolDeUsuario,
  nombreDeUsuario,
  rutaDeUsuario,
} from "@/lib/portal/filtros-usuarios";
import { momentoCorto } from "@/lib/portal/tiempo";

type Props = {
  usuarios: Usuario[];
  instituciones: Map<number, string>;
  idPropio?: number;
};

const CELDA = "px-5 py-3.5 align-top";
const ENCABEZADO = "px-5 py-3 text-left text-sm font-medium text-tenue";

function institucionDe(usuario: Usuario, instituciones: Map<number, string>): string | null {
  return usuario.institucionId ? (instituciones.get(usuario.institucionId) ?? null) : null;
}

function Estado({ usuario }: { usuario: Usuario }) {
  const estado = estadoDeUsuario(usuario.activo);
  return (
    <PuntoDeEstado punto={PUNTOS_DE_ESTADO_DE_USUARIO[estado]}>
      {NOMBRE_DE_ESTADO_DE_USUARIO[estado]}
    </PuntoDeEstado>
  );
}

function Marcas({ usuario, idPropio }: { usuario: Usuario; idPropio?: number }) {
  const marcas = [
    usuario.id === idPropio ? { texto: "Tu cuenta", clase: "text-acento" } : null,
    estaBloqueado(usuario.bloqueadoHasta) ? { texto: "Bloqueada", clase: "text-error" } : null,
    usuario.debeCambiarPassword ? { texto: "Clave temporal", clase: "text-aviso" } : null,
  ].filter((marca): marca is { texto: string; clase: string } => marca !== null);

  if (marcas.length === 0) {
    return null;
  }

  return (
    <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-sm">
      {marcas.map((marca) => (
        <span key={marca.texto} className={`whitespace-nowrap ${marca.clase}`}>
          {marca.texto}
        </span>
      ))}
    </span>
  );
}

function UltimoAcceso({ usuario }: { usuario: Usuario }) {
  const momento = momentoCorto(usuario.ultimoAcceso);
  return momento ? <span className="cifras">{momento}</span> : <span className="text-tenue">Nunca</span>;
}

function EnlaceAbrir({ usuario }: { usuario: Usuario }) {
  return (
    <EnlaceBoton href={rutaDeUsuario(usuario.id ?? 0)} variante="elevado" tamano="compacto">
      Gestionar
      <span className="sr-only"> la cuenta de {nombreDeUsuario(usuario)}</span>
    </EnlaceBoton>
  );
}

export function TablaUsuarios({ usuarios, instituciones, idPropio }: Props) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-pieza bg-superficie md:block">
        <table className="w-full border-collapse text-[0.9375rem]">
          <caption className="sr-only">Lista de cuentas de usuario</caption>
          <thead>
            <tr className="border-b border-linea">
              <th scope="col" className={`${ENCABEZADO} w-[34%]`}>
                Persona
              </th>
              <th scope="col" className={`${ENCABEZADO} w-[28%]`}>
                Rol
              </th>
              <th scope="col" className={ENCABEZADO}>
                Último acceso
              </th>
              <th scope="col" className={ENCABEZADO}>
                Estado
              </th>
              <th scope="col" className={`${ENCABEZADO} text-right`}>
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((usuario) => (
              <tr key={usuario.id} className="border-b border-linea last:border-b-0">
                <th scope="row" className={`${CELDA} text-left font-medium`}>
                  <span className="block break-words">{nombreDeUsuario(usuario)}</span>
                  <span className="mt-0.5 block break-all text-sm font-normal text-tenue">
                    {[usuario.username, usuario.email].filter(Boolean).join(" · ")}
                  </span>
                </th>
                <td className={CELDA}>
                  <span className="block">{nombreDeRolDeUsuario(usuario.rol)}</span>
                  {institucionDe(usuario, instituciones) ? (
                    <span className="mt-0.5 block break-words text-sm text-tenue">
                      {institucionDe(usuario, instituciones)}
                    </span>
                  ) : null}
                </td>
                <td className={`${CELDA} whitespace-nowrap`}>
                  <UltimoAcceso usuario={usuario} />
                </td>
                <td className={CELDA}>
                  <Estado usuario={usuario} />
                  <Marcas usuario={usuario} idPropio={idPropio} />
                </td>
                <td className="px-5 py-2.5 text-right align-top">
                  <EnlaceAbrir usuario={usuario} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 md:hidden">
        {usuarios.map((usuario) => (
          <li key={usuario.id} className="rounded-pieza bg-superficie p-4">
            <div className="flex items-start justify-between gap-4">
              <p className="min-w-0 break-words font-medium">{nombreDeUsuario(usuario)}</p>
              <span className="shrink-0 text-sm">
                <Estado usuario={usuario} />
              </span>
            </div>
            <p className="mt-0.5 break-all text-sm text-tenue">
              {[usuario.username, usuario.email].filter(Boolean).join(" · ")}
            </p>
            <Marcas usuario={usuario} idPropio={idPropio} />
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[0.9375rem]">
              <dt className="text-tenue">Rol</dt>
              <dd className="min-w-0 break-words">{nombreDeRolDeUsuario(usuario.rol)}</dd>
              {institucionDe(usuario, instituciones) ? (
                <>
                  <dt className="text-tenue">Institución</dt>
                  <dd className="min-w-0 break-words">{institucionDe(usuario, instituciones)}</dd>
                </>
              ) : null}
              <dt className="text-tenue">Último acceso</dt>
              <dd>
                <UltimoAcceso usuario={usuario} />
              </dd>
            </dl>
            <div className="mt-4">
              <EnlaceAbrir usuario={usuario} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
