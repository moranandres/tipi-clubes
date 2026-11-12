import { Acceso } from "@/components/landing/Acceso";
import { Cifras } from "@/components/landing/Cifras";
import { ComoFunciona } from "@/components/landing/ComoFunciona";
import { Hero } from "@/components/landing/Hero";
import { Navegacion } from "@/components/landing/Navegacion";
import { Pie } from "@/components/landing/Pie";

export default function PaginaInicio() {
  return (
    <>
      <Navegacion />
      <main id="contenido" className="flex-1">
        <Hero />
        <ComoFunciona />
        <Cifras />
        <Acceso />
      </main>
      <Pie />
    </>
  );
}
