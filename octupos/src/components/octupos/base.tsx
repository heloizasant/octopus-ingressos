import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Info, LoaderCircle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import type { Rotulo, Tom } from "@/lib/domain/status";
import { cn } from "@/lib/utils";

/** Largura padrão das páginas: coluna única no celular, até 1152 px no desktop. */
export function Pagina({
  className,
  children,
  estreita,
}: {
  className?: string;
  children: ReactNode;
  estreita?: boolean;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-6 py-6 md:py-10",
        estreita ? "max-w-2xl" : "max-w-6xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Titulo({
  children,
  sub,
  className,
}: {
  children: ReactNode;
  sub?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-6 flex flex-col gap-1.5", className)}>
      <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-ink md:text-3xl">
        {children}
      </h1>
      {sub ? <p className="text-[15px] text-ink-3">{sub}</p> : null}
    </header>
  );
}

export function Secao({
  titulo,
  acao,
  children,
  className,
}: {
  titulo: string;
  acao?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-bold text-ink-2 md:text-base">{titulo}</h2>
        {acao}
      </div>
      {children}
    </section>
  );
}

/** Cartão branco com borda, como nos cards da tela de referência. */
export function Cartao({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-2xl border border-border bg-card p-4 md:p-5", className)}
      {...props}
    />
  );
}

const TOM: Record<Tom, string> = {
  neutro: "bg-muted text-ink-2",
  marca: "bg-brand-soft text-secondary-foreground",
  sucesso: "bg-success-soft text-success",
  alerta: "bg-warning-soft text-warning",
  perigo: "bg-danger-soft text-danger",
};

export function Selo({
  tom = "neutro",
  className,
  children,
}: {
  tom?: Tom;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold leading-none",
        TOM[tom],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusSelo({ rotulo, className }: { rotulo: Rotulo; className?: string }) {
  return (
    <Selo tom={rotulo.tom} className={className}>
      {rotulo.texto}
    </Selo>
  );
}

/** Marca explícita de que o item é simulado. */
export function Simulacao({ className }: { className?: string }) {
  return (
    <Selo tom="marca" className={className}>
      Simulação
    </Selo>
  );
}

// ---------------------------------------------------------------------------
// Botões
// ---------------------------------------------------------------------------
type Tamanho = "sm" | "md" | "lg";

// Altura mínima (e não fixa) + quebra de linha: textos longos nunca vazam do botão.
const TAMANHO: Record<Tamanho, string> = {
  sm: "h-auto min-h-9 rounded-xl px-3.5 py-1.5 text-sm font-semibold",
  md: "h-auto min-h-11 rounded-xl px-4 py-2 text-sm font-semibold",
  lg: "h-auto min-h-[52px] rounded-[14px] px-5 py-3 text-base font-bold",
};

const PRIMARIO = "bg-primary text-primary-foreground hover:bg-brand-strong";

type Variante = "default" | "outline" | "ghost" | "destructive" | "secondary";

function classes(variant: Variante, tamanho: Tamanho, className?: string) {
  return cn(
    buttonVariants({ variant }),
    "whitespace-normal text-center",
    TAMANHO[tamanho],
    variant === "default" && PRIMARIO,
    variant === "outline" && "bg-card",
    className,
  );
}

export function LinkBotao({
  href,
  variant = "default",
  tamanho = "md",
  className,
  children,
  ...rest
}: Omit<ComponentProps<typeof Link>, "className"> & {
  variant?: Variante;
  tamanho?: Tamanho;
  className?: string;
}) {
  return (
    <Link href={href} className={classes(variant, tamanho, className)} {...rest}>
      {children}
    </Link>
  );
}

export function Botao({
  variant = "default",
  tamanho = "md",
  className,
  ...rest
}: Omit<ComponentProps<typeof Button>, "size" | "variant" | "className"> & {
  variant?: Variante;
  tamanho?: Tamanho;
  className?: string;
}) {
  return <Button variant={variant} className={classes(variant, tamanho, className)} {...rest} />;
}

// ---------------------------------------------------------------------------
// Estados de tela
// ---------------------------------------------------------------------------
export function Carregando({ texto = "Carregando…" }: { texto?: string }) {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 py-20 text-sm text-ink-3"
    >
      <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
      {texto}
    </div>
  );
}

export function Aviso({
  tom = "marca",
  titulo,
  children,
  className,
}: {
  tom?: Tom;
  titulo?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tom === "perigo" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-2xl p-4 text-sm", TOM[tom], className)}
    >
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        {titulo ? <p className="font-bold">{titulo}</p> : null}
        {children ? <div className="leading-relaxed">{children}</div> : null}
      </div>
    </div>
  );
}

export function Vazio({
  titulo,
  children,
  acao,
}: {
  titulo: string;
  children?: ReactNode;
  acao?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-center">
      <p className="font-bold text-ink">{titulo}</p>
      {children ? <p className="max-w-md text-sm text-ink-3">{children}</p> : null}
      {acao ? <div className="mt-2">{acao}</div> : null}
    </div>
  );
}

export function Campo({
  rotulo,
  dica,
  children,
  htmlFor,
}: {
  rotulo: string;
  dica?: string;
  children: ReactNode;
  htmlFor: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-semibold text-ink-2">
        {rotulo}
      </label>
      {children}
      {dica ? <p className="text-xs text-ink-3">{dica}</p> : null}
    </div>
  );
}

/** Estilo único para inputs, selects e textareas nativos. */
export const ENTRADA =
  "w-full rounded-[14px] border border-border bg-card px-4 py-3 text-[15px] text-ink placeholder:text-ink-3 focus-visible:border-brand focus-visible:outline-2 disabled:opacity-60";
