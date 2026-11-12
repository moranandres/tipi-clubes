import { TITULO_OFICIAL } from "@/lib/proyecto";

export function Pie() {
  return (
    <footer className="border-t border-linea py-10 text-sm text-tenue">
      <div className="contenedor flex flex-col gap-4 md:flex-row md:items-baseline md:justify-between md:gap-12">
        <p className="max-w-[62ch] font-medium text-tinta">{TITULO_OFICIAL}.</p>
        <p className="max-w-[40ch] md:text-right">
          Las fichas del inicio usan datos de ejemplo. Las cifras del tablero son reales.
        </p>
      </div>
    </footer>
  );
}
