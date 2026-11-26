"use client";

import Image from "next/image";
import { useState } from "react";
import type { Evento } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

/**
 * Capa do evento. Mostra a imagem de divulgação (arquivo local) quando existe;
 * se não houver imagem ou ela não carregar, usa o gradiente da própria
 * identidade do evento. É decorativa: o nome do evento sempre aparece em texto.
 */
export function CapaEvento({
  evento,
  className,
  mostrarCategoria = true,
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  prioridade = false,
}: {
  evento: Pick<Evento, "capa" | "categoria" | "imagem">;
  className?: string;
  mostrarCategoria?: boolean;
  /** Larguras aproximadas da capa na tela, para o navegador baixar o tamanho certo. */
  sizes?: string;
  prioridade?: boolean;
}) {
  const [falhou, setFalhou] = useState(false);
  const imagem = !falhou ? evento.imagem : undefined;

  return (
    <div
      aria-hidden="true"
      className={cn("relative overflow-hidden", className)}
      style={{ background: `linear-gradient(135deg, ${evento.capa.de}, ${evento.capa.para})` }}
    >
      {imagem ? (
        <Image
          src={imagem.src}
          alt=""
          fill
          sizes={sizes}
          loading={prioridade ? "eager" : undefined}
          className="object-cover"
          onError={() => setFalhou(true)}
        />
      ) : (
        <>
          <div className="absolute -right-10 -top-10 size-44 rounded-full bg-white/15" />
          <div className="absolute -bottom-12 left-8 size-36 rounded-full bg-white/10" />
          <div className="absolute right-16 top-1/2 size-14 rounded-full border-4 border-white/20" />
        </>
      )}
      {mostrarCategoria ? (
        <span className="absolute bottom-3 left-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
          {evento.categoria}
        </span>
      ) : null}
    </div>
  );
}

/** Paletas oferecidas no formulário de evento do produtor. */
export const PALETAS_CAPA: { nome: string; de: string; para: string }[] = [
  { nome: "Roxo Octopus", de: "#5B4FE9", para: "#9B8CFF" },
  { nome: "Noite", de: "#1F2937", para: "#5B4FE9" },
  { nome: "Pôr do sol", de: "#EC4899", para: "#F59E0B" },
  { nome: "Oceano", de: "#0EA5E9", para: "#5B4FE9" },
  { nome: "Floresta", de: "#10B981", para: "#0F766E" },
  { nome: "Brasa", de: "#F97316", para: "#DB2777" },
];
