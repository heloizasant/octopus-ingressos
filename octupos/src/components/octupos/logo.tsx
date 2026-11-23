import Image from "next/image";
import { cn } from "@/lib/utils";

/** Selo circular do logo Octopus (polvo com ingresso), recortado da arte oficial. */
export function LogoMarca({ tamanho = 40, className }: { tamanho?: number; className?: string }) {
  return (
    <Image
      src="/octopus-logo.png"
      alt=""
      aria-hidden="true"
      width={tamanho}
      height={tamanho}
      priority
      className={cn("shrink-0 rounded-full", className)}
    />
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMarca tamanho={40} />
      <span className="flex flex-col leading-none">
        <span className="text-[21px] font-extrabold tracking-tight text-ink">Octopus</span>
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-3">Ingressos</span>
      </span>
    </span>
  );
}
