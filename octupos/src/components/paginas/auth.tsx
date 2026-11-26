"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Shield, Store, UserRound } from "lucide-react";
import { Aviso, Botao, Campo, Cartao, Carregando, ENTRADA, Pagina, Selo, Titulo } from "@/components/octupos/base";
import { usuarioAtual } from "@/lib/demo/actions";
import { acoes, useDemo } from "@/lib/demo/store";

/** Só aceita caminhos internos como destino depois do login. */
function destinoSeguro(valor: string | null): string {
  if (valor && valor.startsWith("/") && !valor.startsWith("//") && !valor.startsWith("/\\")) return valor;
  return "/";
}

const DESCRICAO_PAPEL: Record<string, string> = {
  "usr-admin": "Vê e valida ingressos de todos os eventos",
  "usr-prod-atletica": "Produtor: Good Times, Pagode na Praça e Arena 360",
  "usr-prod-arena": "Produtor: Sertanejo no Cerrado, Electronic Experience e Cerrado Noise Rock",
  "usr-comprador": "Comprador com 3 ingressos válidos",
  "usr-ana": "Tem 1 ingresso anunciado e 1 comprado na revenda",
  "usr-bruno": "Tem 1 ingresso anunciado e 1 válido",
  "usr-carla": "Revendeu 1 ingresso (código antigo invalidado)",
};

const SELO_PAPEL = { admin: "Administração", produtor: "Produtor", usuario: null } as const;

export function Entrar() {
  const estado = useDemo();
  const roteador = useRouter();
  const destino = destinoSeguro(useSearchParams().get("next"));
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  if (!estado) return <Carregando />;
  const atual = usuarioAtual(estado);

  function entrarComo(id: string) {
    const r = acoes.entrar(id);
    if (r.ok) roteador.push(destino);
    else setErro(r.erro);
  }

  function enviar(ev: React.FormEvent) {
    ev.preventDefault();
    const r = acoes.entrarPorEmail(email);
    if (r.ok) roteador.push(destino);
    else setErro(r.erro);
  }

  return (
    <Pagina estreita>
      <Titulo sub="O login é simulado: nenhuma senha é pedida nem verificada.">Entrar</Titulo>

      {atual ? (
        <Aviso className="mb-5" titulo={`Você está logado como ${atual.nome}`}>
          Escolha outra conta abaixo para trocar, ou continue navegando.
        </Aviso>
      ) : null}

      <section aria-labelledby="contas-demo" className="mb-8 flex flex-col gap-3">
        <h2 id="contas-demo" className="text-[15px] font-bold text-ink-2">
          Contas de demonstração
        </h2>
        <ul className="flex flex-col gap-2.5">
          {estado.usuarios.map((u) => (
            <li key={u.id}>
              <Cartao className="flex items-center justify-between gap-3 !p-3.5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                    {u.role === "admin" ? (
                      <Shield className="size-5" aria-hidden="true" />
                    ) : u.role === "produtor" ? (
                      <Store className="size-5" aria-hidden="true" />
                    ) : (
                      <UserRound className="size-5" aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-bold text-ink">
                      {u.nome}
                      {SELO_PAPEL[u.role] ? <Selo tom="marca">{SELO_PAPEL[u.role]}</Selo> : null}
                    </p>
                    <p className="truncate text-xs text-ink-3">
                      {DESCRICAO_PAPEL[u.id] ?? u.email}
                    </p>
                  </div>
                </div>
                <Botao
                  tamanho="sm"
                  variant={atual?.id === u.id ? "outline" : "default"}
                  onClick={() => entrarComo(u.id)}
                  aria-label={`Entrar como ${u.nome}`}
                >
                  {atual?.id === u.id ? "Atual" : "Entrar"}
                </Botao>
              </Cartao>
            </li>
          ))}
        </ul>
      </section>

      <form onSubmit={enviar} className="flex flex-col gap-4">
        <h2 className="text-[15px] font-bold text-ink-2">Ou entre pelo e-mail da conta</h2>
        <Campo rotulo="E-mail" htmlFor="email-entrar" dica="Ex.: ana@octupos.test. Não digite senhas reais.">
          <input
            id="email-entrar"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErro(null);
            }}
            placeholder="voce@exemplo.test"
            required
            className={ENTRADA}
          />
        </Campo>
        {erro ? (
          <p role="alert" className="text-sm font-semibold text-danger">
            {erro}
          </p>
        ) : null}
        <Botao type="submit" tamanho="lg">
          Entrar
        </Botao>
        <p className="text-center text-sm text-ink-3">
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="font-semibold text-brand hover:underline">
            Criar conta de demonstração
          </Link>
        </p>
      </form>
    </Pagina>
  );
}

export function Cadastro() {
  const estado = useDemo();
  const roteador = useRouter();
  const destino = destinoSeguro(useSearchParams().get("next"));
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  if (!estado) return <Carregando />;

  function enviar(ev: React.FormEvent) {
    ev.preventDefault();
    const r = acoes.cadastrar(nome, email);
    if (r.ok) roteador.push(destino);
    else setErro(r.erro);
  }

  return (
    <Pagina estreita>
      <Titulo sub="Cria uma conta de demonstração, guardada só neste navegador.">Criar conta</Titulo>
      <Aviso className="mb-5" titulo="Sem senha no protótipo">
        Nenhuma senha é pedida. Use um nome e um e-mail fictícios (por exemplo, terminando em
        .test). Nada é enviado para servidor algum.
      </Aviso>
      <form onSubmit={enviar} className="flex flex-col gap-4">
        <Campo rotulo="Nome" htmlFor="nome-cadastro">
          <input
            id="nome-cadastro"
            autoComplete="name"
            value={nome}
            onChange={(e) => {
              setNome(e.target.value);
              setErro(null);
            }}
            placeholder="Seu nome"
            required
            maxLength={100}
            className={ENTRADA}
          />
        </Campo>
        <Campo rotulo="E-mail" htmlFor="email-cadastro">
          <input
            id="email-cadastro"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErro(null);
            }}
            placeholder="voce@exemplo.test"
            required
            className={ENTRADA}
          />
        </Campo>
        {erro ? (
          <p role="alert" className="text-sm font-semibold text-danger">
            {erro}
          </p>
        ) : null}
        <Botao type="submit" tamanho="lg">
          Criar conta e entrar
        </Botao>
        <p className="text-center text-sm text-ink-3">
          Já tem conta?{" "}
          <Link href="/entrar" className="font-semibold text-brand hover:underline">
            Entrar
          </Link>
        </p>
      </form>
    </Pagina>
  );
}
