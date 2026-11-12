import type { Metadata } from "next";
import { Suspense } from "react";
import { exigirSesion, nombreDeRol } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Inicio del portal",
};

async function ResumenDeSesion() {
  const usuario = await exigirSesion();

  if (!usuario) {
    return (
      <div className="max-w-[60ch]">
        <h1 className="text-3xl font-medium tracking-tight">No se pudo verificar tu sesión</h1>
        <p className="mt-4 text-tenue">
          El servidor de TIPI 3.0 no responde en este momento. Tu sesión sigue guardada: recarga la
          página en unos minutos.
        </p>
      </div>
    );
  }

  const datos = [
    { nombre: "Usuario", valor: usuario.username, codigo: true },
    { nombre: "Nombre", valor: `${usuario.nombres} ${usuario.apellidos}`, codigo: false },
    { nombre: "Rol", valor: nombreDeRol(usuario.rol), codigo: false },
    {
      nombre: "Institución",
      valor: usuario.institucionId ? `ID ${usuario.institucionId}` : "Todas las instituciones",
      codigo: Boolean(usuario.institucionId),
    },
    {
      nombre: "Contraseña",
      valor: usuario.debeCambiarPassword ? "Temporal, pendiente de cambio" : "Definida por ti",
      codigo: false,
    },
  ];

  return (
    <>
      <h1 className="text-3xl font-medium tracking-tight">Hola, {usuario.nombres}</h1>
      <p className="mt-4 max-w-[60ch] text-tenue">
        Tu sesión está activa. Estos datos llegan del servidor con tu credencial, que el navegador
        guarda en una cookie que el código de la página no puede leer.
      </p>
      <dl className="mt-10 max-w-[44rem]">
        {datos.map((dato) => (
          <div
            key={dato.nombre}
            className="grid gap-1 border-t border-linea py-4 last:border-b sm:grid-cols-[12rem_1fr] sm:gap-6"
          >
            <dt className="text-tenue">{dato.nombre}</dt>
            <dd className={`break-words ${dato.codigo ? "font-mono text-[0.9375rem]" : ""}`}>
              {dato.valor}
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}

function EsqueletoResumen() {
  return (
    <div aria-hidden="true">
      <div className="h-9 w-64 max-w-full rounded-full bg-superficie-alta" />
      <div className="mt-5 h-4 w-[28rem] max-w-full rounded-full bg-superficie" />
      <div className="mt-10 max-w-[44rem]">
        {[0, 1, 2, 3, 4].map((fila) => (
          <div key={fila} className="border-t border-linea py-4 last:border-b">
            <div className="h-5 w-48 max-w-full rounded-full bg-superficie" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PaginaPortal() {
  return (
    <div className="contenedor py-12 lg:py-16">
      <Suspense fallback={<EsqueletoResumen />}>
        <ResumenDeSesion />
      </Suspense>
    </div>
  );
}
