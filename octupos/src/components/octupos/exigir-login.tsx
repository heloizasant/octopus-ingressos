"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { usuarioAtual } from "@/lib/demo/actions";
import { useDemo } from "@/lib/demo/store";
import type { EstadoDemo, Usuario } from "@/lib/domain/types";
import { Aviso, Carregando, LinkBotao, Pagina } from "./base";

/**
 * Protege uma tela: exige login (simulado) e, opcionalmente, o papel de admin.
 * Entrega o estado da demonstração e o usuário atual para a tela.
 */
export function ExigirLogin({
  papel,
  children,
}: {
  /** "produtor" aceita produtor ou admin. */
  papel?: "admin" | "produtor";
  children: (ctx: { estado: EstadoDemo; usuario: Usuario }) => ReactNode;
}) {
  const estado = useDemo();
  const caminho = usePathname();

  if (!estado) return <Carregando />;
  const usuario = usuarioAtual(estado);

  if (!usuario) {
    return (
      <Pagina estreita className="flex flex-col gap-4">
        <Aviso titulo="Entre para continuar">
          Esta página precisa de uma conta. No protótipo, o login é simulado e não pede senha.
        </Aviso>
        <LinkBotao href={`/entrar?next=${encodeURIComponent(caminho)}`} tamanho="lg">
          Entrar
        </LinkBotao>
        <LinkBotao href="/cadastro" variant="outline" tamanho="lg">
          Criar conta de demonstração
        </LinkBotao>
      </Pagina>
    );
  }

  const negado =
    (papel === "admin" && usuario.role !== "admin") ||
    (papel === "produtor" && usuario.role !== "produtor" && usuario.role !== "admin");
  if (negado) {
    return (
      <Pagina estreita className="flex flex-col gap-4">
        <Aviso tom="perigo" titulo="Acesso restrito">
          Esta área é exclusiva de {papel === "produtor" ? "produtores de eventos" : "administração"}. Você
          está como {usuario.nome}. Para ver, troque de perfil pelo menu da conta (no topo).
        </Aviso>
        <LinkBotao href="/" variant="outline" tamanho="lg">
          Voltar ao início
        </LinkBotao>
      </Pagina>
    );
  }

  return <>{children({ estado, usuario })}</>;
}
