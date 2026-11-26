import Image from "next/image";
import { cn } from "@/lib/utils";

/** Selo circular do logo Octopus: o polvo com ingresso, mascote e símbolo da marca. */
export function LogoMarca({ tamanho = 40, className }: { tamanho?: number; className?: string }) {
  return (
    <Image
      src="/mascote-octopus.png"
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
      <span className="text-[22px] font-extrabold leading-none tracking-tight text-ink">Octopus</span>
    </span>
  );
}
