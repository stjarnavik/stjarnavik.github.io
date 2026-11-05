/* Stjarnavík v0. Os dados vêm de dados/moradores.js (gerado por scripts/site_dados.py a partir do MORADORES.md). */
(function () {
  "use strict";

  var D = window.DADOS;
  var PATENTES = ["karl", "drengr", "húskarl", "hersir", "jarl"];
  var ESTADO = {
    "bem": ["bem", "Bem de saúde"],
    "febre": ["febre", "Com febre"],
    "partiu": ["partiu", "Partiu"],
    "a-confirmar": ["a-confirmar", "A confirmar"]
  };

  // ---------- texto na fonte de pixel própria (5x7, a mesma dos Reels) ----------
  function semAcento(ch) {
    return ch.normalize("NFD").replace(/[̀-ͯ]/g, "");
  }
  function pxTexto(canvas, texto, escala, cor) {
    texto = texto.toUpperCase();
    var letras = Array.from(texto).map(function (ch) {
      if (window.FONTE[ch]) return ch;
      var b = semAcento(ch);
      return window.FONTE[b] ? b : " ";
    });
    var temAcima = letras.some(function (ch) { return window.FONTE_ACIMA[ch]; });
    var topo = temAcima ? 2 : 0;
    var larg = letras.length * 6 - 1;
    canvas.width = larg * escala;
    var baixo = letras.indexOf("Ç") !== -1 ? 2 : 0;  // a cedilha desce 2 linhas
    canvas.height = (7 + topo + baixo) * escala;
    canvas.style.width = canvas.width + "px";
    canvas.style.height = canvas.height + "px";
    var c = canvas.getContext("2d");
    c.fillStyle = cor;
    letras.forEach(function (ch, i) {
      var linhas = window.FONTE[ch];
      var y0 = topo - (window.FONTE_ACIMA[ch] || 0);
      linhas.forEach(function (linha, r) {
        for (var k = 0; k < linha.length; k++) {
          if (linha[k] === "#") c.fillRect((i * 6 + k) * escala, (y0 + r) * escala, escala, escala);
        }
      });
    });
    canvas.setAttribute("aria-hidden", "true");
    return canvas;
  }
  function novoPx(texto, escala, cor) {
    return pxTexto(document.createElement("canvas"), texto, escala, cor || "#e9eff3");
  }
  // nome em várias palavras: um canvas por palavra, para quebrar a linha sem cortar
  function pxPalavras(texto, escala, cor) {
    var box = document.createElement("span");
    box.className = "px-palavras";
    texto.split(/\s+/).forEach(function (p) { box.appendChild(novoPx(p, escala, cor)); });
    return box;
  }
  document.querySelectorAll("canvas.px").forEach(function (cv) {
    var esc = +cv.dataset.escala || 3;
    if (window.innerWidth < 420 && esc > 2) esc -= 1;  // celular: letra um pouco menor
    pxTexto(cv, cv.dataset.px, esc, cv.dataset.cor || "#e9eff3");
  });

  // ---------- contagem ----------
  var todos = D.moradores;
  var fundadores = todos.filter(function (m) { return m.fundador; });
  var esperando = todos.filter(function (m) { return m.estado === "a-confirmar"; });
  var faltam = D.vagas_fundadores - fundadores.length;
  document.getElementById("contagem").textContent =
    fundadores.length + " fundadores na ilha" +
    (esperando.length ? " · " + esperando.length + " esperando no píer" : "") +
    (faltam > 0 ? " · faltam " + faltam + " vagas na pedra" : " · a pedra está completa");
  document.getElementById("vagas").textContent =
    fundadores.length + " de " + D.vagas_fundadores + " nomes gravados." + (faltam > 0 ? " Faltam " + faltam + "." : "");

  // ---------- "i" ao lado do nome (5/11, noite) ----------
  // O nome fica como a pessoa comentou. O "i" mostra uma ideia de nome nórdico parecido;
  // só troca quem pedir nos comentários do Instagram. Nós nunca trocamos sozinhos.
  var dica = document.getElementById("dica");
  var dicaCorpo = document.getElementById("dica-corpo");
  function textoDica(m) {
    var f = dicaCorpo;
    f.innerHTML = "";
    var h = el("h3", null, "Sobre o nome " + m.nome);
    h.id = "dica-titulo";
    f.appendChild(h);
    f.appendChild(el("p", null, "Na ilha você aparece com o nome do jeito que comentou."));
    if (m.sugestao_porque === "deus") {
      f.appendChild(el("p", null, "Odin é nome de deus. Na saga, ele é um velho de um olho só que diz ser Odin. Ninguém sabe se é verdade."));
    } else if (m.sugestao_porque === "ja") {
      f.appendChild(el("p", null, "Seu nome já é nórdico. Não precisa de mais nada."));
    } else if (!m.sugestao) {
      f.appendChild(el("p", null, "Seu nome já soa como um nome do norte."));
    } else {
      var p = el("p", null, "Se quiser um nome nórdico, uma ideia parecida é ");
      p.appendChild(el("b", "ouro", m.sugestao));
      p.appendChild(document.createTextNode(" (" + m.sugestao_porque + ")."));
      f.appendChild(p);
    }
    var q = el("p", null, "Quer trocar? Comente no Reel mais novo do ");
    q.appendChild(el("b", "ouro", "@stjarnavik"));
    q.appendChild(document.createTextNode(m.sugestao ? ": \u201cquero ser " + m.sugestao + "\u201d (ou outro nome). Se não comentar, nada muda." :
                                           " com o nome que você quer. Se não comentar, nada muda."));
    f.appendChild(q);
  }
  function botaoInfo(m) {
    var b = el("button", "info", "i");
    b.type = "button";
    b.setAttribute("aria-label", "Sobre o nome " + m.nome);
    b.title = "Sobre o nome";
    b.addEventListener("click", function (e) {
      e.stopPropagation();
      textoDica(m);
      if (typeof dica.showModal === "function") dica.showModal(); else dica.setAttribute("open", "");
    });
    return b;
  }
  dica.addEventListener("click", function (e) { if (e.target === dica) dica.close(); });

  // ---------- ficha ----------
  var dialogo = document.getElementById("ficha");
  var corpo = document.getElementById("ficha-corpo");

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  function chao(m) {
    var c = el("div", "chao");
    var img = el("img");
    img.src = "img/m/" + m.id + ".png";
    img.alt = "";
    img.width = 39; img.height = 57;
    c.appendChild(img);
    return c;
  }
  function selo(m) {
    var s = ESTADO[m.estado] || ESTADO.bem;
    return el("span", "selo " + s[0], s[1]);
  }
  function linha(dl, rotulo, valor) {
    dl.appendChild(el("dt", null, rotulo));
    var dd = el("dd");
    if (typeof valor === "string") dd.textContent = valor; else dd.appendChild(valor);
    dl.appendChild(dd);
  }

  function abrir(m) {
    corpo.innerHTML = "";
    var topo = el("div", "ficha-topo");
    topo.appendChild(chao(m));
    var lado = el("div");
    var nome = el("div", "nome");
    nome.id = "ficha-nome";
    nome.setAttribute("aria-label", m.nome);
    nome.appendChild(pxPalavras(m.nome, 3, "#f0c45a"));
    if (m.sugestao || m.sugestao_porque === "deus") nome.appendChild(botaoInfo(m));   // nome já nórdico não precisa do i
    lado.appendChild(nome);
    lado.appendChild(el("div", null, m.fundador ? "Fundador nº " + m.fundador : "Pediu para embarcar"));
    lado.appendChild(selo(m));
    topo.appendChild(lado);
    corpo.appendChild(topo);

    var dl = el("dl");
    linha(dl, "Profissão", m.profissao);
    var escada = el("div", "escada");
    PATENTES.forEach(function (p) { escada.appendChild(el("span", p === m.patente ? "aqui" : "", p)); });
    linha(dl, "Patente", escada);
    var mem = el("span");
    var pts = el("span", "runas");
    for (var i = 0; i < 3; i++) { pts.appendChild(el(i < m.memorias ? "b" : "i")); }
    mem.appendChild(pts);
    mem.appendChild(document.createTextNode(m.memorias + " de 3 recuperadas"));
    linha(dl, "Memórias", mem);
    linha(dl, "Chegada", m.chegada);
    corpo.appendChild(dl);
    if (m.estado === "a-confirmar") {
      corpo.appendChild(el("p", "nota", "Este pedido ainda está sendo conferido. Se for confirmado, o nome vai para a pedra."));
    } else if (m.nota) {
      corpo.appendChild(el("p", "nota", m.nota));
    }
    if (typeof dialogo.showModal === "function") dialogo.showModal(); else dialogo.setAttribute("open", "");
  }
  dialogo.addEventListener("click", function (e) { if (e.target === dialogo) dialogo.close(); });

  // ---------- mapa navegável (6/11): mundo grande, bárbaros de 51 px, bichos, baleias e névoa que esconde o resto ----------
  var M = D.mapa;
  var mapa = document.getElementById("mapa");
  var parado = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var cv = el("canvas", "mapa-vivo");
  cv.tabIndex = 0;
  cv.setAttribute("role", "img");
  cv.setAttribute("aria-label", "Mapa da ilha de Stjarnavík. Arraste para navegar; use + e − para aproximar. A lista de moradores está logo abaixo.");
  var ctx = cv.getContext("2d");
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var vw = 0, vh = 0;
  var R = M.revelado;
  var cam = { x: R.cx, y: R.cy, s: 0.5 }, vel = { x: 0, y: 0 };

  function carregar(src) { var i = new Image(); i.src = src; return i; }
  // 5/11, noite: mundo gigante. O chão é desenhado no navegador, em pedaços (js/mundo.js).
  var mundo = window.criarMundo(M, carregar);
  var objImgs = mundo.objImgs;
  var bichoImgs = {};
  Object.keys(M.bichos_img).forEach(function (k) { bichoImgs[k] = carregar("img/b/" + k + ".png"); });

  function iso(u, v, z) { return [M.ox + (u - v) * M.tw, M.oy + (u + v) * M.th - (z || 0)]; }
  function sortear(a, b) { return a + Math.random() * (b - a); }
  function zona(u, v) {
    var a = Math.floor(u), b = Math.floor(v);
    if (a < 0 || b < 0 || a >= M.G || b >= M.G) return "0";
    return M.zonas[a][b];
  }
  function nivelZ(u, v) { return M.z[mundo.nivel(Math.floor(u), Math.floor(v))]; }

  // ---- quem anda: colonos e bichos de terra, com a mesma regra de passo suave ----
  var C = M.colono;
  var andantes = [];
  var vivos = todos.map(function (m) {
    var c = m.mapa.casa;
    var v = { m: m, u: c.x, v: c.y, z: c.z, casa: c, pier: !!c.pier, raio: 2.4, vel: 0.55, pode: "1",
              alvo: null, rapidez: 0, espera: sortear(0, 4), fase: 0, esq: Math.random() < 0.5, resp: Math.random() * 3,
              img: carregar("img/m/" + m.id + "-anda.png"),
              nome: novoPx(m.nome, 1, m.estado === "a-confirmar" ? "#f0c45a" : "#f4efe4") };
    andantes.push(v);
    return v;
  });
  var bichos = M.bichos.map(function (b) {
    var o = { b: b, tipo: b.tipo, info: M.bichos_img[b.tipo], img: bichoImgs[b.tipo], fase: Math.random() * 10,
              esq: Math.random() < 0.5, espera: sortear(0, 5), alvo: null, rapidez: 0, quadroFixo: 0 };
    if (b.u != null) {
      o.u = b.u; o.v = b.v; o.z = b.z != null ? b.z : nivelZ(b.u, b.v);
      o.casa = { x: b.u, y: b.v }; o.raio = b.raio || 0; o.vel = b.vel || 0; o.pode = "2";   // so longe da vila
      if (o.vel) andantes.push(o);
    }
    return o;
  });
  // bandos: renas e bois andam em manada, lobos em alcateia atras do lider
  bichos.forEach(function (o) {
    if (o.u == null || !o.vel || o.tipo === "raposa" || o.tipo === "lebre") return;
    var lider = bichos.filter(function (l) { return l.tipo === o.tipo && l.lider === undefined && l.u != null && Math.hypot(l.u - o.u, l.v - o.v) < 6; })[0];
    if (lider && lider !== o) o.lider = lider;
  });
  var EVITAR = [M.pedra];
  function livre(a, u, v) {
    if (a.pier) return !andantes.some(function (o) { return o !== a && o.pier && Math.abs(o.u - u) < 0.7; });
    if (a.pode.indexOf(zona(u, v)) < 0) return false;
    if (EVITAR.some(function (p) { return Math.hypot(p[0] - u, p[1] - v) < 1.1; })) return false;
    return !andantes.some(function (o) { return o !== a && !o.pier && Math.hypot(o.u - u, o.v - v) < 0.6; });
  }
  function novoAlvo(a) {
    for (var k = 0; k < 10; k++) {
      var u, v;
      if (a.pier) { u = Math.min(M.pier.u0 + M.pier.comp - 0.3, Math.max(M.pier.u0 + 0.6, a.u + sortear(-1.2, 1.2))); v = M.pier.v + sortear(-0.15, 0.15); }
      else if (a.lider) { u = a.lider.u + sortear(-1.8, 1.8); v = a.lider.v + sortear(-1.8, 1.8); }
      else { u = a.casa.x + sortear(-a.raio, a.raio); v = a.casa.y + sortear(-a.raio, a.raio); }
      if (livre(a, u, v)) return [u, v];
    }
    return null;
  }
  function mover(a, dt) {
    if (!a.alvo) {
      a.rapidez = 0;
      a.espera -= dt;
      if (a.espera <= 0) {
        a.alvo = novoAlvo(a);
        // cada bicho tem seu jeito: lebre congela e dispara, lobo nao para muito, manada pasta devagar
        a.espera = a.tipo === "lebre" ? sortear(3, 9) : a.tipo === "lobo" ? sortear(0.5, 2.5) : a.lider ? sortear(0.6, 3) : sortear(2, 7);
      }
      return;
    }
    var du = a.alvo[0] - a.u, dv = a.alvo[1] - a.v, d = Math.hypot(du, dv);
    var topo = Math.min(a.vel, d * 1.6);
    a.rapidez += (topo - a.rapidez) * Math.min(1, dt * 5);
    var passo = Math.min(d, a.rapidez * dt);
    var antes = iso(a.u, a.v)[0];
    var nu = a.u + du / (d || 1) * passo, nv = a.v + dv / (d || 1) * passo;
    if (!a.pier && a.pode.indexOf(zona(nu, nv)) < 0) { a.alvo = null; return; }
    a.u = nu; a.v = nv;
    if (!a.pier) a.z = nivelZ(a.u, a.v);
    a.fase += passo;
    var depois = iso(a.u, a.v)[0];
    if (Math.abs(depois - antes) > 1e-4) a.esq = depois < antes;
    if (d < 0.02) { a.alvo = null; a.fase = 0; }
  }
  function quadroColono(v, t) {
    if (!v.alvo || v.rapidez < 0.05) return Math.floor(t / 700 + v.resp) % 2;   // respirando
    return 2 + Math.floor(v.fase / 0.11) % 6;
  }
  function quadroBicho(o, t) {
    var n = o.info.n, andando = o.alvo && o.rapidez > 0.05;
    if (o.tipo === "rena" || o.tipo === "boi") return andando ? Math.floor(o.fase / (o.tipo === "boi" ? 0.16 : 0.12)) % 4 : (Math.floor(t / 2600 + o.fase) % 3 === 0 ? 1 : 4);
    if (o.tipo === "lobo") return andando ? Math.floor(o.fase / 0.1) % 4 : 4;
    if (o.tipo === "raposa") return andando ? Math.floor(o.fase / 0.1) % 4 : 1;
    if (o.tipo === "lebre") return andando ? [0, 1, 2][Math.floor(o.fase / 0.12) % 3] : 0;
    if (o.tipo === "foca") return Math.floor(t / 1900 + o.fase) % 4 === 0 ? 1 : 0;
    if (o.tipo === "corvo" || o.tipo === "gaivota") return [0, 1, 2, 1][Math.floor(t / 110 + o.fase) % 4];
    return 0;
  }
  function desenharTira(img, q, w, h, x0, y0, virar) {
    if (!img.complete || !img.naturalWidth) return;
    if (virar) { ctx.save(); ctx.translate(x0 + w, y0); ctx.scale(-1, 1); ctx.drawImage(img, q * w, 0, w, h, 0, 0, w, h); ctx.restore(); }
    else ctx.drawImage(img, q * w, 0, w, h, x0, y0, w, h);
  }

  // ---- névoa (5/11, noite): pintada no tamanho da tela, 8x menor, para valer num mundo gigante ----
  var K = 8;
  var nv = document.createElement("canvas"), nctx = nv.getContext("2d");
  var bolhas = [];
  for (var bb = 0; bb < 320; bb++) bolhas.push({ x: Math.random() * M.largura, y: Math.random() * M.altura, r: sortear(260, 900),
                                               v: sortear(10, 30), claro: Math.random() < 0.6 });
  function nevoa(t) {
    var w = Math.ceil(vw / K), h = Math.ceil(vh / K);
    if (nv.width !== w || nv.height !== h) { nv.width = w; nv.height = h; }
    nctx.setTransform(1, 0, 0, 1, 0, 0);
    nctx.globalCompositeOperation = "source-over";
    nctx.clearRect(0, 0, w, h);
    nctx.fillStyle = "rgba(206,214,226,0.7)";
    nctx.fillRect(0, 0, w, h);
    var k = cam.s / K;
    nctx.setTransform(k, 0, 0, k, (vw / 2 - cam.x * cam.s) / K, (vh / 2 - cam.y * cam.s) / K);
    nctx.globalCompositeOperation = "destination-out";
    nctx.save();
    var resp = 1 + 0.02 * Math.sin(t / 2300);
    nctx.translate(R.cx, R.cy); nctx.scale(R.rx / R.ry * resp, resp);
    var g = nctx.createRadialGradient(0, 0, 0, 0, 0, R.ry * 1.25);
    g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(0.62, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)");
    nctx.fillStyle = g; nctx.beginPath(); nctx.arc(0, 0, R.ry * 1.25, 0, Math.PI * 2); nctx.fill();
    nctx.restore();
    nctx.globalCompositeOperation = "source-over";
    var x0 = cam.x - vw / 2 / cam.s, x1 = cam.x + vw / 2 / cam.s, y0 = cam.y - vh / 2 / cam.s, y1 = cam.y + vh / 2 / cam.s;
    bolhas.forEach(function (p) {
      var x = (p.x + t / 1000 * p.v) % (M.largura + 2 * p.r) - p.r;
      if (x + p.r < x0 || x - p.r > x1 || p.y + p.r < y0 || p.y - p.r > y1) return;
      var dentro = Math.hypot((x - R.cx) / R.rx, (p.y - R.cy) / R.ry) < 0.8;
      var a = dentro ? 0.08 : (p.claro ? 0.32 : 0.2);
      var gg = nctx.createRadialGradient(x, p.y, 0, x, p.y, p.r);
      gg.addColorStop(0, p.claro ? "rgba(236,242,248," + a + ")" : "rgba(150,166,190," + a + ")");
      gg.addColorStop(1, "rgba(220,228,238,0)");
      nctx.fillStyle = gg; nctx.beginPath(); nctx.arc(x, p.y, p.r, 0, Math.PI * 2); nctx.fill();
    });
    // a borda do mundo some numa névoa fechada: nunca se vê onde o mapa acaba
    var f = 2600, L = M.largura, A = M.altura;
    [[0, 0, f, 0, 0, 0, f, A], [L, 0, L - f, 0, L - f, 0, f, A], [0, 0, 0, f, 0, 0, L, f], [0, A, 0, A - f, 0, A - f, L, f]].forEach(function (b) {
      var gb = nctx.createLinearGradient(b[0], b[1], b[2], b[3]);
      gb.addColorStop(0, "rgba(206,214,226,1)"); gb.addColorStop(1, "rgba(206,214,226,0)");
      nctx.fillStyle = gb; nctx.fillRect(b[4], b[5], b[6], b[7]);
    });
  }
  function naNevoa(wx, wy) { return Math.hypot((wx - R.cx) / R.rx, (wy - R.cy) / R.ry) > 0.95; }

  var flocos = [];
  for (var f = 0; f < 90; f++) flocos.push({ x: Math.random(), y: Math.random(), v: sortear(18, 40), f: Math.random() * 6, r: sortear(1, 2.2) });

  // ---- câmera ----
  var SMAX = 3;
  function limites() {
    var sMin = Math.max(vw / M.largura, vh / M.altura, 0.05);
    cam.s = Math.max(sMin, Math.min(SMAX, cam.s));
    var mx = vw / 2 / cam.s, my = vh / 2 / cam.s;
    cam.x = Math.max(mx, Math.min(M.largura - mx, cam.x));
    cam.y = Math.max(my, Math.min(M.altura - my, cam.y));
  }
  function paraMundo(px, py) { return [cam.x + (px - vw / 2) / cam.s, cam.y + (py - vh / 2) / cam.s]; }
  function zoomEm(px, py, fator) {
    var w = paraMundo(px, py);
    cam.s *= fator; limites();
    cam.x = w[0] - (px - vw / 2) / cam.s; cam.y = w[1] - (py - vh / 2) / cam.s; limites();
  }
  var alvoCam = null;
  function irPara(x, y, s) { alvoCam = { x: x, y: y, s: s }; }
  // começa olhando a vila (perto); o botão ⌂ volta para cá
  function inicio() {
    var p = iso(M.pedra[0] + 2, M.pedra[1] + 2, M.z[2]);
    return { x: p[0], y: p[1], s: Math.max(0.7, Math.min(vw / 1300, vh / 800, 1.2)) };
  }

  function medir() {
    var r = cv.getBoundingClientRect();
    vw = r.width; vh = r.height;
    cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr);
    limites();
  }

  function baleia(o, t) {
    // sobe, solta o jato e mergulha, num ciclo de 16 s
    var b = o.b, inf = o.info, ciclo = ((t / 1000 + o.fase * 3) % 16) / 16;
    if (ciclo > 0.45) return;
    var sobe = Math.sin(ciclo / 0.45 * Math.PI);
    var h = Math.round(inf.h * sobe), x0 = b.x - inf.pe[0], y0 = b.y - h;
    if (h > 0 && o.img.complete) ctx.drawImage(o.img, 0, 0, inf.w, h, x0, y0, inf.w, h);
    ctx.fillStyle = "rgba(196,222,236,0.9)";
    ctx.fillRect(b.x - inf.w / 2 - 4, b.y - 1, inf.w + 8, 2);
    if (ciclo > 0.12 && ciclo < 0.3) {
      var k = (ciclo - 0.12) / 0.18;
      ctx.fillStyle = "rgba(236,244,252," + (1 - k) + ")";
      for (var i = 0; i < 7; i++) {
        var ang = -Math.PI / 2 + (i - 3) * 0.22;
        var d = 10 + k * 34;
        ctx.fillRect(Math.round(b.x - 8 + Math.cos(ang) * d * 0.6), Math.round(y0 - 4 + Math.sin(ang) * d), 3, 3);
      }
    }
  }

  var hover = null;
  function desenhar(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#1a3654";
    ctx.fillRect(0, 0, cv.width, cv.height);
    var k = dpr * cam.s;
    ctx.setTransform(k, 0, 0, k, dpr * (vw / 2 - cam.x * cam.s), dpr * (vh / 2 - cam.y * cam.s));
    var liso = cam.s < 1;   // longe: reduz com suavização; perto: pixel nítido
    ctx.imageSmoothingEnabled = liso;
    if (liso) ctx.imageSmoothingQuality = "high";
    var x0 = cam.x - vw / 2 / cam.s, y0 = cam.y - vh / 2 / cam.s, x1 = cam.x + vw / 2 / cam.s, y1 = cam.y + vh / 2 / cam.s;
    var sx = Math.max(0, Math.floor(x0)), sy = Math.max(0, Math.floor(y0));
    var sw = Math.min(M.largura, Math.ceil(x1)) - sx, sh = Math.min(M.altura, Math.ceil(y1)) - sy;
    mundo.chao(ctx, x0, y0, x1, y1, cam.s, arrastando || alvoCam ? 6 : 12);
    ctx.imageSmoothingEnabled = liso;
    var M0 = 300;
    function ve(x, y) { return x > x0 - M0 && x < x1 + M0 && y > y0 - M0 && y < y1 + M0; }
    bichos.forEach(function (o) { if (o.tipo === "baleia" && ve(o.b.x, o.b.y)) baleia(o, t); });
    var longe = cam.s < mundo.MEDIO;   // de longe, árvores e lugares já estão no desenho do mundo
    if (!longe) M.lugares.forEach(function (l) {
      var im = objImgs[l.img];
      if (im.complete && im.naturalWidth && ve(l.x, l.y)) ctx.drawImage(im, l.x - l.ax, l.y - l.ay);
    });
    // tudo o que fica em pé, em ordem de profundidade (só o que aparece na tela)
    var fila = [];
    if (!longe) M.objetos.forEach(function (o) { if (ve(o.x, o.y)) fila.push({ p: o.prof, o: o }); });
    vivos.forEach(function (v) { fila.push({ p: v.u + v.v, v: v }); });
    bichos.forEach(function (o) { if (o.u != null) fila.push({ p: o.u + o.v, b: o }); });
    fila.sort(function (a, b) { return a.p - b.p; });
    fila.forEach(function (item) {
      if (item.o) {
        var o = item.o, im = objImgs[o.img];
        if (im.complete && im.naturalWidth) ctx.drawImage(im, o.x - o.ax, o.y - o.ay);
        return;
      }
      if (item.v) {
        var v = item.v, p = iso(v.u, v.v, v.z);
        ctx.fillStyle = "rgba(40,60,96,0.22)";
        ctx.beginPath(); ctx.ellipse(p[0] + 1, p[1], 11, 3.2, 0, 0, Math.PI * 2); ctx.fill();
        desenharTira(v.img, quadroColono(v, t), C.w, C.h, Math.round(p[0] - C.pe[0]), Math.round(p[1] - C.pe[1]), v.esq);
        return;
      }
      var b = item.b, inf = b.info, q = quadroBicho(b, t), pb = iso(b.u, b.v, b.z);
      ctx.fillStyle = "rgba(40,60,96,0.2)";
      ctx.beginPath(); ctx.ellipse(pb[0], pb[1], inf.w * 0.32, 3, 0, 0, Math.PI * 2); ctx.fill();
      desenharTira(b.img, q, inf.w, inf.h, Math.round(pb[0] - inf.pe[0]), Math.round(pb[1] - inf.pe[1]), b.esq);
    });
    // aves voando por cima de tudo
    bichos.forEach(function (o) {
      if (o.tipo !== "corvo" && o.tipo !== "gaivota") return;
      var b = o.b, inf = o.info, a = t / 1000 * b.vel + b.fase;
      var x = b.x + Math.cos(a) * b.raio, y = b.y + Math.sin(a) * b.raio * 0.5;
      desenharTira(o.img, quadroBicho(o, t), inf.w, inf.h, Math.round(x - inf.pe[0]), Math.round(y - inf.pe[1]), Math.sin(a) > 0);
    });
    // névoa por cima do mundo (em pixels de tela)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    if (nv.width && nv.height) ctx.drawImage(nv, 0, 0, nv.width * K, nv.height * K);
    // neve caindo e nomes, em pixels de tela
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    if (!parado) {
      ctx.fillStyle = "rgba(250,252,255,0.85)";
      flocos.forEach(function (fl) { ctx.fillRect(Math.round(fl.x * vw), Math.round(fl.y * vh), fl.r, fl.r); });
    }
    var E = 2;
    vivos.forEach(function (v) {
      if (v !== hover && cam.s < 1.1) return;
      var p = iso(v.u, v.v, v.z), n = v.nome;
      var sx = vw / 2 + (p[0] - cam.x) * cam.s, sy = vh / 2 + (p[1] - C.pe[1] - cam.y) * cam.s;
      var w = n.width * E, h = n.height * E;
      var lx = Math.round(sx - w / 2), ly = Math.round(sy - h - 8);
      ctx.fillStyle = "rgba(22,26,36,0.86)";
      ctx.fillRect(lx - 4, ly - 4, w + 8, h + 8);
      ctx.fillStyle = "#5a687c"; ctx.fillRect(lx - 4, ly - 4, w + 8, 2);
      ctx.drawImage(n, lx, ly, w, h);
    });
  }

  var ponteiros = {}, arrastando = false, inicioToque = null, distPinca = 0, ultimoMov = null;
  var ultimo = performance.now(), visivel = true;
  function quadro(t) {
    var dt = Math.min((t - ultimo) / 1000, 0.05);
    ultimo = t;
    if (!parado) {
      andantes.forEach(function (a) { mover(a, dt); });
      flocos.forEach(function (fl) {
        fl.y += fl.v * dt / Math.max(vh, 1); fl.x += Math.sin(t / 900 + fl.f) * 6 * dt / Math.max(vw, 1);
        if (fl.y > 1) { fl.y = 0; fl.x = Math.random(); }
      });
    }
    if (alvoCam) {
      var a = Math.min(1, dt * 6);
      cam.x += (alvoCam.x - cam.x) * a; cam.y += (alvoCam.y - cam.y) * a; cam.s += (alvoCam.s - cam.s) * a;
      limites();
      if (Math.abs(alvoCam.s - cam.s) < 0.002 && Math.hypot(alvoCam.x - cam.x, alvoCam.y - cam.y) < 0.5) alvoCam = null;
    } else if (!arrastando && (vel.x || vel.y)) {
      cam.x -= vel.x * dt / cam.s; cam.y -= vel.y * dt / cam.s; limites();
      var atrito = Math.pow(0.04, dt);
      vel.x *= atrito; vel.y *= atrito;
      if (Math.hypot(vel.x, vel.y) < 8) vel.x = vel.y = 0;
    }
    nevoa(parado ? 0 : t);
    desenhar(parado ? 0 : t);
    if (visivel) requestAnimationFrame(quadro);
  }

  function local(e) { var r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  function colonoEm(px, py) {
    var w = paraMundo(px, py), achado = null, prof = -1e9;
    var folga = Math.max(0, 8 / cam.s - 8);   // mais fácil de tocar quando o mapa está longe
    vivos.forEach(function (v) {
      var p = iso(v.u, v.v, v.z);
      if (w[0] > p[0] - 12 - folga && w[0] < p[0] + 12 + folga && w[1] > p[1] - C.pe[1] + 4 - folga && w[1] < p[1] + 2 + folga
          && v.u + v.v > prof) { achado = v; prof = v.u + v.v; }
    });
    return achado;
  }
  cv.addEventListener("pointerdown", function (e) {
    cv.setPointerCapture(e.pointerId);
    ponteiros[e.pointerId] = local(e);
    alvoCam = null; vel.x = vel.y = 0;
    var ids = Object.keys(ponteiros);
    if (ids.length === 1) { arrastando = true; inicioToque = { p: local(e), t: performance.now(), moveu: 0 }; ultimoMov = { p: local(e), t: performance.now() }; }
    if (ids.length === 2) { var a = ponteiros[ids[0]], b = ponteiros[ids[1]]; distPinca = Math.hypot(a[0] - b[0], a[1] - b[1]); inicioToque = null; }
  });
  cv.addEventListener("pointermove", function (e) {
    var p = local(e);
    if (!ponteiros[e.pointerId]) {
      hover = colonoEm(p[0], p[1]);
      cv.style.cursor = hover ? "pointer" : "grab";
      return;
    }
    var antes = ponteiros[e.pointerId];
    ponteiros[e.pointerId] = p;
    var ids = Object.keys(ponteiros);
    if (ids.length === 2) {
      var a = ponteiros[ids[0]], b = ponteiros[ids[1]], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (distPinca) zoomEm((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, d / distPinca);
      distPinca = d;
      return;
    }
    var dx = p[0] - antes[0], dy = p[1] - antes[1];
    cam.x -= dx / cam.s; cam.y -= dy / cam.s; limites();
    if (inicioToque) inicioToque.moveu += Math.abs(dx) + Math.abs(dy);
    var agora = performance.now(), dtm = Math.max(1, agora - ultimoMov.t);
    vel.x = 0.8 * vel.x + 0.2 * (dx / dtm * 1000); vel.y = 0.8 * vel.y + 0.2 * (dy / dtm * 1000);
    ultimoMov = { p: p, t: agora };
    cv.style.cursor = "grabbing";
  });
  function soltar(e) {
    var p = local(e);
    delete ponteiros[e.pointerId];
    if (Object.keys(ponteiros).length === 0) {
      arrastando = false;
      if (performance.now() - (ultimoMov ? ultimoMov.t : 0) > 80) vel.x = vel.y = 0;
      if (inicioToque && inicioToque.moveu < 8 && performance.now() - inicioToque.t < 500) {
        vel.x = vel.y = 0;
        var v = colonoEm(p[0], p[1]);
        var w = paraMundo(p[0], p[1]);
        if (v) abrir(v.m);
        else if (naNevoa(w[0], w[1])) aviso("A névoa esconde o que existe aqui. Ninguém foi até lá… ainda.");
      }
      inicioToque = null;
    }
    distPinca = 0;
  }
  cv.addEventListener("pointerup", soltar);
  cv.addEventListener("pointercancel", soltar);
  cv.addEventListener("pointerleave", function () { hover = null; });
  cv.addEventListener("wheel", function (e) {
    e.preventDefault();
    alvoCam = null;
    var p = local(e);
    zoomEm(p[0], p[1], Math.exp(-e.deltaY * 0.0015));
  }, { passive: false });
  cv.addEventListener("keydown", function (e) {
    var passo = 60 / cam.s;
    if (e.key === "ArrowLeft") cam.x -= passo; else if (e.key === "ArrowRight") cam.x += passo;
    else if (e.key === "ArrowUp") cam.y -= passo; else if (e.key === "ArrowDown") cam.y += passo;
    else if (e.key === "+" || e.key === "=") irPara(cam.x, cam.y, cam.s * 1.4);
    else if (e.key === "-") irPara(cam.x, cam.y, cam.s / 1.4);
    else return;
    e.preventDefault(); limites();
  });

  var balao = el("div", "aviso");
  var tempoAviso;
  function aviso(txt) {
    balao.textContent = txt; balao.classList.add("ver");
    clearTimeout(tempoAviso); tempoAviso = setTimeout(function () { balao.classList.remove("ver"); }, 2600);
  }
  var ctr = el("div", "controles");
  function zoomBotao(f) { var a = alvoCam || cam; irPara(a.x, a.y, a.s * f); }
  [["+", "Aproximar", function () { zoomBotao(1.5); }],
   ["−", "Afastar", function () { zoomBotao(1 / 1.5); }],
   ["⌂", "Voltar para a ilha", function () { var i = inicio(); irPara(i.x, i.y, i.s); }]].forEach(function (c) {
    var bt = el("button", null, c[0]); bt.type = "button"; bt.setAttribute("aria-label", c[1]); bt.title = c[1];
    bt.addEventListener("click", c[2]); ctr.appendChild(bt);
  });

  mapa.innerHTML = "";
  mapa.appendChild(cv); mapa.appendChild(ctr); mapa.appendChild(balao);
  medir();
  var i0 = inicio(); cam.x = i0.x; cam.y = i0.y; cam.s = i0.s; limites();
  window.addEventListener("resize", function () { medir(); });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      var antes = visivel; visivel = es[0].isIntersecting;
      if (visivel && !antes) { ultimo = performance.now(); requestAnimationFrame(quadro); }
    }).observe(cv);
  }
  requestAnimationFrame(quadro);

  // a pedra cresce em pixels inteiros (2x) quando cabe; senão ocupa a largura toda
  function escalar() {
    var caixa = document.querySelector(".pedra-img");
    caixa.style.width = "";
    var k = Math.floor(caixa.parentElement.clientWidth / 216);
    caixa.style.width = k >= 2 ? "432px" : "100%";
  }
  window.addEventListener("resize", escalar);
  escalar();

  // ---------- cards ----------
  var cards = document.getElementById("cards");
  var ordem = fundadores.concat(esperando);
  ordem.forEach(function (m) {
    var c = el("div", "card " + (m.estado === "a-confirmar" ? "a-confirmar" : ""));
    c.dataset.busca = semAcento(m.nome + " " + (m.sugestao || "")).toLowerCase();
    var abre = el("button", "card-abrir");
    abre.type = "button";
    c.appendChild(abre);
    c.appendChild(chao(m));
    var info = el("div");
    var nome = el("div", "nome");
    nome.appendChild(pxPalavras(m.nome, 2, "#f0c45a"));
    if (m.sugestao || m.sugestao_porque === "deus") nome.appendChild(botaoInfo(m));   // nome já nórdico não precisa do i
    info.appendChild(nome);
    info.appendChild(el("p", "meta", (m.fundador ? "Fundador nº " + m.fundador : "Pediu para embarcar") + " · " + m.patente));
    if (m.nota && m.estado !== "a-confirmar") info.appendChild(el("p", "legenda", m.nota));
    info.appendChild(selo(m));
    c.appendChild(info);
    abre.setAttribute("aria-label", "Abrir a ficha de " + m.nome);
    abre.addEventListener("click", function () { abrir(m); });
    cards.appendChild(c);
  });

  // ---------- busca pelo nome viking ----------
  // (Depois do n8n: o @ digitado vira hash SHA-256 no navegador e é comparado com m.hash_arroba. O @ nunca é guardado.)
  var busca = document.getElementById("busca");
  var nada = document.getElementById("nada");
  busca.addEventListener("input", function () {
    var q = semAcento(busca.value.trim()).toLowerCase();
    var vistos = 0;
    cards.querySelectorAll(".card").forEach(function (c) {
      var ok = !q || c.dataset.busca.indexOf(q) !== -1;
      c.hidden = !ok;
      if (ok) vistos++;
    });
    nada.hidden = vistos > 0;
  });

  var partiram = todos.filter(function (m) { return m.estado === "partiu"; });
  if (partiram.length) {
    document.getElementById("salao").textContent = partiram.map(function (m) { return m.nome; }).join(" · ");
  }
})();
