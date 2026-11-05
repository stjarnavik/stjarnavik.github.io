/* Stjarnavík: o chão do mundo gigante (5/11/2026, noite).
   O mundo tem 25440 x 19080 px. Uma imagem pronta desse tamanho não cabe no celular, então o chão
   é desenhado aqui, em pedaços de 512 px, só onde a câmera olha (e guardado enquanto for útil).
   Três níveis de detalhe:
     - longe (zoom < 0.18): o mundo inteiro numa tela 8x menor;
     - médio (zoom < 0.6): a ilha principal numa tela 2x menor, montada aos poucos;
     - perto: os pedaços em tamanho real, pixel a pixel.
   Mesma arte do gerador em Python (hd_mundo.py): blocos isométricos 2:1, neve, cascalho, rocha com estratos,
   água rasa em faixas, banquisas, píer, trilha e troncos. */
(function () {
  "use strict";

  function rgb(c) { return (255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0]; }
  function css(c) { return "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")"; }
  function mulberry(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function hash(x, y) { var h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return h - Math.floor(h); }

  var C = {
    MAR_FUNDO: [26, 54, 84], MAR: [36, 74, 108], RASO: [[84, 150, 178], [64, 124, 158], [50, 102, 138]],
    ESPUMA: [196, 222, 236], NEVE: [234, 240, 245], NEVE_2: [222, 231, 239], NEVE_SOMBRA: [196, 210, 226],
    NEVE_BRILHO: [252, 253, 255], CASCALHO: [[92, 92, 100], [118, 116, 120], [146, 142, 140]],
    ROCHA_E: [[84, 90, 108], [108, 114, 130], [134, 140, 154]], ROCHA_D: [[56, 60, 80], [72, 78, 98], [92, 98, 118]],
    MADEIRA: [[70, 46, 30], [102, 70, 44], [134, 96, 60]], GELO: [178, 208, 230], GELO_C: [214, 232, 246],
    GELO_E: [156, 190, 216], PINGENTE: [210, 226, 240], PINGENTE_P: [240, 248, 255]
  };
  var U = {};
  Object.keys(C).forEach(function (k) {
    U[k] = Array.isArray(C[k][0]) ? C[k].map(rgb) : rgb(C[k]);
  });

  function criarRuido(semente) {
    var r = mulberry(semente * 7919 + 1), termos = [];
    for (var k = 0; k < 5; k++) {
      var f = 0.004 * Math.pow(1.9, k), a = r() * 6.3;
      termos.push([f * Math.cos(a), f * Math.sin(a) * 1.7, r() * 6.3, 1 / Math.pow(1.6, k)]);
    }
    return function (x, y) {
      var s = 0;
      for (var i = 0; i < 5; i++) { var t = termos[i]; s += Math.sin(x * t[0] + y * t[1] + t[2]) * t[3]; }
      return s;
    };
  }
  var R11 = criarRuido(11), R2 = criarRuido(2), R9 = criarRuido(9), R3 = criarRuido(3), R5 = criarRuido(5);

  window.criarMundo = function (M, carregar) {
    var TW = M.tw, TH = M.th, OX = M.ox, OY = M.oy, Z = M.z, W = M.largura, H = M.altura;
    function iso(u, v, z) { return [OX + (u - v) * TW, OY + (u + v) * TH - (z || 0)]; }

    // ---------- terreno numa grade (0 mar, 1 praia, 2 neve, 3 morro, 4 topo, 5 lago congelado) ----------
    var umin = 1e9, umax = -1e9, vmin = 1e9, vmax = -1e9;
    M.faixas.forEach(function (f) {
      umin = Math.min(umin, f[0]); umax = Math.max(umax, f[0]);
      vmin = Math.min(vmin, f[1]); vmax = Math.max(vmax, f[1] + f[2].length - 1);
    });
    umin -= 6; vmin -= 6; umax += 6; vmax += 6;
    var NU = umax - umin + 1, NV = vmax - vmin + 1;
    var nvG = new Uint8Array(NU * NV), costa = new Uint8Array(NU * NV);
    M.faixas.forEach(function (f) {
      for (var k = 0; k < f[2].length; k++) {
        var ch = f[2][k];
        nvG[(f[0] - umin) * NV + (f[1] + k - vmin)] = ch === "L" ? 5 : +ch;
      }
    });
    function cel(u, v) {
      var a = u - umin, b = v - vmin;
      if (a < 0 || b < 0 || a >= NU || b >= NV) return 0;
      return nvG[a * NV + b];
    }
    function nivel(u, v) { var n = cel(u, v); return n === 5 ? 2 : n; }
    // distância (em ladrilhos, até 4) de cada ladrilho até a terra mais perto: acelera a água rasa
    for (var i = 0; i < costa.length; i++) costa[i] = nvG[i] ? 0 : 4;
    for (var it = 0; it < 3; it++) {
      var antes = costa.slice();
      for (var a = 1; a < NU - 1; a++) for (var b = 1; b < NV - 1; b++) {
        var k = a * NV + b, m = antes[k];
        for (var da = -1; da <= 1; da++) for (var db = -1; db <= 1; db++) m = Math.min(m, antes[k + da * NV + db] + 1);
        costa[k] = m;
      }
    }
    function perto(u, v) {
      var a = u - umin, b = v - vmin;
      if (a < 0 || b < 0 || a >= NU || b >= NV) return 4;
      return costa[a * NV + b];
    }

    // ---------- formas que não são ladrilho (geradas uma vez, em coordenadas do mundo) ----------
    var antesDaTerra = [], depoisDaTerra = [];
    function caixa(f) {
      if (f.t === "poli") {
        var xs = f.p.map(function (p) { return p[0]; }), ys = f.p.map(function (p) { return p[1]; });
        f.b = [Math.min.apply(null, xs), Math.min.apply(null, ys), Math.max.apply(null, xs), Math.max.apply(null, ys)];
      } else if (f.t === "linha") {
        var e = f.e;
        f.b = [Math.min(f.x0, f.x1) - e, Math.min(f.y0, f.y1) - e, Math.max(f.x0, f.x1) + e, Math.max(f.y0, f.y1) + e];
      } else f.b = [f.cx - f.rx, f.cy - f.ry, f.cx + f.rx, f.cy + f.ry];
      return f;
    }
    function poli(lista, p, c) { lista.push(caixa({ t: "poli", p: p, c: rgb(c) })); }
    function linha(lista, x0, y0, x1, y1, c, e) { lista.push(caixa({ t: "linha", x0: x0, y0: y0, x1: x1, y1: y1, c: rgb(c), e: e || 1 })); }
    function elipse(lista, cx, cy, rx, ry, c) { lista.push(caixa({ t: "elipse", cx: cx, cy: cy, rx: rx, ry: ry, c: rgb(c) })); }

    var R = M.revelado;
    // serra no fim do mundo (norte), sempre na névoa
    (function () {
      var r = mulberry(4), pts = [[0, 330]], x = 0;
      while (x < W) { x += 60 + r() * 100; pts.push([x, 40 + r() * 160]); }
      var picos = pts.slice(1);
      poli(antesDaTerra, pts.concat([[W, 330], [W, 0], [0, 0]]), [70, 84, 110]);
      picos.forEach(function (p) { poli(antesDaTerra, [[p[0] - 34, p[1] + 44], [p[0], p[1]], [p[0] + 30, p[1] + 40]], [210, 222, 236]); });
      poli(antesDaTerra, [[0, 300], [W, 300], [W, 340], [0, 340]], [56, 70, 96]);
    })();
    // banquisas: placas de gelo boiando longe da terra
    (function () {
      var r = mulberry(8), feitas = 0, tent = 0;
      while (feitas < 700 && tent < 20000) {
        tent++;
        var x = 40 + r() * (W - 80), y = 400 + r() * (H - 440);
        var a = (x - OX) / TW, b = (y - OY) / TH, u = (a + b) / 2, v = (b - a) / 2;
        if (perto(Math.floor(u), Math.floor(v)) < 4) continue;
        if (Math.hypot((x - R.cx) / R.rx, (y - R.cy) / R.ry) < 1 && r() < 0.6) continue;
        var rr = 14 + r() * 26, p = [];
        for (var k = 0; k < 8; k++) {
          var ang = k / 8 * Math.PI * 2;
          p.push([x + Math.cos(ang) * rr * (0.7 + r() * 0.45), y + Math.sin(ang) * rr * 0.5 * (0.7 + r() * 0.45)]);
        }
        poli(antesDaTerra, p.map(function (q) { return [q[0], q[1] + 3]; }), [150, 186, 214]);
        poli(antesDaTerra, p, [226, 238, 248]);
        poli(antesDaTerra, p.map(function (q) { return [q[0] * 0.6 + x * 0.4 - 2, q[1] * 0.6 + y * 0.4 - 1]; }), C.NEVE_BRILHO);
        feitas++;
      }
    })();
    // píer (o mesmo desenho do Python)
    (function () {
      var P = M.pier, z = P.z, u0 = P.u0, v = P.v, comp = P.comp;
      for (var k = 0; k <= Math.floor(comp); k++) [-0.45, 0.45].forEach(function (dv) {
        var p = iso(u0 + k, v + dv, z);
        linha(depoisDaTerra, p[0], p[1], p[0], p[1] + z + 10, C.MADEIRA[0], 4);
        linha(depoisDaTerra, p[0] - 1, p[1], p[0] - 1, p[1] + z + 6, C.MADEIRA[1], 1.2);
      });
      poli(depoisDaTerra, [iso(u0, v - 0.55, z), iso(u0 + comp, v - 0.55, z), iso(u0 + comp, v + 0.55, z), iso(u0, v + 0.55, z)], C.MADEIRA[1]);
      for (var t = 0; t < comp; t += 0.25) {
        var p = iso(u0 + t, v - 0.55, z), q = iso(u0 + t, v + 0.55, z);
        linha(depoisDaTerra, p[0], p[1], q[0], q[1], C.MADEIRA[0], 1);
      }
      var a = iso(u0, v + 0.55, z), b = iso(u0 + comp, v + 0.55, z);
      linha(depoisDaTerra, a[0], a[1] + 1, b[0], b[1] + 1, C.MADEIRA[0], 3);
      a = iso(u0, v - 0.55, z); b = iso(u0 + comp, v - 0.55, z);
      linha(depoisDaTerra, a[0], a[1], b[0], b[1], C.MADEIRA[2], 1.5);
      for (t = 0.3; t < comp; t += 0.9) { var n = iso(u0 + t, v - 0.2, z); elipse(depoisDaTerra, n[0], n[1], 9, 3, C.NEVE); }
    })();
    // troncos de deriva na praia
    M.troncos.forEach(function (tr) {
      var x = tr[0], y = tr[1], dx = tr[2], s = tr[3];
      linha(depoisDaTerra, x - dx, y - dx / 2 * s * 0.5, x + dx, y + dx * 0.25, C.MADEIRA[0], 6);
      linha(depoisDaTerra, x - dx, y - 1, x + dx, y + dx * 0.25 - 1, [150, 132, 112], 2);
    });
    // trilha pisada da pedra até o píer
    (function () {
      var r = mulberry(3), T = M.trilha;
      for (var k = 0; k < T.length - 1; k++) {
        var a = iso(T[k][0], T[k][1], Z[2]), b = iso(T[k + 1][0], T[k + 1][1], Z[2]);
        var n = Math.floor(Math.hypot(b[0] - a[0], b[1] - a[1]) / 6);
        for (var j = 0; j < n; j++) {
          var t = j / Math.max(n, 1), x = a[0] + (b[0] - a[0]) * t + (r() * 8 - 4), y = a[1] + (b[1] - a[1]) * t + (r() * 4 - 2);
          elipse(depoisDaTerra, x, y, 7, 3, C.NEVE_SOMBRA);
          elipse(depoisDaTerra, x + (r() * 6 - 3), y, 2, 1, [176, 192, 210]);
        }
      }
    })();
    // sombras dos objetos em pé
    M.objetos.forEach(function (o) {
      var r = (o.w || 40) * 0.42;
      elipse(depoisDaTerra, o.x + r * 0.25, o.y - 1, r, r * 0.32, C.NEVE_SOMBRA);
    });
    // índice das formas por pedaço, para não testar tudo em cada pedaço
    var CH = 512;
    function indexar(lista) {
      var idx = {};
      lista.forEach(function (f, n) {
        for (var i = Math.floor(f.b[0] / CH); i <= Math.floor(f.b[2] / CH); i++)
          for (var j = Math.floor(f.b[1] / CH); j <= Math.floor(f.b[3] / CH); j++) {
            var k = i + "," + j; (idx[k] || (idx[k] = [])).push(n);
          }
      });
      return idx;
    }
    var idxAntes = indexar(antesDaTerra), idxDepois = indexar(depoisDaTerra);

    // ---------- desenho num pedaço (buffer de pixels, sem suavização) ----------
    function Pedaco(i, j) {
      this.x0 = i * CH; this.y0 = j * CH;
      this.buf = new Uint32Array(CH * CH);
    }
    Pedaco.prototype.poli = function (pts, cor, fn) {
      var x0 = this.x0, y0 = this.y0, buf = this.buf, n = pts.length;
      var ymin = 1e9, ymax = -1e9;
      for (var k = 0; k < n; k++) { ymin = Math.min(ymin, pts[k][1]); ymax = Math.max(ymax, pts[k][1]); }
      var ya = Math.max(0, Math.floor(ymin - y0)), yb = Math.min(CH - 1, Math.ceil(ymax - y0));
      var xs = [];
      for (var py = ya; py <= yb; py++) {
        var yc = y0 + py + 0.5;
        xs.length = 0;
        for (k = 0; k < n; k++) {
          var p = pts[k], q = pts[(k + 1) % n];
          if (p[1] === q[1]) continue;
          if (yc >= Math.min(p[1], q[1]) && yc < Math.max(p[1], q[1])) xs.push(p[0] + (yc - p[1]) * (q[0] - p[0]) / (q[1] - p[1]));
        }
        if (xs.length < 2) continue;
        xs.sort(function (a, b) { return a - b; });
        for (var s = 0; s + 1 < xs.length; s += 2) {
          var xa = Math.max(0, Math.ceil(xs[s] - x0 - 0.5)), xb = Math.min(CH - 1, Math.ceil(xs[s + 1] - x0 - 0.5) - 1);
          var linhaBase = py * CH;
          if (fn) for (var px = xa; px <= xb; px++) buf[linhaBase + px] = fn(x0 + px + 0.5, yc);
          else for (px = xa; px <= xb; px++) buf[linhaBase + px] = cor;
        }
      }
    };
    Pedaco.prototype.linha = function (xa0, ya0, xa1, ya1, cor, esp) {
      var x0 = this.x0, y0 = this.y0, buf = this.buf, e = esp / 2;
      var bx0 = Math.max(0, Math.floor(Math.min(xa0, xa1) - esp - x0)), bx1 = Math.min(CH - 1, Math.ceil(Math.max(xa0, xa1) + esp - x0));
      var by0 = Math.max(0, Math.floor(Math.min(ya0, ya1) - esp - y0)), by1 = Math.min(CH - 1, Math.ceil(Math.max(ya0, ya1) + esp - y0));
      var dx = xa1 - xa0, dy = ya1 - ya0, L2 = dx * dx + dy * dy || 1e-6;
      for (var py = by0; py <= by1; py++) for (var px = bx0; px <= bx1; px++) {
        var x = x0 + px + 0.5, y = y0 + py + 0.5;
        var t = Math.max(0, Math.min(1, ((x - xa0) * dx + (y - ya0) * dy) / L2));
        var ex = x - (xa0 + t * dx), ey = y - (ya0 + t * dy);
        if (ex * ex + ey * ey <= e * e) buf[py * CH + px] = cor;
      }
    };
    Pedaco.prototype.elipse = function (cx, cy, rx, ry, cor) {
      var x0 = this.x0, y0 = this.y0, buf = this.buf;
      var bx0 = Math.max(0, Math.floor(cx - rx - x0)), bx1 = Math.min(CH - 1, Math.ceil(cx + rx - x0));
      var by0 = Math.max(0, Math.floor(cy - ry - y0)), by1 = Math.min(CH - 1, Math.ceil(cy + ry - y0));
      for (var py = by0; py <= by1; py++) for (var px = bx0; px <= bx1; px++) {
        var a = (x0 + px + 0.5 - cx) / Math.max(rx, 0.01), b = (y0 + py + 0.5 - cy) / Math.max(ry, 0.01);
        if (a * a + b * b <= 1) buf[py * CH + px] = cor;
      }
    };
    Pedaco.prototype.forma = function (f) {
      if (f.t === "poli") this.poli(f.p, f.c);
      else if (f.t === "linha") this.linha(f.x0, f.y0, f.x1, f.y1, f.c, f.e);
      else this.elipse(f.cx, f.cy, f.rx, f.ry, f.c);
    };

    function agua(P) {
      var buf = P.buf, CX = M.centro[0], CY = M.centro[1];
      for (var py = 0; py < CH; py++) {
        var y = P.y0 + py + 0.5;
        for (var px = 0; px < CH; px++) {
          var x = P.x0 + px + 0.5;
          var a = (x - OX) / TW, b = (y - OY) / TH, u = (a + b) / 2, v = (b - a) / 2;
          var iu = Math.floor(u), iv = Math.floor(v), d = 99;
          if (perto(iu, iv) < 4) {
            for (var ta = iu - 3; ta <= iu + 3; ta++) for (var tb = iv - 3; tb <= iv + 3; tb++) {
              if (!cel(ta, tb)) continue;
              var du = Math.max(ta - u, u - (ta + 1), 0), dv = Math.max(tb - v, v - (tb + 1), 0);
              var dd = Math.sqrt(du * du + dv * dv);
              if (dd < d) d = dd;
            }
          }
          var c;
          if (d < 0.12) c = U.ESPUMA;
          else if (d < 0.55) c = U.RASO[0];
          else if (d < 1.3) c = U.RASO[1];
          else if (d < 2.4) c = U.RASO[2];
          else c = Math.hypot((x - CX) / (W / 2), (y - CY) / (H / 2)) + R3(x, y) * 0.04 > 0.78 ? U.MAR_FUNDO : U.MAR;
          buf[py * CH + px] = c;
        }
      }
      // ondas: traços curtos claros só na água funda
      var r = mulberry(P.x0 * 31 + P.y0 * 7 + 5), ondaA = rgb([58, 102, 136]), ondaB = rgb([44, 82, 116]);
      for (var k = 0; k < 75; k++) {
        var ox = Math.floor(r() * (CH - 12)), oy = Math.floor(r() * (CH - 2)), base = buf[oy * CH + ox];
        if (base !== U.MAR && base !== U.MAR_FUNDO) continue;
        var n = 4 + Math.floor(r() * 6), cor = base === U.MAR ? ondaA : ondaB;
        for (var q = 0; q < n; q++) buf[oy * CH + ox + q] = cor;
        if (r() < 0.4) for (q = 2; q < n + 2 && ox + q < CH; q++) buf[(oy + 1) * CH + ox + q] = cor;
      }
    }

    function topoCor(n) {
      if (n === 5) return function (x, y) {
        if (hash(x, y) > 0.985) return U.GELO_C;
        return R5(x, y) > 0.6 ? U.GELO_E : U.GELO;
      };
      if (n >= 2) return function (x, y) {
        if (hash(x, y) > 0.994) return U.NEVE_BRILHO;
        if (n >= 3 && R2(x, y) > 0.9) return U.NEVE_SOMBRA;
        return R11(x, y) > 0.55 ? U.NEVE_2 : U.NEVE;
      };
      return function (x, y) {
        var h = hash(x, y);
        if (R9(x, y) > 0.7) return U.NEVE_SOMBRA;
        return h > 0.8 ? U.CASCALHO[0] : (h < 0.12 ? U.CASCALHO[2] : U.CASCALHO[1]);
      };
    }
    var TOPO = [null, topoCor(1), topoCor(2), topoCor(3), topoCor(4), topoCor(5)];

    function terra(P) {
      var x0 = P.x0, y0 = P.y0, x1 = x0 + CH, y1 = y0 + CH;
      var dmin = Math.floor((x0 - OX) / TW) - 2, dmax = Math.ceil((x1 - OX) / TW) + 2;
      var smin = Math.floor((y0 - OY - 8) / TH) - 3, smax = Math.ceil((y1 - OY + Z[4] + 8) / TH) + 1;
      for (var s = smin; s <= smax; s++) {
        for (var dd = dmin; dd <= dmax; dd++) {
          if ((s + dd) & 1) continue;
          var u = (s + dd) / 2, v = (s - dd) / 2, n = cel(u, v);
          if (!n) continue;
          var z = Z[n === 5 ? 2 : n] - (n === 5 ? 3 : 0);
          var fe = Z[nivel(u, v + 1)], fd = Z[nivel(u + 1, v)];
          var be = fe || -6, bd = fd || -6, k, a, b;
          if (fe < z) {
            P.poli([iso(u, v + 1, z), iso(u + 1, v + 1, z), iso(u + 1, v + 1, be), iso(u, v + 1, be)], U.ROCHA_E[1]);
            for (k = be + 6; k < z - 2; k += 7) { a = iso(u, v + 1, k); b = iso(u + 1, v + 1, k); P.linha(a[0], a[1], b[0], b[1], U.ROCHA_E[0], 1); }
            a = iso(u, v + 1, z - 1); b = iso(u + 1, v + 1, z - 1); P.linha(a[0], a[1], b[0], b[1], U.ROCHA_E[2], 1);
          }
          if (fd < z) {
            P.poli([iso(u + 1, v, z), iso(u + 1, v + 1, z), iso(u + 1, v + 1, bd), iso(u + 1, v, bd)], U.ROCHA_D[1]);
            for (k = bd + 4; k < z - 2; k += 7) { a = iso(u + 1, v, k); b = iso(u + 1, v + 1, k); P.linha(a[0], a[1], b[0], b[1], U.ROCHA_D[0], 1); }
          }
          P.poli([iso(u, v, z), iso(u + 1, v, z), iso(u + 1, v + 1, z), iso(u, v + 1, z)], 0, TOPO[n]);
          if (n >= 2 && n !== 5) {
            var r = mulberry(u * 7333 + v * 911);
            [[[u, v + 1], [u + 1, v + 1], fe], [[u + 1, v], [u + 1, v + 1], fd]].forEach(function (lado) {
              if (lado[2] >= z) return;
              var p = iso(lado[0][0], lado[0][1], z), q = iso(lado[1][0], lado[1][1], z);
              P.linha(p[0], p[1] + 1, q[0], q[1] + 1, U.NEVE_SOMBRA, 2.2);
              for (var m = 0; m < 3; m++) {
                var t = r(), x = p[0] + (q[0] - p[0]) * t, y = p[1] + (q[1] - p[1]) * t, c = 3 + Math.floor(r() * 6);
                P.linha(x, y + 1, x, y + c, U.PINGENTE, 1.5);
                var px = Math.floor(x - x0), py = Math.floor(y + c - y0);
                if (px >= 0 && py >= 0 && px < CH && py < CH) P.buf[py * CH + px] = U.PINGENTE_P;
              }
            });
          }
        }
      }
    }

    function renderizar(i, j) {
      var P = new Pedaco(i, j);
      agua(P);
      var k = i + "," + j;
      (idxAntes[k] || []).forEach(function (n) { P.forma(antesDaTerra[n]); });
      terra(P);
      (idxDepois[k] || []).forEach(function (n) { P.forma(depoisDaTerra[n]); });
      var cv = document.createElement("canvas");
      cv.width = CH; cv.height = CH;
      var c = cv.getContext("2d");
      c.putImageData(new ImageData(new Uint8ClampedArray(P.buf.buffer), CH, CH), 0, 0);
      return cv;
    }

    // ---------- visão de longe: o mundo inteiro numa tela 8x menor ----------
    var K1 = 8;
    var longe = document.createElement("canvas");
    longe.width = Math.ceil(W / K1); longe.height = Math.ceil(H / K1);
    var lc = longe.getContext("2d");
    function desenharLonge() {
      lc.setTransform(1 / K1, 0, 0, 1 / K1, 0, 0);
      lc.fillStyle = css(C.MAR); lc.fillRect(0, 0, W, H);
      var g = lc.createRadialGradient(M.centro[0], M.centro[1], H * 0.3, M.centro[0], M.centro[1], H * 0.62);
      g.addColorStop(0, "rgba(26,54,84,0)"); g.addColorStop(1, css(C.MAR_FUNDO));
      lc.fillStyle = g; lc.fillRect(0, 0, W, H);
      var terras = [];
      M.faixas.forEach(function (f) { for (var k = 0; k < f[2].length; k++) terras.push([f[0], f[1] + k, f[2][k] === "L" ? 5 : +f[2][k]]); });
      [[2.9, C.RASO[2]], [1.8, C.RASO[1]], [1.05, C.RASO[0]]].forEach(function (faixa) {
        lc.fillStyle = css(faixa[1]);
        terras.forEach(function (t) {
          var p = iso(t[0] + 0.5, t[1] + 0.5);
          lc.beginPath(); lc.ellipse(p[0], p[1], faixa[0] * TW, faixa[0] * TH, 0, 0, Math.PI * 2); lc.fill();
        });
      });
      antesDaTerra.forEach(function (f) { if (f.t === "poli") { lc.fillStyle = "#" + ("000000" + (f.c & 0xffffff).toString(16)).slice(-6).replace(/(..)(..)(..)/, "$3$2$1"); lc.beginPath(); f.p.forEach(function (p, n) { if (n) lc.lineTo(p[0], p[1]); else lc.moveTo(p[0], p[1]); }); lc.fill(); } });
      terras.sort(function (a, b) { return (a[0] + a[1]) - (b[0] + b[1]) || a[0] - b[0]; });
      terras.forEach(function (t) {
        var u = t[0], v = t[1], n = t[2], z = Z[n === 5 ? 2 : n];
        function pol(pts, cor) { lc.fillStyle = cor; lc.beginPath(); pts.forEach(function (p, k) { if (k) lc.lineTo(p[0], p[1]); else lc.moveTo(p[0], p[1]); }); lc.closePath(); lc.fill(); }
        if (Z[nivel(u, v + 1)] < z) pol([iso(u, v + 1, z), iso(u + 1, v + 1, z), iso(u + 1, v + 1, -6), iso(u, v + 1, -6)], css(C.ROCHA_E[1]));
        if (Z[nivel(u + 1, v)] < z) pol([iso(u + 1, v, z), iso(u + 1, v + 1, z), iso(u + 1, v + 1, -6), iso(u + 1, v, -6)], css(C.ROCHA_D[1]));
        pol([iso(u - 0.05, v - 0.05, z), iso(u + 1.05, v - 0.05, z), iso(u + 1.05, v + 1.05, z), iso(u - 0.05, v + 1.05, z)],
            css(n === 5 ? C.GELO : (n >= 2 ? C.NEVE : C.CASCALHO[1])));
      });
    }
    desenharLonge();
    var objImgs = {};
    function desenharObjetosLonge() {
      // árvores e lugares por cima da visão de longe, quando as imagens chegarem
      lc.setTransform(1 / K1, 0, 0, 1 / K1, 0, 0);
      M.objetos.slice().sort(function (a, b) { return a.prof - b.prof; }).forEach(function (o) {
        var im = objImgs[o.img];
        if (im && im.complete && im.naturalWidth) lc.drawImage(im, o.x - o.ax, o.y - o.ay);
      });
      M.lugares.forEach(function (l) {
        var im = objImgs[l.img];
        if (im && im.complete && im.naturalWidth) lc.drawImage(im, l.x - l.ax, l.y - l.ay);
      });
    }
    var faltam = 0;
    M.objetos.concat(M.lugares).forEach(function (o) {
      if (objImgs[o.img]) return;
      faltam++;
      var im = objImgs[o.img] = carregar("img/o/" + o.img + ".png");
      im.addEventListener("load", function () { if (--faltam === 0) desenharObjetosLonge(); });
      im.addEventListener("error", function () { if (--faltam === 0) desenharObjetosLonge(); });
    });

    // ---------- visão média: a ilha principal numa tela 2x menor, montada aos poucos ----------
    var K2 = 2;
    var bx0 = Math.floor((R.cx - R.rx) / CH), bx1 = Math.floor((R.cx + R.rx) / CH);
    var by0 = Math.floor((R.cy - R.ry) / CH), by1 = Math.floor((R.cy + R.ry) / CH);
    var media = document.createElement("canvas");
    media.width = (bx1 - bx0 + 1) * CH / K2; media.height = (by1 - by0 + 1) * CH / K2;
    var mc = media.getContext("2d");
    mc.imageSmoothingEnabled = true; mc.imageSmoothingQuality = "high";
    var mediaFeitos = {}, mediaFila = [];
    for (var mj = by0; mj <= by1; mj++) for (var mi = bx0; mi <= bx1; mi++) mediaFila.push([mi, mj]);
    // do centro para fora: a vila aparece primeiro
    var ccx = (R.cx / CH), ccy = (R.cy / CH);
    mediaFila.sort(function (a, b) { return Math.hypot(a[0] + .5 - ccx, a[1] + .5 - ccy) - Math.hypot(b[0] + .5 - ccx, b[1] + .5 - ccy); });

    // ---------- pedaços em tamanho real (os mais usados ficam guardados) ----------
    var cache = new Map(), MAXCACHE = 70;
    function pegar(i, j) {
      var k = i + "," + j, c = cache.get(k);
      if (c) { cache.delete(k); cache.set(k, c); }
      return c;
    }
    function guardar(i, j, cv) {
      cache.set(i + "," + j, cv);
      if (cache.size > MAXCACHE) cache.delete(cache.keys().next().value);
      var k = i + "," + j;
      if (!mediaFeitos[k] && i >= bx0 && i <= bx1 && j >= by0 && j <= by1) {
        mc.drawImage(cv, (i - bx0) * CH / K2, (j - by0) * CH / K2, CH / K2, CH / K2);
        mediaFeitos[k] = 1;
      }
    }

    var MEDIO = 0.18, PERTO = 0.6;
    // desenha o chão na área visível (ctx já está em coordenadas do mundo)
    function chao(ctx, x0, y0, x1, y1, s, prazo) {
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
      ctx.drawImage(longe, 0, 0, longe.width * K1, longe.height * K1);
      if (s >= MEDIO) {
        ctx.drawImage(media, bx0 * CH, by0 * CH, media.width * K2, media.height * K2);
      }
      var fim = performance.now() + prazo;
      if (s >= PERTO) {
        ctx.imageSmoothingEnabled = s < 1;
        var i0 = Math.max(0, Math.floor(x0 / CH)), i1 = Math.min(Math.ceil(W / CH) - 1, Math.floor(x1 / CH));
        var j0 = Math.max(0, Math.floor(y0 / CH)), j1 = Math.min(Math.ceil(H / CH) - 1, Math.floor(y1 / CH));
        var falta = [];
        for (var j = j0; j <= j1; j++) for (var i = i0; i <= i1; i++) {
          var c = pegar(i, j);
          if (c) ctx.drawImage(c, i * CH, j * CH);
          else falta.push([i, j]);
        }
        var mx = (x0 + x1) / 2 / CH, my = (y0 + y1) / 2 / CH;
        falta.sort(function (a, b) { return Math.hypot(a[0] - mx, a[1] - my) - Math.hypot(b[0] - mx, b[1] - my); });
        for (var f = 0; f < falta.length && (f === 0 || performance.now() < fim); f++) {
          var cv = renderizar(falta[f][0], falta[f][1]);
          guardar(falta[f][0], falta[f][1], cv);
          ctx.drawImage(cv, falta[f][0] * CH, falta[f][1] * CH);
        }
        return;
      }
      // sem pedaço para fazer na tela: adianta a visão média
      while (mediaFila.length && performance.now() < fim) {
        var p = mediaFila.shift();
        if (!mediaFeitos[p[0] + "," + p[1]]) guardar(p[0], p[1], renderizar(p[0], p[1]));
      }
    }

    return {
      chao: chao, nivel: nivel, objImgs: objImgs, MEDIO: MEDIO, PERTO: PERTO,
      pronto: function () { return !mediaFila.length; }
    };
  };
})();
