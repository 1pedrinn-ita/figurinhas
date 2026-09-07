// api/figurinha.js — Função serverless (Vercel, runtime Node).
// Recebe a foto + dados, chama o Google Gemini (gemini-2.5-flash-image)
// e devolve a figurinha gerada.
//
// Requer a variável de ambiente GEMINI_API_KEY (chave gratuita do Google AI Studio).

const MODELO = "gemini-2.5-flash-image";
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/" + MODELO + ":generateContent";

const CORES = {
  "verde-amarelo": "green and yellow",
  "vermelho": "red",
  "azul": "blue",
  "verde-azul": "green and blue",
};

async function lerCorpo(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body) return JSON.parse(req.body);
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function dataUrlParaPartes(dataUrl) {
  const m = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/s.exec(dataUrl || "");
  if (!m) return null;
  return { mime: m[1], data: m[2] };
}

function montarPrompt({ nome, numero, tema }) {
  const cor = CORES[tema] || "green and yellow";
  return [
    "Turn the person in this photo into a cute, friendly 3D Pixar-style caricature",
    "sticker for a Brazilian political campaign. Keep their recognizable face and hair.",
    "Big expressive smile, thumbs up, upper body, centered.",
    "Bold clean vector sticker look with a thick white outline on a plain white background.",
    `Campaign colors: ${cor}.`,
    `Show the name "${nome}" on a small banner and the big campaign number "${numero}".`,
    "High quality, single character. Output only the image.",
  ].join(" ");
}

// Extrai a primeira parte de imagem da resposta do Gemini.
function acharImagem(dados) {
  const cands = (dados && dados.candidates) || [];
  for (const c of cands) {
    const parts = (c && c.content && c.content.parts) || [];
    for (const p of parts) {
      const inl = p.inlineData || p.inline_data;
      if (inl && inl.data) return { data: inl.data, mime: inl.mimeType || inl.mime_type || "image/png" };
    }
  }
  return null;
}

// Descobre um motivo de bloqueio de segurança, se houver.
function motivoBloqueio(dados) {
  const pf = dados && dados.promptFeedback;
  if (pf && pf.blockReason) return pf.blockReason;
  const c = dados && dados.candidates && dados.candidates[0];
  if (c && c.finishReason && /SAFETY|BLOCK|PROHIBITED|RECITATION/i.test(c.finishReason)) return c.finishReason;
  return "";
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, erro: "Método não permitido." });
    return;
  }

  const chave = process.env.GEMINI_API_KEY;
  if (!chave) {
    res.status(500).json({ ok: false, erro: "Geração indisponível: chave do Gemini não configurada no servidor." });
    return;
  }

  let corpo;
  try {
    corpo = await lerCorpo(req);
  } catch {
    res.status(400).json({ ok: false, erro: "Requisição inválida." });
    return;
  }

  const { nome, numero, tema, fotoBase64 } = corpo || {};
  if (!nome || !numero || !fotoBase64) {
    res.status(400).json({ ok: false, erro: "Dados incompletos. Preencha nome, número e foto." });
    return;
  }

  const foto = dataUrlParaPartes(fotoBase64);
  if (!foto) {
    res.status(400).json({ ok: false, erro: "Foto em formato inválido." });
    return;
  }

  try {
    const payload = {
      contents: [
        {
          parts: [
            { text: montarPrompt({ nome, numero, tema }) },
            { inline_data: { mime_type: foto.mime, data: foto.data } },
          ],
        },
      ],
    };

    const resp = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": chave },
      body: JSON.stringify(payload),
    });

    const dados = await resp.json();

    if (!resp.ok) {
      const err = (dados && dados.error) || {};
      const msg = err.message || "";
      const status = err.status || "";
      console.error("Gemini erro:", resp.status, status, msg);
      const detalhe = `${resp.status} ${status} ${msg}`.trim();
      if (resp.status === 429 || /RESOURCE_EXHAUSTED|quota|rate/i.test(status + msg)) {
        res.status(502).json({ ok: false, erro: "Limite gratuito do dia atingido no Gemini. Tente mais tarde.", detalhe });
      } else if (resp.status === 400 && /API key|API_KEY|invalid/i.test(msg)) {
        res.status(502).json({ ok: false, erro: "Chave do Gemini inválida. Confira a variável GEMINI_API_KEY.", detalhe });
      } else if (resp.status === 403) {
        res.status(502).json({ ok: false, erro: "Acesso negado pelo Gemini. Confira a chave e as permissões.", detalhe });
      } else {
        res.status(502).json({ ok: false, erro: "A IA está instável agora. Tente de novo em instantes.", detalhe });
      }
      return;
    }

    const bloqueio = motivoBloqueio(dados);
    const img = acharImagem(dados);

    if (!img) {
      if (bloqueio) {
        res.status(422).json({ ok: false, erro: "A IA não aceitou essa imagem. Tente outra foto, de rosto nítido e de frente.", detalhe: bloqueio });
      } else {
        res.status(502).json({ ok: false, erro: "Não veio imagem da IA. Tente de novo.", detalhe: "sem parte de imagem na resposta" });
      }
      return;
    }

    res.status(200).json({ ok: true, imageBase64: img.data, mimeType: img.mime });
  } catch (e) {
    console.error("Falha ao gerar:", e);
    res.status(500).json({ ok: false, erro: "Erro interno ao gerar a figurinha." });
  }
};
