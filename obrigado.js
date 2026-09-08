/* obrigado.js — página de entrega. Lê o pack gerado no funil (localStorage),
   monta 9 stickers no navegador e permite instalar no WhatsApp, enviar e baixar. */
(function () {
  "use strict";

  var TEMA_COR = {
    "verde-amarelo": "#159A3C",
    "vermelho": "#C0122D",
    "azul": "#123B8F",
    "verde-azul": "#159A3C",
  };

  var base = localStorage.getItem("pack_base");
  var nome = (localStorage.getItem("pack_nome") || "").trim();
  var numero = (localStorage.getItem("pack_numero") || "").trim();
  var tema = localStorage.getItem("pack_tema") || "verde-amarelo";
  var cor = TEMA_COR[tema] || "#159A3C";

  var pronto = document.getElementById("pronto");
  var vazio = document.getElementById("vazio");

  if (!base) { vazio.hidden = false; return; }

  var LEGENDAS = [
    "BOM DIA", "BOA NOITE", "TAMO JUNTO",
    "TÔ COM VOCÊ", "VAMO JUNTOS", "CONTA COMIGO",
    "OBRIGADO", numero ? ("VOTE " + numero) : "EU APOIO", (nome ? nome.toUpperCase() : "É NÓIS"),
  ];

  var stickers = []; // canvases 512x512

  function tipoImagem() {
    try { return document.createElement("canvas").toDataURL("image/webp").indexOf("image/webp") === 5 ? "image/webp" : "image/png"; }
    catch (e) { return "image/png"; }
  }
  function canvasBlob(canvas, tipo, q) {
    return new Promise(function (res) { canvas.toBlob(function (b) { res(b); }, tipo, q); });
  }

  function desenharCover(ctx, img, size) {
    var s = Math.max(size / img.width, size / img.height);
    var w = img.width * s, h = img.height * s;
    ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
  }

  function faixa(ctx, texto, size) {
    var alturaF = 108, y = size - alturaF;
    // fundo da faixa
    ctx.fillStyle = cor;
    ctx.globalAlpha = 0.92;
    var raio = 26, x = 16, w = size - 32, h = 84, yy = size - h - 16;
    ctx.beginPath();
    ctx.moveTo(x + raio, yy);
    ctx.arcTo(x + w, yy, x + w, yy + h, raio);
    ctx.arcTo(x + w, yy + h, x, yy + h, raio);
    ctx.arcTo(x, yy + h, x, yy, raio);
    ctx.arcTo(x, yy, x + w, yy, raio);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    // texto
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    var fs = 56;
    do {
      ctx.font = "700 " + fs + 'px "Archivo Black","Arial Black",sans-serif';
      fs -= 2;
    } while (ctx.measureText(texto).width > w - 36 && fs > 20);
    ctx.fillText(texto, size / 2, yy + h / 2 + 2);
  }

  function montarStickers(img) {
    var grade = document.getElementById("grade");
    grade.innerHTML = "";
    for (var i = 0; i < 9; i++) {
      var c = document.createElement("canvas");
      c.width = 512; c.height = 512;
      var ctx = c.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, 512, 512);
      desenharCover(ctx, img, 512);
      faixa(ctx, LEGENDAS[i], 512);
      stickers.push(c);
      var cel = document.createElement("div");
      cel.className = "celula";
      var q = document.createElement("div");
      q.className = "quadro";
      q.appendChild(c);
      cel.appendChild(q);
      grade.appendChild(cel);
    }
    pronto.hidden = false;
  }

  function baixarBlob(blob, nomeArq) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = nomeArq;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function nota(msg) { var el = document.getElementById("nota"); el.textContent = msg || ""; }
  function erro(msg) { var el = document.getElementById("erro"); el.textContent = msg || ""; el.hidden = !msg; }

  // ── Instalar: monta o .wastickers ──
  async function instalar() {
    var btn = document.getElementById("btn-instalar");
    btn.disabled = true; nota("Montando o pacote…");
    try {
      if (typeof JSZip === "undefined") throw new Error("zip indisponível");
      var tipo = tipoImagem();
      var ext = tipo === "image/webp" ? "webp" : "png";
      var zip = new JSZip();
      zip.file("author.txt", "figurinhas-eleicoes2026");
      zip.file("title.txt", (nome || "Figurinhas") + (numero ? " " + numero : ""));
      // cover 96x96
      var cover = document.createElement("canvas"); cover.width = 96; cover.height = 96;
      cover.getContext("2d").drawImage(stickers[0], 0, 0, 96, 96);
      var coverBlob = await canvasBlob(cover, "image/png", 0.9);
      zip.file("cover.png", coverBlob);
      var t0 = Date.now();
      for (var i = 0; i < stickers.length; i++) {
        var b = await canvasBlob(stickers[i], tipo, 0.9);
        zip.file((t0 + i) + "." + ext, b);
      }
      var out = await zip.generateAsync({ type: "blob" });
      baixarBlob(out, "figurinhas.wastickers");
      nota("Baixou! Abra o arquivo para adicionar no WhatsApp.");
    } catch (e) {
      erro("Não conseguimos montar o pacote. Use Baixar as 9 e adicione por um app de figurinhas.");
    }
    btn.disabled = false;
  }

  // ── Enviar: compartilhamento nativo (abre o WhatsApp no celular) ──
  async function enviar() {
    nota("Preparando para enviar…");
    try {
      var arquivos = [];
      for (var i = 0; i < stickers.length; i++) {
        var b = await canvasBlob(stickers[i], "image/png", 0.92);
        arquivos.push(new File([b], "figurinha-" + (i + 1) + ".png", { type: "image/png" }));
      }
      if (navigator.canShare && navigator.canShare({ files: arquivos })) {
        await navigator.share({ files: arquivos, title: "Minhas figurinhas", text: "Minhas figurinhas das Eleições 2026" });
        nota("");
      } else {
        nota("Seu aparelho não permite enviar direto daqui. Baixe as 9 e compartilhe no WhatsApp.");
      }
    } catch (e) {
      nota("");
    }
  }

  // ── Baixar: zip com as 9 em PNG ──
  async function baixar() {
    var btn = document.getElementById("btn-baixar");
    btn.disabled = true; nota("Preparando o download…");
    try {
      if (typeof JSZip === "undefined") throw new Error("zip");
      var zip = new JSZip();
      for (var i = 0; i < stickers.length; i++) {
        var b = await canvasBlob(stickers[i], "image/png", 0.92);
        zip.file("figurinha-" + (i + 1) + ".png", b);
      }
      var out = await zip.generateAsync({ type: "blob" });
      baixarBlob(out, "figurinhas.zip");
      nota("");
    } catch (e) {
      erro("Não conseguimos preparar o download. Tente de novo.");
    }
    btn.disabled = false;
  }

  var img = new Image();
  img.onload = function () {
    montarStickers(img);
    document.getElementById("btn-instalar").addEventListener("click", instalar);
    document.getElementById("btn-enviar").addEventListener("click", enviar);
    document.getElementById("btn-baixar").addEventListener("click", baixar);
  };
  img.onerror = function () { vazio.hidden = false; };
  img.src = base;
})();
