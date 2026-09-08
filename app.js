/* app.js — funil interativo + geração por IA, sobreposto ao front original.
   Não altera o visual da página: injeta um overlay e liga os botões. */
(function () {
  "use strict";

  // ─── Configuração do checkout (única fonte de verdade) ────────────────────
  var CHECKOUT_URL = "https://ambieenteseguro.org.ua/c/bf3e75f7b8";
  var FORWARD_PARAMS = [
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
    "fbclid", "gclid", "ttclid", "src", "sck",
  ];

  var estado = { nome: "", numero: "", tema: "", fotoBase64: "" };

  // ─── Estilos do overlay (usa as fontes/cores do próprio site) ─────────────
  var css = `
  .fx-ov{position:fixed;inset:0;z-index:9999;display:none;align-items:flex-start;justify-content:center;
    background:rgba(0,0,0,.55);overflow-y:auto;padding:0;font-family:var(--font-corpo,"Barlow",system-ui,sans-serif)}
  .fx-ov.aberto{display:flex}
  .fx-sheet{background:#fff;width:100%;max-width:460px;min-height:100dvh;padding:22px 20px 40px;
    display:flex;flex-direction:column;gap:2px;animation:fxSobe .3s ease both}
  @keyframes fxSobe{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
  .fx-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
  .fx-fechar{background:none;border:none;font-size:26px;line-height:1;color:#8a8f8a;cursor:pointer;padding:4px}
  .fx-prog{display:flex;justify-content:space-between;font-family:var(--font-titulo,"Archivo Black",sans-serif);
    font-size:.72rem;letter-spacing:.08em;color:#8a8f8a;margin-bottom:6px}
  .fx-barra{height:6px;background:#e7e7dd;border-radius:99px;overflow:hidden;margin-bottom:20px}
  .fx-barra > i{display:block;height:100%;background:#1f2a2e;border-radius:99px;transition:width .3s ease}
  .fx-passo{display:none;flex-direction:column}
  .fx-passo.on{display:flex}
  .fx-emoji{font-size:2rem;text-align:center}
  .fx-h{font-family:var(--font-titulo,"Archivo Black",sans-serif);font-size:1.55rem;line-height:1.05;
    text-align:center;margin:4px 0 4px;color:#1a1c1a}
  .fx-sub{text-align:center;color:#6b6f6b;margin:0 0 18px;font-family:var(--font-papernotes,var(--font-corpo));font-size:1.1rem}
  .fx-rot{display:block;font-family:var(--font-titulo,sans-serif);font-size:.72rem;letter-spacing:.1em;
    color:#8a8f8a;margin:14px 0 7px}
  .fx-campo{width:100%;border:1.5px solid #e4e4da;border-radius:14px;padding:14px 16px;font-size:1.05rem;
    font-family:inherit;background:#fafaf6;outline:none;box-sizing:border-box}
  .fx-campo:focus{border-color:#1f2a2e;background:#fff}
  .fx-foto{display:flex;flex-direction:column;align-items:center;gap:4px;border:1.5px dashed #c8c8bc;
    border-radius:16px;padding:22px;cursor:pointer;background:#fafaf6}
  .fx-foto strong{font-family:var(--font-titulo,sans-serif);font-size:.8rem;letter-spacing:.06em}
  .fx-foto small{color:#6b6f6b}
  .fx-foto-ic{font-size:1.6rem}
  .fx-prev{display:flex;flex-direction:column;align-items:center;gap:8px}
  .fx-prev img{width:130px;height:130px;object-fit:cover;border-radius:16px;border:2px solid #e4e4da}
  .fx-link{background:none;border:none;color:#159a3c;font-weight:600;cursor:pointer;font-family:inherit}
  .fx-cores{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .fx-cor{border:2px solid #e4e4da;border-radius:14px;padding:13px 10px 13px 40px;background:#fff;
    font-family:inherit;font-weight:600;text-align:left;cursor:pointer;position:relative}
  .fx-cor::before{content:"";position:absolute;left:12px;top:50%;transform:translateY(-50%);width:20px;height:20px;
    border-radius:50%;background:linear-gradient(135deg,var(--c1) 50%,var(--c2) 50%)}
  .fx-cor.sel{border-color:#1f2a2e;box-shadow:0 0 0 3px rgba(31,42,46,.12)}
  .fx-btn{display:block;width:100%;border:none;border-radius:16px;padding:16px 20px;
    font-family:var(--font-titulo,"Archivo Black",sans-serif);font-size:1.05rem;letter-spacing:.02em;
    cursor:pointer;background:#1f2a2e;color:#fff;margin-top:18px}
  .fx-btn:active{transform:scale(.99)}
  .fx-voltar{display:block;margin:12px auto 0;background:none;border:none;color:#8a8f8a;
    font-family:inherit;font-size:.95rem;cursor:pointer}
  .fx-nota{text-align:center;color:#6b6f6b;font-size:.9rem;margin:10px 0 0}
  .fx-erro{background:rgba(192,18,45,.06);border:1px solid rgba(192,18,45,.25);color:#c0122d;
    border-radius:12px;padding:10px 12px;font-size:.9rem;margin:14px 0 0}
  .fx-spin{width:46px;height:46px;margin:16px auto;border:5px solid #e7e7dd;border-top-color:#1f2a2e;
    border-radius:50%;animation:fxGira 1s linear infinite}
  @keyframes fxGira{to{transform:rotate(360deg)}}
  .fx-selo{align-self:center;background:#fff;border:1px solid #e4e4da;border-radius:99px;padding:5px 14px;
    font-size:12px;color:#159a3c;font-weight:600;margin-bottom:12px}
  .fx-res-wrap{position:relative;border-radius:20px;overflow:hidden;border:1px solid #e4e4da;background:#fff;margin:6px 0 8px}
  .fx-res-wrap img{display:block;width:100%}
  .fx-marca{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;transform:rotate(-24deg);
    font-family:var(--font-titulo,"Archivo Black",sans-serif);font-size:1.05rem;letter-spacing:.18em;
    color:rgba(255,255,255,.55);text-shadow:0 1px 4px rgba(0,0,0,.4);pointer-events:none;line-height:3.4;text-align:center;white-space:pre-wrap}
  .fx-preco{text-align:center;margin:16px 0}
  .fx-preco s{color:#8a8f8a}
  .fx-preco b{display:block;font-family:var(--font-titulo,"Archivo Black",sans-serif);font-size:2.4rem;color:#159a3c;font-weight:400}
  .fx-center{text-align:center}
  `;

  // ─── Markup do overlay ────────────────────────────────────────────────────
  var html = `
  <div class="fx-sheet" role="dialog" aria-modal="true">
    <div class="fx-top">
      <div class="fx-prog"><span id="fx-passo-txt">PASSO 1 DE 3</span></div>
      <button class="fx-fechar" id="fx-fechar" aria-label="Fechar">×</button>
    </div>
    <div class="fx-barra"><i id="fx-barra-i" style="width:33%"></i></div>

    <section class="fx-passo on" data-p="quem">
      <div class="fx-emoji">🎨</div>
      <h2 class="fx-h">QUEM VAI VIRAR FIGURINHA?</h2>
      <p class="fx-sub">Pode ser você… ou o seu candidato 😊</p>
      <label class="fx-rot" for="fx-nome">NOME QUE VAI NA FIGURINHA</label>
      <input id="fx-nome" class="fx-campo" type="text" maxlength="24" placeholder="Ex: Zé da Silva" autocomplete="off" />
      <span class="fx-rot">FOTO DO ROSTO</span>
      <label class="fx-foto" id="fx-foto-label">
        <input id="fx-foto" type="file" accept="image/*" hidden />
        <span class="fx-foto-ic">🖼️</span><strong>ENVIAR FOTO</strong><small>Do rosto, de frente</small>
      </label>
      <div class="fx-prev" id="fx-prev" hidden>
        <img id="fx-prev-img" alt="Prévia da foto" />
        <button type="button" class="fx-link" id="fx-trocar">Trocar foto</button>
      </div>
      <p class="fx-erro" id="fx-erro-1" hidden></p>
      <button class="fx-btn" id="fx-continuar">CONTINUAR →</button>
    </section>

    <section class="fx-passo" data-p="cor">
      <div class="fx-emoji">🎯</div>
      <h2 class="fx-h">COR E NÚMERO</h2>
      <p class="fx-sub">Escolha a cor e digite o número da campanha</p>
      <span class="fx-rot">COR DA CAMPANHA</span>
      <div class="fx-cores" id="fx-cores">
        <button type="button" class="fx-cor" data-tema="verde-amarelo" style="--c1:#159A3C;--c2:#F4C500">Verde e amarelo</button>
        <button type="button" class="fx-cor" data-tema="vermelho" style="--c1:#C0122D;--c2:#7A0A1C">Vermelho</button>
        <button type="button" class="fx-cor" data-tema="azul" style="--c1:#123B8F;--c2:#0A2456">Azul</button>
        <button type="button" class="fx-cor" data-tema="verde-azul" style="--c1:#159A3C;--c2:#123B8F">Verde e azul</button>
      </div>
      <label class="fx-rot" for="fx-numero">NÚMERO NA FIGURINHA</label>
      <input id="fx-numero" class="fx-campo" type="text" inputmode="numeric" maxlength="6" placeholder="Ex: 12123" autocomplete="off" />
      <p class="fx-erro" id="fx-erro-2" hidden></p>
      <button class="fx-btn" id="fx-gerar">GERAR MINHAS FIGURINHAS 🚀</button>
      <button class="fx-voltar" data-volta="quem">← voltar</button>
    </section>

    <section class="fx-passo fx-center" data-p="gerando">
      <div class="fx-spin"></div>
      <h2 class="fx-h">GERANDO SUAS FIGURINHAS</h2>
      <p class="fx-sub">Nossa IA está desenhando… leva alguns segundos.</p>
    </section>

    <section class="fx-passo fx-center" data-p="resultado">
      <span class="fx-selo">Pack pronto</span>
      <h2 class="fx-h">ELEITO! 🎉</h2>
      <p class="fx-sub">Suas 9 figurinhas estão prontas!</p>
      <div class="fx-res-wrap"><img id="fx-res-img" alt="Prévia das figurinhas" /><div class="fx-marca">AMOSTRA · AMOSTRA · AMOSTRA</div></div>
      <p class="fx-nota">Prévia com marca d'água · o pack final vem limpo e em alta.</p>
      <div class="fx-preco"><span>de <s>R$ 29,90</s> por</span><b>R$ 7,90</b></div>
      <button class="fx-btn" id="fx-comprar">QUERO MINHAS FIGURINHAS</button>
      <p class="fx-nota">🔒 Pagamento seguro · Pix aprovado na hora · Entrega imediata</p>
      <button class="fx-voltar" data-volta="quem">← criar outra</button>
    </section>

    <section class="fx-passo fx-center" data-p="erro">
      <div class="fx-emoji">😅</div>
      <h2 class="fx-h">OPS!</h2>
      <p class="fx-sub" id="fx-erro-txt">Não conseguimos gerar agora. Tente de novo.</p>
      <button class="fx-btn" data-volta="cor">TENTAR NOVAMENTE</button>
    </section>
  </div>`;

  // ─── Monta o overlay no DOM ─────────────────────────────────────────────────
  var ov, sheet;
  function montar() {
    var style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
    ov = document.createElement("div");
    ov.className = "fx-ov";
    ov.innerHTML = html;
    document.body.appendChild(ov);
    sheet = ov.querySelector(".fx-sheet");
    ligarEventos();
  }

  var PROG = { quem: ["PASSO 1 DE 3", "33%"], cor: ["PASSO 2 DE 3", "66%"], gerando: ["", "90%"], resultado: ["", "100%"], erro: ["", "100%"] };
  function irPara(p) {
    ov.querySelectorAll(".fx-passo").forEach(function (s) { s.classList.toggle("on", s.dataset.p === p); });
    var info = PROG[p] || ["", "100%"];
    ov.querySelector("#fx-passo-txt").textContent = info[0];
    ov.querySelector("#fx-barra-i").style.width = info[1];
    if (sheet) sheet.scrollTop = 0;
  }
  function abrir() { ov.classList.add("aberto"); document.body.style.overflow = "hidden"; irPara("quem"); }
  function fechar() { ov.classList.remove("aberto"); document.body.style.overflow = ""; }

  function erro(id, msg) { var el = ov.querySelector("#" + id); if (el) { el.textContent = msg; el.hidden = !msg; } }

  function lerFoto(file, max) {
    max = max || 1024;
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        var w = img.width, h = img.height;
        if (w > h && w > max) { h = Math.round(h * max / w); w = max; }
        else if (h > max) { w = Math.round(w * max / h); h = max; }
        var c = document.createElement("canvas"); c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = function () { reject(new Error("Não conseguimos ler essa foto.")); };
      img.src = URL.createObjectURL(file);
    });
  }

  function ligarEventos() {
    ov.addEventListener("click", function (e) { if (e.target === ov) fechar(); });
    ov.querySelector("#fx-fechar").addEventListener("click", fechar);
    ov.querySelectorAll("[data-volta]").forEach(function (b) {
      b.addEventListener("click", function () { irPara(b.dataset.volta); });
    });

    var inFoto = ov.querySelector("#fx-foto");
    inFoto.addEventListener("change", function () {
      var f = inFoto.files && inFoto.files[0];
      if (!f) return;
      lerFoto(f).then(function (data) {
        estado.fotoBase64 = data;
        ov.querySelector("#fx-prev-img").src = data;
        ov.querySelector("#fx-foto-label").hidden = true;
        ov.querySelector("#fx-prev").hidden = false;
        erro("fx-erro-1", "");
      }).catch(function (err) { erro("fx-erro-1", err.message); });
    });
    ov.querySelector("#fx-trocar").addEventListener("click", function () {
      estado.fotoBase64 = ""; inFoto.value = "";
      ov.querySelector("#fx-foto-label").hidden = false;
      ov.querySelector("#fx-prev").hidden = true;
    });

    ov.querySelector("#fx-continuar").addEventListener("click", function () {
      var nome = ov.querySelector("#fx-nome").value.trim();
      if (!nome) return erro("fx-erro-1", "Digite o nome que vai na figurinha.");
      if (!estado.fotoBase64) return erro("fx-erro-1", "Envie uma foto do rosto, de frente.");
      estado.nome = nome; erro("fx-erro-1", ""); irPara("cor");
    });

    ov.querySelectorAll("#fx-cores .fx-cor").forEach(function (b) {
      b.addEventListener("click", function () {
        ov.querySelectorAll("#fx-cores .fx-cor").forEach(function (x) { x.classList.remove("sel"); });
        b.classList.add("sel"); estado.tema = b.dataset.tema;
      });
    });

    ov.querySelector("#fx-gerar").addEventListener("click", function () {
      var numero = ov.querySelector("#fx-numero").value.replace(/\D/g, "");
      if (!estado.tema) return erro("fx-erro-2", "Escolha uma cor para a campanha.");
      if (!numero) return erro("fx-erro-2", "Digite o número da campanha.");
      estado.numero = numero; erro("fx-erro-2", ""); gerar();
    });

    ov.querySelector("#fx-comprar").addEventListener("click", function () {
      window.location.href = urlCheckout();
    });
  }

  function gerar() {
    irPara("gerando");
    fetch("/api/figurinha", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: estado.nome, numero: estado.numero, tema: estado.tema, fotoBase64: estado.fotoBase64 }),
    }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (res.ok && res.d.ok && res.d.imageBase64) {
          var dataUrl = "data:" + (res.d.mimeType || "image/png") + ";base64," + res.d.imageBase64;
          ov.querySelector("#fx-res-img").src = dataUrl;
          // Guarda o pack para a página de entrega (/obrigado) ler depois do pagamento.
          try {
            localStorage.setItem("pack_base", dataUrl);
            localStorage.setItem("pack_nome", estado.nome);
            localStorage.setItem("pack_numero", estado.numero);
            localStorage.setItem("pack_tema", estado.tema);
          } catch (e) {}
          irPara("resultado");
        } else {
          erro("fx-erro-txt", (res.d && res.d.erro) || "Não conseguimos gerar agora. Tente de novo.");
          irPara("erro");
        }
      }).catch(function () {
        erro("fx-erro-txt", "Falha de conexão. Verifique a internet e tente de novo.");
        irPara("erro");
      });
  }

  function urlCheckout() {
    var url;
    try { url = new URL(CHECKOUT_URL, window.location.href); } catch (e) { return CHECKOUT_URL; }
    var atuais = new URLSearchParams(window.location.search);
    FORWARD_PARAMS.forEach(function (k) {
      var v = atuais.get(k);
      if (v && !url.searchParams.has(k)) url.searchParams.set(k, v);
    });
    return url.toString();
  }

  // ─── Liga os botões do site ao funil ────────────────────────────────────────
  var GATILHOS = /criar minhas figurinhas|quero minhas figurinhas|quero o meu|gerar minhas figurinhas|criar agora|come[çc]ar/i;
  function ligarGatilhos() {
    var els = document.querySelectorAll("button, a, [role='button']");
    els.forEach(function (el) {
      if (el.closest(".fx-ov")) return;
      var txt = (el.textContent || "").trim();
      if (GATILHOS.test(txt)) {
        el.addEventListener("click", function (ev) { ev.preventDefault(); abrir(); });
      }
    });
  }

  function iniciar() { montar(); ligarGatilhos(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
