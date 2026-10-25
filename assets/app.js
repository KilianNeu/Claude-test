(function () {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const data = window.SEASONS.map((s, i) => {
    const pts = s.w * 3 + s.d;
    const games = s.w + s.d + s.l;
    return Object.assign({}, s, {
      i,
      pts,
      games,
      gd: s.gf - s.ga,
      ppg: pts / games,
      // Gesamtrang über beide Ligen: Platz 2 in Liga 2 = Rang 20
      rank: s.league === "BL2" ? 18 + s.pos : s.pos,
      short: s.season.slice(2, 4) + "/" + s.season.slice(5, 7),
    });
  });

  const fmt = (n, d = 0) => n.toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d });
  const signed = (n, d = 0) => (n > 0 ? "+" : n < 0 ? "−" : "±") + fmt(Math.abs(n), d);
  const leagueName = (s) => (s.league === "BL2" ? "2. Bundesliga" : "Bundesliga");
  const posText = (s) => s.pos + "." + (s.league === "BL2" ? " (2. Liga)" : "");

  const METRICS = {
    rank: { label: "Tabellenplatz", sub: "Endplatzierung je Saison. Oben ist besser.", type: "line",
            value: (s) => s.rank, text: (s) => "Platz " + posText(s), lowerBetter: true },
    pts:  { label: "Punkte", sub: "Punkte nach 34 Spieltagen", type: "bar",
            value: (s) => s.pts, text: (s) => fmt(s.pts) + " Punkte" },
    gf:   { label: "Tore", sub: "Erzielte Ligatore", type: "bar",
            value: (s) => s.gf, text: (s) => fmt(s.gf) + " Tore" },
    ga:   { label: "Gegentore", sub: "Kassierte Ligatore. Weniger ist besser.", type: "bar",
            value: (s) => s.ga, text: (s) => fmt(s.ga) + " Gegentore", lowerBetter: true },
    gd:   { label: "Tordifferenz", sub: "Tore minus Gegentore", type: "bar",
            value: (s) => s.gd, text: (s) => signed(s.gd) + " Tordifferenz" },
    ppg:  { label: "Punkte/Spiel", sub: "Punkteschnitt pro Partie", type: "bar",
            value: (s) => s.ppg, text: (s) => fmt(s.ppg, 2) + " Punkte pro Spiel" },
  };

  const state = { metric: "rank", hover: null, sel: [null, null] };

  /* ---------------- helpers ---------------- */
  function el(tag, attrs, parent) {
    const n = document.createElementNS(SVG_NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function niceMax(v) {
    const step = Math.pow(10, Math.floor(Math.log10(v)));
    for (const m of [1, 2, 2.5, 5, 10]) if (m * step >= v) return m * step;
    return 10 * step;
  }
  function ticks(min, max, count) {
    const raw = (max - min) / count;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
    const out = [];
    for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(+v.toFixed(6));
    return out;
  }
  function selTag(i) {
    if (state.sel[0] === i) return "a";
    if (state.sel[1] === i) return "b";
    return null;
  }

  /* ---------------- selection ---------------- */
  function toggleSelect(i) {
    const [a, b] = state.sel;
    if (a === i) state.sel = [b, null];
    else if (b === i) state.sel = [a, null];
    else if (a === null) state.sel = [i, b];
    else if (b === null) state.sel = [a, i];
    else state.sel = [a, i];
    renderAll();
  }
  function setHover(i) {
    if (state.hover === i) return;
    state.hover = i;
    renderChart();
    renderDetail();
    renderProgress();
    syncHoverClasses();
  }

  /* ---------------- KPIs ---------------- */
  function renderKpis() {
    const bl = data.filter((s) => s.league === "BL");
    const best = bl.reduce((a, b) => (b.pos < a.pos ? b : a));
    const mostPts = bl.reduce((a, b) => (b.pts > a.pts ? b : a));
    const mostGoals = data.reduce((a, b) => (b.gf > a.gf ? b : a));
    const avgPos = bl.reduce((s, x) => s + x.pos, 0) / bl.length;
    const totals = data.reduce((t, s) => ({ w: t.w + s.w, g: t.g + s.games }), { w: 0, g: 0 });
    const items = [
      { label: "Beste Platzierung", value: best.pos + ".", ctx: "Vizemeister " + best.season },
      { label: "Meiste Punkte", value: mostPts.pts, ctx: data.filter((s) => s.league === "BL" && s.pts === mostPts.pts).map((s) => s.season).join(" & ") },
      { label: "Meiste Tore", value: mostGoals.gf, ctx: "in der Saison " + mostGoals.season },
      { label: "Ø Bundesliga-Platz", value: fmt(avgPos, 1), ctx: bl.length + " Spielzeiten Bundesliga" },
      { label: "Siege gesamt", value: totals.w, ctx: "aus " + totals.g + " Ligaspielen" },
    ];
    document.getElementById("kpis").innerHTML = items
      .map((k) => `<div class="kpi"><div class="label">${k.label}</div><div class="value">${k.value}</div><div class="ctx">${k.ctx}</div></div>`)
      .join("");
  }

  /* ---------------- metric tabs ---------------- */
  function renderTabs() {
    const box = document.getElementById("metric-tabs");
    box.innerHTML = "";
    for (const key in METRICS) {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("role", "tab");
      b.textContent = METRICS[key].label;
      b.setAttribute("aria-selected", key === state.metric);
      b.addEventListener("click", () => {
        state.metric = key;
        renderTabs();
        renderChart();
      });
      box.appendChild(b);
    }
    document.getElementById("chart-title").textContent = METRICS[state.metric].label;
    document.getElementById("chart-sub").textContent = METRICS[state.metric].sub;
  }

  /* ---------------- main chart ---------------- */
  const svg = document.getElementById("chart");
  const tooltip = document.getElementById("tooltip");

  function renderChart() {
    const m = METRICS[state.metric];
    const W = svg.clientWidth || 800;
    const H = svg.clientHeight || 380;
    const narrow = W < 560;
    const M = { top: 26, right: 8, bottom: 30, left: m.type === "line" ? 34 : 40 };
    const iw = W - M.left - M.right;
    const ih = H - M.top - M.bottom;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const focused = svg.contains(document.activeElement) ? document.activeElement.dataset.col : null;
    svg.innerHTML = "";
    svg.classList.toggle("dim", state.hover !== null && m.type === "bar");

    const defs = el("defs", {}, svg);
    const pat = el("pattern", { id: "hatch", width: 6, height: 6, patternUnits: "userSpaceOnUse", patternTransform: "rotate(135)" }, defs);
    el("rect", { width: 6, height: 6, fill: "var(--surface-2)" }, pat);
    el("rect", { width: 2.5, height: 6, fill: "var(--werder)" }, pat);

    const g = el("g", { transform: `translate(${M.left},${M.top})` }, svg);
    const n = data.length;
    const bw = iw / n;
    const cx = (i) => i * bw + bw / 2;

    // y-scale
    let y, yTicks, y0;
    if (m.type === "line") {
      y = (v) => ((v - 1) / 19) * ih; // 1 oben, 20 unten
      yTicks = [1, 4, 8, 12, 16, 18];
    } else {
      const vals = data.map(m.value);
      const lo = Math.min(0, ...vals);
      const hi = niceMax(Math.max(...vals) * 1.08);
      const loN = lo < 0 ? -niceMax(-lo * 1.1) : 0;
      y = (v) => ih - ((v - loN) / (hi - loN)) * ih;
      yTicks = ticks(loN, hi, 5);
      y0 = y(0);
    }

    // bands (rank chart only)
    if (m.type === "line") {
      el("rect", { class: "band", x: 0, y: y(15.5), width: iw, height: y(18.5) - y(15.5) }, g);
      el("rect", { class: "band-2", x: 0, y: y(18.5), width: iw, height: ih - y(18.5) + 6 }, g);
      el("text", { class: "band-label", x: 6, y: y(15.5) + 13 }, g).textContent = "Relegation / Abstieg";
      el("text", { class: "band-label", x: 6, y: y(18.5) + 13 }, g).textContent = "2. Bundesliga";
    }

    // grid + y axis
    const grid = el("g", { class: "grid" }, g);
    for (const t of yTicks) {
      el("line", { x1: 0, x2: iw, y1: y(t), y2: y(t) }, grid);
      const label = m.type === "line" ? t + "." : (state.metric === "ppg" ? fmt(t, 1) : fmt(t));
      el("text", { x: -8, y: y(t) + 4, "text-anchor": "end" }, g).textContent = label;
    }

    // hover column
    if (state.hover !== null) {
      el("rect", { class: "col-hover", x: state.hover * bw, y: -M.top + 4, width: bw, height: ih + M.top - 4, rx: 6 }, g);
    }

    // x axis labels
    const ax = el("g", { class: "axis-x" }, g);
    data.forEach((s, i) => {
      if (narrow && i % 4 !== 0) return;
      const t = el("text", { x: cx(i), y: ih + 20, "text-anchor": "middle" }, ax);
      t.textContent = s.short;
      if (state.hover === i || selTag(i)) t.setAttribute("style", "fill:var(--ink);font-weight:600");
    });

    // marks
    const pointY = [];
    if (m.type === "line") {
      const pts = data.map((s, i) => [cx(i), y(s.rank)]);
      const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join("");
      el("path", { class: "line", d }, g);
      data.forEach((s, i) => {
        const r = state.hover === i ? 7 : 5;
        el("circle", { class: "dot", cx: pts[i][0], cy: pts[i][1], r }, g);
        pointY[i] = pts[i][1];
      });
    } else {
      const barW = Math.max(4, Math.min(28, bw - 6));
      data.forEach((s, i) => {
        const v = m.value(s);
        const top = Math.min(y(v), y0);
        const h = Math.max(1, Math.abs(y(v) - y0));
        const cls = ["bar"];
        if (v < 0) cls.push("neg");
        if (s.league === "BL2") cls.push("liga2");
        if (state.hover === i) cls.push("is-hover");
        // abgerundete Datenenden, am Nullpunkt gerade
        const x = cx(i) - barW / 2, r = Math.min(4, barW / 2, h);
        const dPath = v >= 0
          ? `M${x},${y0}V${top + r}Q${x},${top} ${x + r},${top}H${x + barW - r}Q${x + barW},${top} ${x + barW},${top + r}V${y0}Z`
          : `M${x},${y0}V${top + h - r}Q${x},${top + h} ${x + r},${top + h}H${x + barW - r}Q${x + barW},${top + h} ${x + barW},${top + h - r}V${y0}Z`;
        el("path", { class: cls.join(" "), d: dPath }, g);
        pointY[i] = v >= 0 ? top : top + h;
      });
      el("line", { class: "baseline", x1: 0, x2: iw, y1: y0, y2: y0 }, g);
    }

    // selection markers
    [0, 1].forEach((k) => {
      const i = state.sel[k];
      if (i === null) return;
      const tag = k === 0 ? "a" : "b";
      el("rect", { class: "sel-ring sel-" + tag, x: i * bw + 1, y: -M.top + 2, width: bw - 2, height: ih + M.top + 2, rx: 6 }, g);
      el("rect", { class: "sel-tag-bg " + tag, x: cx(i) - 8, y: -M.top + 4, width: 16, height: 15, rx: 4 }, g);
      el("text", { class: "sel-tag", x: cx(i), y: -M.top + 15, "text-anchor": "middle" }, g).textContent = tag.toUpperCase();
    });

    // direct labels for hovered / selected (selective, nie auf jedem Punkt)
    const labelIdx = new Set([state.hover, state.sel[0], state.sel[1]].filter((v) => v !== null));
    labelIdx.forEach((i) => {
      const s = data[i];
      const v = m.value(s);
      const txt = m.type === "line" ? s.pos + "." : state.metric === "ppg" ? fmt(v, 2) : state.metric === "gd" ? signed(v) : fmt(v);
      const below = m.type === "line" ? pointY[i] < 22 : v < 0;
      el("text", { class: "val-label", x: cx(i), y: below ? pointY[i] + 20 : pointY[i] - 10, "text-anchor": "middle" }, g).textContent = txt;
    });

    // hit targets (größer als die Marke: die ganze Spalte)
    data.forEach((s, i) => {
      const hit = el("rect", {
        class: "col-hit", x: i * bw, y: -M.top, width: bw, height: ih + M.top + M.bottom,
        tabindex: 0, role: "button", "aria-label": `${s.season}: ${m.text(s)}`, "data-col": i,
      }, g);
      if (focused !== null && +focused === i) hit.focus({ preventScroll: true });
      hit.addEventListener("mouseenter", () => setHover(i));
      hit.addEventListener("focus", () => setHover(i));
      hit.addEventListener("click", () => toggleSelect(i));
      hit.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleSelect(i); }
      });
    });

    // tooltip
    if (state.hover !== null) {
      const s = data[state.hover];
      const tag = selTag(state.hover);
      tooltip.innerHTML = `<b>${s.season}</b>${m.text(s)}<br><span class="t-muted">${leagueName(s)} · ${s.pts} Pkt. · ${s.gf}:${s.ga} Tore</span><br><span class="t-muted">${tag ? "Klicken zum Entfernen (" + tag.toUpperCase() + ")" : "Klicken zum Markieren"}</span>`;
      let left = M.left + cx(state.hover);
      const half = Math.min(120, tooltip.offsetWidth / 2 + 4);
      left = Math.max(half, Math.min(W - half, left));
      tooltip.style.left = left + "px";
      tooltip.style.top = Math.max(70, M.top + pointY[state.hover] - 34) + "px";
      tooltip.classList.add("show");
    } else {
      tooltip.classList.remove("show");
    }

    // legend
    const legend = [];
    if (m.type === "line") {
      legend.push('<span><i class="sw sw-band"></i>Relegations- und Abstiegszone</span>');
    } else {
      legend.push('<span><i class="sw sw-hatch"></i>2021/22 in der 2. Bundesliga</span>');
    }
    legend.push('<span><i class="sw sw-a"></i>Markierung A</span><span><i class="sw sw-b"></i>Markierung B</span>');
    document.getElementById("legend").innerHTML = legend.join("");
  }

  svg.addEventListener("mouseleave", () => setHover(null));

  /* ---------------- detail panel ---------------- */
  function renderDetail() {
    const idx = state.hover ?? state.sel[0] ?? data.length - 1;
    const s = data[idx];
    const label = state.hover !== null ? "Ausgewählt mit der Maus" : state.sel[0] !== null ? "Markierte Saison A" : "Letzte Saison";
    const pct = (v) => (v / s.games) * 100;
    document.getElementById("detail").innerHTML = `
      <p class="sub" style="margin:0 0 4px">${label}</p>
      <h3>${s.season}<span class="liga">${leagueName(s)}</span></h3>
      <p class="coach">Trainer: ${s.coach}</p>
      <div class="stats">
        <div class="stat"><div class="label">Platz</div><div class="value">${s.pos}.</div></div>
        <div class="stat"><div class="label">Punkte</div><div class="value">${s.pts}</div></div>
        <div class="stat"><div class="label">Punkte/Spiel</div><div class="value">${fmt(s.ppg, 2)}</div></div>
        <div class="stat"><div class="label">Tore</div><div class="value">${s.gf}<small>:${s.ga}</small></div></div>
        <div class="stat"><div class="label">Tordifferenz</div><div class="value">${signed(s.gd)}</div></div>
        <div class="stat"><div class="label">Tore/Spiel</div><div class="value">${fmt(s.gf / s.games, 2)}</div></div>
      </div>
      <div class="wdl-bar" role="img" aria-label="${s.w} Siege, ${s.d} Unentschieden, ${s.l} Niederlagen">
        <i class="w" style="width:${pct(s.w)}%"></i><i class="d" style="width:${pct(s.d)}%"></i><i class="l" style="width:${pct(s.l)}%"></i>
      </div>
      <div class="wdl-caption"><span>${s.w} Siege</span><span>${s.d} Unentschieden</span><span>${s.l} Niederlagen</span></div>
      ${s.notes.length ? `<ul class="notes">${s.notes.map((x) => `<li>${x}</li>`).join("")}</ul>` : ""}
    `;
  }

  /* ---------------- compare panel ---------------- */
  const CMP = [
    { label: "Platz", v: (s) => s.rank, show: (s) => posText(s), lower: true, max: 20, invert: true },
    { label: "Punkte", v: (s) => s.pts, show: (s) => s.pts },
    { label: "Siege", v: (s) => s.w, show: (s) => s.w },
    { label: "Niederlagen", v: (s) => s.l, show: (s) => s.l, lower: true },
    { label: "Tore", v: (s) => s.gf, show: (s) => s.gf },
    { label: "Gegentore", v: (s) => s.ga, show: (s) => s.ga, lower: true },
    { label: "Tordifferenz", v: (s) => s.gd, show: (s) => signed(s.gd), signedBar: true },
    { label: "Punkte/Spiel", v: (s) => s.ppg, show: (s) => fmt(s.ppg, 2) },
  ];

  function renderCompare() {
    const box = document.getElementById("compare");
    const [ia, ib] = state.sel;
    if (ia === null || ib === null) {
      const step = ia === null ? 1 : 2;
      box.innerHTML = `
        <p class="sub" style="margin:0 0 4px">Saison gegen Saison</p>
        <h3>Vergleich</h3>
        <ol class="empty-steps">
          <li${step > 1 ? ' style="text-decoration:line-through;opacity:.6"' : ""}>Klick im Diagramm, der Bilanz oder der Tabelle auf eine Saison (Markierung <b>A</b>)${ia !== null ? `: <b>${data[ia].season}</b>` : ""}</li>
          <li>Klick auf eine zweite Saison (Markierung <b>B</b>)</li>
        </ol>
        <p class="hint" style="margin-top:12px">Schnellstart:
          <button class="btn" data-pair="1,19">2007/08 vs. 2025/26</button>
          <button class="btn" data-pair="2,13">Pokalsieg vs. Relegation</button>
        </p>`;
      box.querySelectorAll("[data-pair]").forEach((b) =>
        b.addEventListener("click", () => {
          state.sel = b.dataset.pair.split(",").map(Number);
          renderAll();
        })
      );
      return;
    }
    const A = data[ia], B = data[ib];
    const rows = CMP.map((c) => {
      const va = c.v(A), vb = c.v(B);
      const all = data.map(c.v);
      let wa, wb;
      if (c.invert) {
        wa = (21 - va) / 20; wb = (21 - vb) / 20;
      } else if (c.signedBar) {
        const mx = Math.max(...all.map(Math.abs));
        wa = (va - -mx) / (2 * mx); wb = (vb - -mx) / (2 * mx);
      } else {
        const mx = Math.max(...all);
        wa = va / mx; wb = vb / mx;
      }
      const better = va === vb ? null : (c.lower ? va < vb : va > vb) ? "a" : "b";
      return `
        <div class="cmp-row">
          <div class="cmp-side a"><span class="v">${c.show(A)}</span><span class="cmp-track"><i style="width:${(wa * 100).toFixed(1)}%"></i></span></div>
          <div class="lbl">${c.label}<br>${better ? `<span style="color:var(--sel-${better});font-weight:700">${better === "a" ? "◀ A besser" : "B besser ▶"}</span>` : "gleich"}</div>
          <div class="cmp-side b"><span class="cmp-track"><i style="width:${(wb * 100).toFixed(1)}%"></i></span><span class="v">${c.show(B)}</span></div>
        </div>`;
    }).join("");
    const liga = A.league !== B.league ? `<p class="hint" style="margin-top:10px">Hinweis: ${A.league === "BL2" ? A.season : B.season} wurde in der 2. Bundesliga gespielt. Punkte und Tore sind nur bedingt vergleichbar.</p>` : "";
    box.innerHTML = `
      <div class="compare-head">
        <span class="chip a"><span class="tag">A</span>${A.season}</span>
        <span class="vs">vs.</span>
        <span class="chip b">${B.season}<span class="tag">B</span></span>
      </div>
      ${rows}
      ${liga}
      <p style="margin:12px 0 0;display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn" id="swap">A ⇄ B tauschen</button>
        <button class="btn" id="clear">Markierungen löschen</button>
      </p>`;
    box.querySelector("#swap").addEventListener("click", () => { state.sel = [ib, ia]; renderAll(); });
    box.querySelector("#clear").addEventListener("click", () => { state.sel = [null, null]; renderAll(); });
  }

  /* ---------------- W/D/L strip ---------------- */
  function renderWdl() {
    const box = document.getElementById("wdl");
    box.innerHTML = data.map((s) => `
      <div class="wdl-col" data-i="${s.i}" tabindex="0" role="button" aria-label="${s.season}: ${s.w} Siege, ${s.d} Unentschieden, ${s.l} Niederlagen">
        <span class="wnum">${s.w}</span>
        <div class="wdl-stack">
          <i class="l" style="height:${(s.l / 34) * 100}%"></i>
          <i class="d" style="height:${(s.d / 34) * 100}%"></i>
          <i class="w" style="height:${(s.w / 34) * 100}%"></i>
        </div>
        <span class="yr">${s.season}</span>
      </div>`).join("");
    bindRows(box.querySelectorAll(".wdl-col"));
  }

  /* ---------------- table ---------------- */
  const COLS = [
    { key: "season", label: "Saison", get: (s) => s.i, html: (s) => s.season + (s.league === "BL2" ? '<span class="badge">2. Liga</span>' : "") },
    { key: "rank", label: "Platz", get: (s) => s.rank, html: (s) => `<span class="pos ${s.league === "BL" && s.pos <= 4 ? "top" : s.league === "BL" && s.pos >= 16 ? "bad" : ""}">${s.pos}</span>` },
    { key: "pts", label: "Pkt.", get: (s) => s.pts },
    { key: "w", label: "S", get: (s) => s.w },
    { key: "d", label: "U", get: (s) => s.d },
    { key: "l", label: "N", get: (s) => s.l },
    { key: "goals", label: "Tore", get: (s) => s.gf, html: (s) => `${s.gf}:${s.ga}` },
    { key: "gd", label: "Diff.", get: (s) => s.gd, html: (s) => signed(s.gd) },
    { key: "ppg", label: "Pkt./Sp.", get: (s) => s.ppg, html: (s) => fmt(s.ppg, 2) },
    { key: "coach", label: "Trainer", get: (s) => s.coach, html: (s) => `<span class="coach-cell">${s.coach}</span>`, cls: "l" },
  ];
  const sort = { key: "season", dir: -1 };

  function renderTable() {
    const t = document.getElementById("table");
    const col = COLS.find((c) => c.key === sort.key);
    const rows = data.slice().sort((a, b) => {
      const x = col.get(a), y = col.get(b);
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
    });
    t.innerHTML = `<thead><tr>${COLS.map((c) => `<th class="${c.cls || ""}" data-k="${c.key}" ${c.key === sort.key ? `aria-sort="${sort.dir > 0 ? "ascending" : "descending"}"` : ""}>${c.label}</th>`).join("")}</tr></thead>
      <tbody>${rows.map((s) => `<tr data-i="${s.i}" tabindex="0">${COLS.map((c) => `<td class="${c.cls || ""}">${c.html ? c.html(s) : c.get(s)}</td>`).join("")}</tr>`).join("")}</tbody>`;
    t.querySelectorAll("th").forEach((th) =>
      th.addEventListener("click", () => {
        const k = th.dataset.k;
        if (sort.key === k) sort.dir *= -1;
        else { sort.key = k; sort.dir = k === "rank" || k === "l" || k === "season" ? 1 : -1; }
        renderTable();
      })
    );
    bindRows(t.querySelectorAll("tbody tr"));
  }

  function bindRows(nodes) {
    nodes.forEach((node) => {
      const i = +node.dataset.i;
      node.addEventListener("mouseenter", () => setHover(i));
      node.addEventListener("mouseleave", () => setHover(null));
      node.addEventListener("click", () => toggleSelect(i));
      node.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleSelect(i); }
      });
    });
    syncHoverClasses();
  }

  function syncHoverClasses() {
    document.querySelectorAll("[data-i]").forEach((node) => {
      const i = +node.dataset.i;
      node.classList.toggle("is-hover", state.hover === i);
      node.classList.toggle("sel-a", state.sel[0] === i);
      node.classList.toggle("sel-b", state.sel[1] === i);
    });
  }

  /* ---------------- Saisonverlauf ---------------- */
  const V = window.VERLAUF || {};
  const vKeys = Object.keys(V);
  const CUR = vKeys[vKeys.length - 1];
  const cur = V[CUR];
  const curMd = cur ? cur.pts.length : 0;
  const PAST = vKeys.filter((k) => k !== CUR);

  const PMETRICS = {
    pts:  { label: "Punkte", get: (v, i) => v.pts[i], fmt: (x) => fmt(x) },
    rank: { label: "Tabellenplatz", get: (v, i) => (v.league === 2 ? 18 : 0) + v.rank[i], fmt: (x) => (x > 18 ? x - 18 + ". (2. Liga)" : x + "."), lower: true },
    gd:   { label: "Tordifferenz", get: (v, i) => v.gf[i] - v.ga[i], fmt: (x) => signed(x) },
  };
  Object.assign(state, { pmetric: "pts", pmd: null, bl2: false });

  function pool() {
    return PAST.filter((k) => state.bl2 || V[k].league === 1);
  }
  function seasonIdx(key) {
    const s = data.find((d) => d.season === key);
    return s ? s.i : null;
  }

  function renderProgressTabs() {
    const box = document.getElementById("progress-tabs");
    box.innerHTML = "";
    for (const key in PMETRICS) {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("role", "tab");
      b.textContent = PMETRICS[key].label;
      b.setAttribute("aria-selected", key === state.pmetric);
      b.addEventListener("click", () => {
        state.pmetric = key;
        renderProgressTabs();
        renderProgress();
      });
      box.appendChild(b);
    }
  }

  function renderLive() {
    const box = document.getElementById("live");
    if (!cur) { box.innerHTML = ""; return; }
    const i = curMd - 1;
    // Vergleich nur mit Bundesliga-Spielzeiten
    const bl = PAST.filter((k) => V[k].league === 1);
    const avg = bl.reduce((s, k) => s + V[k].pts[i], 0) / bl.length;
    const better = bl.filter((k) => V[k].pts[i] > cur.pts[i]).length;
    const diff = cur.pts[i] - avg;
    const proj = Math.round((cur.pts[i] / curMd) * 34);
    const projRank = 1 + data.filter((s) => s.league === "BL" && s.pts > proj).length;
    box.innerHTML = `
      <div class="stat"><div class="label">Laufende Saison ${CUR}</div><div class="value">${curMd}. Spieltag</div><div class="ctx">${34 - curMd} Spiele übrig</div></div>
      <div class="stat"><div class="label">Punkte</div><div class="value">${cur.pts[i]}</div><div class="ctx">Platz ${cur.rank[i]} · ${cur.gf[i]}:${cur.ga[i]} Tore</div></div>
      <div class="stat"><div class="label">Gegen den Schnitt</div><div class="value ${diff >= 0 ? "up" : "down"}">${signed(diff, 1)}</div><div class="ctx">Ø ${fmt(avg, 1)} Punkte nach ${curMd} Spielen</div></div>
      <div class="stat"><div class="label">Start im Vergleich</div><div class="value">${better + 1}.</div><div class="ctx">von ${bl.length + 1} Spielzeiten seit 2006</div></div>
      <div class="stat"><div class="label">Hochrechnung</div><div class="value">${proj} <small>Pkt.</small></div><div class="ctx">wäre ${projRank}. bester Wert seit 2006</div></div>`;
  }

  const psvg = document.getElementById("progress");
  const ptip = document.getElementById("ptooltip");

  function renderProgress() {
    if (!cur) return;
    const m = PMETRICS[state.pmetric];
    const W = psvg.clientWidth || 800;
    const H = psvg.clientHeight || 420;
    const M = { top: 14, right: 52, bottom: 30, left: 36 };
    const iw = W - M.left - M.right;
    const ih = H - M.top - M.bottom;
    psvg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    psvg.innerHTML = "";
    const g = el("g", { transform: `translate(${M.left},${M.top})` }, psvg);

    const keys = pool();
    const x = (md) => ((md - 1) / 33) * iw;
    const all = keys.flatMap((k) => V[k].pts.map((_, i) => m.get(V[k], i))).concat(cur.pts.map((_, i) => m.get(cur, i)));
    let y, yTicks;
    if (state.pmetric === "rank") {
      const maxR = Math.max(18, ...all);
      y = (v) => ((v - 1) / (maxR - 1)) * ih;
      yTicks = [1, 4, 8, 12, 16, 18].filter((t) => t <= maxR);
    } else {
      const lo = Math.min(0, ...all), hi = Math.max(...all);
      const top = Math.ceil((hi * 1.03) / 10) * 10;
      const bot = Math.floor(lo / 10) * 10;
      y = (v) => ih - ((v - bot) / (top - bot)) * ih;
      yTicks = ticks(bot, top, 7);
    }

    const grid = el("g", { class: "grid" }, g);
    for (const t of yTicks) {
      el("line", { x1: 0, x2: iw, y1: y(t), y2: y(t) }, grid);
      el("text", { x: -8, y: y(t) + 4, "text-anchor": "end" }, g).textContent = state.pmetric === "rank" ? t + "." : fmt(t);
    }
    if (state.pmetric === "gd") el("line", { class: "baseline", x1: 0, x2: iw, y1: y(0), y2: y(0) }, g);
    const xt = W < 560 ? [1, 10, 20, 34] : [1, 5, 10, 15, 20, 25, 30, 34];
    for (const t of xt) el("text", { x: x(t), y: ih + 20, "text-anchor": "middle" }, g).textContent = t;
    el("text", { x: iw, y: ih + 20, dx: 8, "text-anchor": "start" }, g).textContent = "Sp.";

    const line = (vals) => vals.map((v, i) => (i ? "L" : "M") + x(i + 1).toFixed(1) + "," + y(v).toFixed(1)).join("");
    const series = (k) => V[k].pts.map((_, i) => m.get(V[k], i));

    // Spannweite beste bis schlechteste Saison
    const lo = [], hi = [], avg = [];
    for (let i = 0; i < 34; i++) {
      const vals = keys.map((k) => m.get(V[k], i));
      lo.push(Math.min(...vals)); hi.push(Math.max(...vals));
      avg.push(vals.reduce((a, b) => a + b, 0) / vals.length);
    }
    el("path", { class: "p-band", d: line(hi) + lo.map((v, i) => "L" + x(34 - i).toFixed(1) + "," + y(lo[33 - i]).toFixed(1)).join("") + "Z" }, g);
    keys.forEach((k) => el("path", { class: "p-line", d: line(series(k)) }, g));
    el("path", { class: "p-avg", d: line(avg) }, g);

    // hervorgehobene Saisons: Hover aus anderen Diagrammen, Markierung A/B
    const hiSeasons = [];
    if (state.hover !== null && !selTag(state.hover)) hiSeasons.push([data[state.hover].season, "h"]);
    if (state.sel[0] !== null) hiSeasons.push([data[state.sel[0]].season, "a"]);
    if (state.sel[1] !== null) hiSeasons.push([data[state.sel[1]].season, "b"]);
    const ends = [];
    hiSeasons.forEach(([k, cls]) => {
      if (!V[k]) return;
      const vals = series(k);
      el("path", { class: "p-hi " + cls, d: line(vals) }, g);
      if (cls !== "h") ends.push({ y: y(vals[33]), text: k.slice(2, 4) + "/" + k.slice(5, 7), cls });
    });

    // laufende Saison
    const curVals = cur.pts.map((_, i) => m.get(cur, i));
    el("path", { class: "p-cur", d: line(curVals) }, g);
    curVals.forEach((v, i) => el("circle", { class: "p-cur-dot", cx: x(i + 1), cy: y(v), r: i === curMd - 1 ? 6 : 3.5 }, g));
    el("text", { class: "p-end cur", x: x(curMd) + 10, y: y(curVals[curMd - 1]) + 4 }, g).textContent = CUR;

    // Endlabels rechts, gegen Überlappung leicht verschoben
    ends.sort((a, b) => a.y - b.y);
    for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 14) ends[i].y = ends[i - 1].y + 14;
    ends.forEach((e) => (el("text", { class: "p-end " + e.cls, x: iw + 6, y: e.y + 4 }, g).textContent = e.text));

    // Hover: Fadenkreuz je Spieltag
    if (state.pmd !== null) {
      const md = state.pmd, i = md - 1;
      el("line", { class: "p-cross", x1: x(md), x2: x(md), y1: 0, y2: ih }, g);
      const rows = [];
      if (md <= curMd) rows.push([CUR, m.fmt(curVals[i]), "var(--surface)"]);
      rows.push(["Ø " + keys.length + " Saisons", state.pmetric === "rank" ? fmt(avg[i], 1) + "." : state.pmetric === "gd" ? signed(avg[i], 1) : fmt(avg[i], 1), "var(--draw)"]);
      hiSeasons.forEach(([k, cls]) => {
        if (!V[k]) return;
        const v = m.get(V[k], i);
        const color = cls === "a" ? "var(--sel-a)" : cls === "b" ? "var(--sel-b)" : "var(--werder)";
        rows.push([k, m.fmt(v), color]);
        el("circle", { class: "p-mark", cx: x(md), cy: y(v), r: 5, fill: color }, g);
      });
      const bestFn = m.lower ? Math.min : Math.max, worstFn = m.lower ? Math.max : Math.min;
      const bestK = keys.find((k) => m.get(V[k], i) === bestFn(...keys.map((kk) => m.get(V[kk], i))));
      const worstK = keys.find((k) => m.get(V[k], i) === worstFn(...keys.map((kk) => m.get(V[kk], i))));
      ptip.innerHTML = `<b>${md}. Spieltag</b>` +
        rows.map((r) => `<div class="t-row"><span><i class="t-dot" style="background:${r[2]}"></i>${r[0]}</span><span>${r[1]}</span></div>`).join("") +
        `<div class="t-muted">Beste: ${bestK} (${m.fmt(m.get(V[bestK], i))})<br>Schlechteste: ${worstK} (${m.fmt(m.get(V[worstK], i))})</div>`;
      ptip.classList.add("show");
      // neben das Fadenkreuz, auf die freiere Seite
      const px = M.left + x(md), w = ptip.offsetWidth;
      const right = px + 14 + w <= W || px - 14 - w < 0;
      ptip.style.left = (right ? Math.min(px + 14, W - w) : px - 14 - w) + "px";
      ptip.style.top = M.top + 4 + "px";
      ptip.style.transform = "none";
    } else {
      ptip.classList.remove("show");
    }

    const hit = el("rect", { class: "p-hit", x: -6, y: 0, width: iw + 12, height: ih }, g);
    const onMove = (ev) => {
      const r = psvg.getBoundingClientRect();
      const px = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left - M.left;
      const md = Math.max(1, Math.min(34, Math.round((px / iw) * 33) + 1));
      if (md !== state.pmd) { state.pmd = md; renderProgress(); }
    };
    hit.addEventListener("mousemove", onMove);
    hit.addEventListener("touchstart", onMove, { passive: true });

    const leg = [
      `<span><i class="sw sw-line"></i>${CUR} (bis ${curMd}. Spieltag)</span>`,
      `<span><i class="sw sw-gray"></i>Vorsaisons</span>`,
      `<span><i class="sw sw-dash"></i>Schnitt</span>`,
      `<span><i class="sw sw-range"></i>Beste bis schlechteste Saison</span>`,
    ];
    if (state.sel[0] !== null) leg.push(`<span><i class="sw sw-a"></i>A: ${data[state.sel[0]].season}</span>`);
    if (state.sel[1] !== null) leg.push(`<span><i class="sw sw-b"></i>B: ${data[state.sel[1]].season}</span>`);
    document.getElementById("progress-legend").innerHTML = leg.join("");
    document.getElementById("progress-sub").textContent =
      `Stand nach jedem Spieltag. ${CUR} gegen ${keys.length} Spielzeiten seit 2006/07. Markierte Saisons (A/B) erscheinen farbig.`;
  }

  psvg.addEventListener("mouseleave", () => { state.pmd = null; renderProgress(); });
  document.getElementById("bl2-toggle").addEventListener("change", (e) => { state.bl2 = e.target.checked; renderProgress(); });

  function renderAll() {
    renderChart();
    renderDetail();
    renderCompare();
    renderProgress();
    syncHoverClasses();
  }

  renderKpis();
  renderTabs();
  renderWdl();
  renderTable();
  renderProgressTabs();
  renderLive();
  renderAll();

  let raf;
  window.addEventListener("resize", () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => { renderChart(); renderProgress(); });
  });
})();
