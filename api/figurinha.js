// api/figurinha.js — Função serverless (Vercel, runtime Node).
// Recebe a foto + dados, chama a OpenAI (gpt-image-1) e devolve a figurinha.
//
// Requer a variável de ambiente OPENAI_API_KEY definida na Vercel.

const OPENAI_URL = "https://api.openai.com/v1/images/edits";
const MODELO = "gpt-image-1";

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

function dataUrlParaBuffer(dataUrl) {
  const m = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/s.exec(dataUrl || "");
  if (!m) return null;
  const mime = m[1];
  const ext = mime.split("/")[1].replace("jpeg", "jpg");
  return { buffer: Buffer.from(m[2], "base64"), mime, ext };
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
    "High quality, single character.",
  ].join(" ");
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, erro: "Método não permitido." });
    return;
  }

  const chave = process.env.OPENAI_API_KEY;
  if (!chave) {
    res.status(500).json({ ok: false, erro: "Geração indisponível: chave da OpenAI não configurada no servidor." });
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

  const foto = dataUrlParaBuffer(fotoBase64);
  if (!foto) {
    res.status(400).json({ ok: false, erro: "Foto em formato inválido." });
    return;
  }

  try {
    const form = new FormData();
    form.append("model", MODELO);
    form.append("prompt", montarPrompt({ nome, numero, tema }));
    form.append("size", "1024x1024");
    form.append("n", "1");
    form.append("quality", "medium");
    form.append("image", new Blob([foto.buffer], { type: foto.mime }), `foto.${foto.ext}`);

    const resp = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${chave}` },
      body: form,
    });

    const dados = await resp.json();

    if (!resp.ok) {
      const msg = (dados && dados.error && dados.error.message) || "";
      const code = (dados && dados.error && dados.error.code) || "";
      console.error("OpenAI erro:", resp.status, code, msg);
      // `detalhe` ajuda no diagnóstico; a mensagem amigável fica em `erro`.
      const detalhe = `${resp.status} ${code} ${msg}`.trim();
      if (/safety|moderation|content[_ ]policy|rejected/i.test(msg)) {
        res.status(422).json({ ok: false, erro: "A IA não aceitou essa imagem. Tente outra foto, de rosto nítido e de frente.", detalhe });
      } else if (resp.status === 401) {
        res.status(502).json({ ok: false, erro: "Chave da OpenAI inválida. Confira a variável OPENAI_API_KEY.", detalhe });
      } else if (resp.status === 429 || /quota|billing|insufficient/i.test(msg)) {
        res.status(502).json({ ok: false, erro: "Sem crédito ou limite atingido na OpenAI. Confira o faturamento da conta.", detalhe });
      } else if (/must be verified|verify organization|organization must/i.test(msg)) {
        res.status(502).json({ ok: false, erro: "A organização precisa ser verificada na OpenAI para usar o gpt-image-1.", detalhe });
      } else {
        res.status(502).json({ ok: false, erro: "A IA está instável agora. Tente de novo em instantes.", detalhe });
      }
      return;
    }

    const b64 = dados && dados.data && dados.data[0] && dados.data[0].b64_json;
    if (!b64) {
      res.status(502).json({ ok: false, erro: "Não veio imagem da IA. Tente de novo." });
      return;
    }

    res.status(200).json({ ok: true, imageBase64: b64, mimeType: "image/png" });
  } catch (e) {
    console.error("Falha ao gerar:", e);
    res.status(500).json({ ok: false, erro: "Erro interno ao gerar a figurinha." });
  }
};
