import Link from "next/link";

type Props = {
  href?: string;
  etiqueta?: string;
  alPulsar?: () => void;
};

export function Marca({ href = "/", etiqueta, alPulsar }: Props) {
  return (
    <Link
      href={href}
      onClick={alPulsar}
      className="flex items-baseline gap-2 text-lg font-medium tracking-tight"
    >
      TIPI
      <span className="font-mono text-sm text-tenue">3.0</span>
      {etiqueta ? (
        <span className="ml-2 border-l border-linea pl-3 text-[0.9375rem] font-normal text-tenue">
          {etiqueta}
        </span>
      ) : null}
    </Link>
  );
}
