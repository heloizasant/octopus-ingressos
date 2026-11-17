import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";

// Página provisória da Etapa 1: confirma a conexão com o banco.
// A tela inicial definitiva (referência "Buscar evento") entra na Etapa 4.

const formatoData = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

async function ListaEventos() {
  const supabase = await createClient();

  if (!supabase) {
    return (
      <p className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        Supabase ainda não configurado. Preencha o arquivo{" "}
        <code>.env.local</code> a partir de <code>.env.local.example</code>.
      </p>
    );
  }

  const { data: eventos, error } = await supabase
    .from("events")
    .select("id, nome, data_hora, local")
    .order("data_hora");

  if (error) {
    return (
      <p className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">
        Não foi possível ler os eventos: {error.message}
      </p>
    );
  }

  if (!eventos?.length) {
    return (
      <p className="text-sm text-neutral-600">
        Conectado ao banco, mas ainda não há eventos. Rode{" "}
        <code>npm run seed</code>.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {eventos.map((evento) => (
        <li
          key={evento.id}
          className="rounded-2xl border border-neutral-200 bg-white p-4"
        >
          <p className="font-semibold">{evento.nome}</p>
          <p className="text-sm text-neutral-600">
            {formatoData.format(new Date(evento.data_hora))} · {evento.local}
          </p>
        </li>
      ))}
    </ul>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold">Octupos</h1>
        <p className="text-sm text-neutral-600">
          Configuração inicial: verificação da conexão com o banco de dados.
        </p>
      </header>
      <Suspense fallback={<p className="text-sm">Carregando eventos…</p>}>
        <ListaEventos />
      </Suspense>
    </main>
  );
}
