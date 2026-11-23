import { LinkBotao, Pagina, Vazio } from "./base";

export function NaoEncontrado({
  titulo = "Não encontramos esta página",
  texto = "O endereço pode estar errado ou o item não existe mais neste navegador de demonstração.",
  href = "/",
  rotulo = "Voltar ao início",
}: {
  titulo?: string;
  texto?: string;
  href?: string;
  rotulo?: string;
}) {
  return (
    <Pagina estreita>
      <Vazio
        titulo={titulo}
        acao={
          <LinkBotao href={href} tamanho="md">
            {rotulo}
          </LinkBotao>
        }
      >
        {texto}
      </Vazio>
    </Pagina>
  );
}
