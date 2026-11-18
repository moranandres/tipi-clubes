"use server";

import { api } from "@/lib/api/cliente";
import { conSesion, intentar, tokenDeSesion } from "@/lib/api/con-sesion";
import {
  CAMPOS_DE_PARAMETROS,
  numeroDeUmbral,
  validarParametros,
} from "@/lib/portal/filtros-seguimiento";
import { enteroDe, hayErrores, leerCampos } from "@/lib/portal/validacion";
import { falloDeApi, revalidarPortal, type PistaDeCampo } from "./fallo";
import { accionCorrecta, camposInvalidos, type ResultadoDeAccion } from "./resultado";

const PISTAS: readonly PistaDeCampo[] = [
  { patron: /días de gracia/i, campo: "diasGraciaRegistro" },
  { patron: /umbral mínimo/i, campo: "umbralMinimo" },
  { patron: /umbral/i, campo: "umbralAdecuado" },
];

export async function actualizarParametros(entrada: unknown): Promise<ResultadoDeAccion> {
  const datos = leerCampos(entrada, CAMPOS_DE_PARAMETROS, 20);
  const errores = validarParametros(datos);
  if (hayErrores(errores)) {
    return camposInvalidos(errores);
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.PUT("/api/seguimiento/parametros", {
      ...conSesion(token),
      body: {
        diasGraciaRegistro: enteroDe(datos.diasGraciaRegistro) ?? 0,
        umbralAdecuado: numeroDeUmbral(datos.umbralAdecuado),
        umbralMinimo: numeroDeUmbral(datos.umbralMinimo),
      },
    }),
  );

  if (!respuesta.datos) {
    return falloDeApi(respuesta, PISTAS);
  }

  revalidarPortal();
  return accionCorrecta("Los parámetros del semáforo se guardaron y el seguimiento se recalculó.");
}
