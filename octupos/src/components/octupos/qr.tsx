"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

/**
 * QR Code interno do ingresso. Aponta para a validação `/validar?codigo=<código>`
 * deste mesmo protótipo, que informa que o ingresso NÃO vale para entrada.
 */
export function QrDemonstrativo({ codigo, tamanho = 208 }: { codigo: string; tamanho?: number }) {
  const [imagem, setImagem] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    const conteudo = `${window.location.origin}/validar?codigo=${encodeURIComponent(codigo)}`;
    QRCode.toDataURL(conteudo, {
      width: tamanho * 2,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#1F2937", light: "#FFFFFF" },
    })
      .then((url) => {
        if (ativo) setImagem(url);
      })
      .catch(() => {
        if (ativo) setImagem(null);
      });
    return () => {
      ativo = false;
    };
  }, [codigo, tamanho]);

  return (
    <div
      className="flex items-center justify-center rounded-2xl border border-border bg-white p-2"
      style={{ width: tamanho + 16, height: tamanho + 16 }}
    >
      {imagem ? (
        // eslint-disable-next-line @next/next/no-img-element -- data URL gerada localmente
        <img
          src={imagem}
          width={tamanho}
          height={tamanho}
          alt={`QR Code demonstrativo do ingresso ${codigo}. Não vale para entrada.`}
        />
      ) : (
        <span className="text-xs text-ink-3">Gerando QR…</span>
      )}
    </div>
  );
}
