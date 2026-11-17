import { Campo } from "@/components/ui/Campo";
import {
  LIMITES_DE_INSTITUCION,
  type CampoDeContacto,
  type DatosDeContacto,
} from "@/lib/portal/reglas-instituciones";

type Props = {
  valores: DatosDeContacto;
  errores: Partial<Record<CampoDeContacto, string>>;
  cambiar: (campo: CampoDeContacto, valor: string) => void;
};

export function CamposDeContacto({ valores, errores, cambiar }: Props) {
  return (
    <div className="mt-4 grid gap-x-5 gap-y-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Campo
          etiqueta="Dirección (opcional)"
          name="direccion"
          type="text"
          autoComplete="street-address"
          maxLength={LIMITES_DE_INSTITUCION.direccion}
          value={valores.direccion}
          error={errores.direccion}
          onChange={(evento) => cambiar("direccion", evento.target.value)}
        />
      </div>
      <Campo
        etiqueta="Teléfono (opcional)"
        name="telefono"
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        maxLength={LIMITES_DE_INSTITUCION.telefono}
        className="cifras"
        value={valores.telefono}
        error={errores.telefono}
        onChange={(evento) => cambiar("telefono", evento.target.value)}
      />
      <Campo
        etiqueta="Correo de contacto (opcional)"
        name="correoContacto"
        type="email"
        autoComplete="email"
        spellCheck={false}
        maxLength={LIMITES_DE_INSTITUCION.correoContacto}
        value={valores.correoContacto}
        error={errores.correoContacto}
        onChange={(evento) => cambiar("correoContacto", evento.target.value)}
      />
      <Campo
        etiqueta="Nombre de la autoridad (opcional)"
        name="autoridadNombre"
        type="text"
        autoComplete="off"
        maxLength={LIMITES_DE_INSTITUCION.autoridadNombre}
        value={valores.autoridadNombre}
        error={errores.autoridadNombre}
        onChange={(evento) => cambiar("autoridadNombre", evento.target.value)}
      />
      <Campo
        etiqueta="Cargo de la autoridad (opcional)"
        name="autoridadCargo"
        type="text"
        autoComplete="off"
        maxLength={LIMITES_DE_INSTITUCION.autoridadCargo}
        placeholder="Rector, directora"
        value={valores.autoridadCargo}
        error={errores.autoridadCargo}
        onChange={(evento) => cambiar("autoridadCargo", evento.target.value)}
      />
    </div>
  );
}
