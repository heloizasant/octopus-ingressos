import Link from "next/link";
import { Logo } from "@/components/octupos/logo";

/** Cabeçalho mostrado antes do carregamento do JavaScript: já traz o logo, sem salto de layout. */
export function CabecalhoEsqueleto() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
        <Link href="/" aria-label="Octopus, página inicial" className="rounded-lg">
          <Logo />
        </Link>
        <div className="h-10 w-24" aria-hidden="true" />
      </div>
    </header>
  );
}
