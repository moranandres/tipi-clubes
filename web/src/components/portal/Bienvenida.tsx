import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { accesosRapidosParaRol, descripcionDeRol } from "@/lib/portal/menu";
import { exigirSesion, nombreDeRol } from "@/lib/sesion/usuario";

const FORMATO_HORA = new Intl.DateTimeFormat("es-EC", {
  hour: "numeric",
  hourCycle: "h23",
  timeZone: "America/Guayaquil",
});

const MEDIODIA = 12;
const ANOCHECER = 19;

function saludoSegunLaHora(): string {
  const hora = Number(FORMATO_HORA.format(new Date()));
  if (hora < MEDIODIA) {
    return "Buenos días";
  }
  return hora < ANOCHECER ? "Buenas tardes" : "Buenas noches";
}

export async function Bienvenida() {
  const usuario = await exigirSesion();

  if (!usuario) {
    return <h1 className="text-3xl font-medium tracking-tight">Panel principal</h1>;
  }

  const accesos = accesosRapidosParaRol(usuario.rol);

  return (
    <header>
      <h1 className="text-3xl font-medium tracking-tight">
        {saludoSegunLaHora()}, {usuario.nombres}
      </h1>
      <p className="mt-3 max-w-[70ch] text-tenue">
        Entraste como <span className="font-medium text-tinta">{nombreDeRol(usuario.rol)}</span>.{" "}
        {descripcionDeRol(usuario.rol)}
      </p>
      {accesos.length > 0 ? (
        <nav aria-label="Accesos rápidos" className="mt-6">
          <ul className="flex flex-wrap gap-2">
            {accesos.map((acceso) => (
              <li key={acceso.id}>
                <Link
                  href={acceso.href}
                  className="group inline-flex h-10 select-none items-center gap-2 rounded-control bg-superficie px-4 text-[0.9375rem] font-medium transition-[transform,background-color] duration-150 ease-salida hover:bg-superficie-alta active:scale-[0.97]"
                >
                  {acceso.etiqueta}
                  <ArrowRight
                    aria-hidden="true"
                    size={16}
                    className="text-tenue transition-[transform,color] duration-150 ease-salida group-hover:translate-x-0.5 group-hover:text-tinta motion-reduce:transform-none"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}

export function EsqueletoBienvenida() {
  return (
    <div aria-hidden="true" className="motion-safe:animate-pulse">
      <div className="flex h-9 items-center">
        <div className="h-7 w-72 max-w-full rounded-[10px] bg-superficie-alta" />
      </div>
      <div className="mt-3 flex h-6 items-center">
        <div className="h-4 w-[34rem] max-w-full rounded-full bg-superficie" />
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        {["w-28", "w-36", "w-32"].map((ancho) => (
          <div key={ancho} className={`h-10 rounded-control bg-superficie ${ancho}`} />
        ))}
      </div>
    </div>
  );
}
