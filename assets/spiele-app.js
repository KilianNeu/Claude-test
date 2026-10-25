(function () {
  "use strict";
  const S = window.SPIELE, K = window.KADER;
  if (!S || !K) return;

  const NS = "http://www.w3.org/2000/svg";
  const ME = K.teamId;
  const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmt = (n, d = 0) => Number(n).toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d });
  const signed = (n, d = 0) => (n > 0 ? "+" : n < 0 ? "−" : "±") + fmt(Math.abs(n), d);
  const dateDe = (iso) => iso.slice(8, 10) + "." + iso.slice(5, 7) + "." + iso.slice(0, 4);
  const shortDate = (iso) => iso.slice(8, 10) + "." + iso.slice(5, 7) + ".";
  const num = (v) => (typeof v === "number" ? v : parseFloat(String(v)));
  const byId = (id) => document.getElementById(id);
  const WB = (window.WB = window.WB || {});

  const matches = S.matches.slice().sort((a, b) => a.date.localeCompare(b.date));
  const isHome = (m) => m.homeId === ME;
  const mine = (m) => (isHome(m) ? m.hs : m.as);
  const theirs = (m) => (isHome(m) ? m.as : m.hs);
  const oppName = (m) => (isHome(m) ? m.away : m.home);
  const res = (m) => (mine(m) > theirs(m) ? "w" : mine(m) === theirs(m) ? "d" : "l");
  const RES = { w: "Sieg", d: "Remis", l: "Niederlage" };
  const statOf = (m, title, period = "All") => {
    const r = (m.stats[period] || []).find((x) => x[1] === title);
    if (!r) return null;
    const [h, a] = [r[2], r[3]];
    return isHome(m) ? [h, a] : [a, h];
  };
  const xgOf = (m) => {
    const v = statOf(m, "Expected goals (xG)");
    return v ? [num(v[0]), num(v[1])] : [null, null];
  };

  function svgEl(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  // ---------- Spielfeld (105 × 68 m, Angriff nach rechts) ----------
  function pitch(svg, opts = {}) {
    const g = svgEl("g", { class: "pitch" }, svg);
    svgEl("rect", { x: 0, y: 0, width: 105, height: 68, class: "pitch-bg" }, g);
    const L = (d) => svgEl("path", { d, class: "pitch-line" }, g);
    L("M0,0H105V68H0Z");
    L("M52.5,0V68");
    svgEl("circle", { cx: 52.5, cy: 34, r: 9.15, class: "pitch-line" }, g);
    L("M0,13.84H16.5V54.16H0"); L("M105,13.84H88.5V54.16H105");
    L("M0,24.84H5.5V43.16H0"); L("M105,24.84H99.5V43.16H105");
    svgEl("circle", { cx: 11, cy: 34, r: 0.4, class: "pitch-spot" }, g);
    svgEl("circle", { cx: 94, cy: 34, r: 0.4, class: "pitch-spot" }, g);
    L("M16.5,26.7A9.15,9.15 0 0 1 16.5,41.3"); L("M88.5,26.7A9.15,9.15 0 0 0 88.5,41.3");
    if (opts.goals !== false) { L("M0,30.34H-1.2V37.66H0"); L("M105,30.34H106.2V37.66H105"); }
    return g;
  }

  function shotDots(svg, shots, mirrorFn, cls) {
    shots.forEach((s) => {
      const [x, y] = mirrorFn ? mirrorFn(s.x, s.y) : [s.x, s.y];
      const r = 0.9 + Math.sqrt(s.xg || 0.01) * 3.2;
      const goal = s.res === "Goal";
      const c = svgEl("circle", { cx: x, cy: y, r, class: `shot ${cls}${goal ? " goal" : ""}` }, svg);
      const t = svgEl("title", {}, c);
      t.textContent = `${s.name || ""} ${s.min}'${s.min ? "" : ""} · xG ${fmt(s.xg || 0, 2)} · ${SHOT_RES[s.res] || s.res}${s.sit ? " · " + (SIT[s.sit] || s.sit) : ""}`;
    });
  }
  const SHOT_RES = { Goal: "Tor", AttemptSaved: "gehalten", Miss: "daneben", Post: "Pfosten", Blocked: "geblockt" };
  const SIT = { RegularPlay: "aus dem Spiel", FastBreak: "Konter", FromCorner: "nach Ecke", SetPiece: "Standard", Penalty: "Elfmeter", FreeKick: "Freistoß", ThrowInSetPiece: "nach Einwurf" };
  WB.pitch = pitch;
  WB.shotDots = shotDots;

  // ---------- Spielplan ----------
  const state = { match: matches.length ? String(matches[matches.length - 1].id) : null, period: "All" };

  function renderSchedule() {
    const box = byId("spielplan");
    const byIdx = Object.fromEntries(matches.map((m) => [String(m.id), m]));
    box.innerHTML = `<h3 class="rk-title">Spielplan</h3><p class="sub">Alle 34 Bundesliga-Spieltage. Gespielte Partien anklicken für den Spielbericht.</p>
      <div class="sched">${K.fixtures.map((f, i) => {
        const m = byIdx[String(f.id)];
        const home = f.homeId === ME;
        const opp = home ? f.away : f.home;
        if (!m) return `<div class="sg open"><span class="md">${i + 1}.</span><span class="ha">${home ? "H" : "A"}</span><span class="op">${esc(opp)}</span><span class="dt">${shortDate(f.date)}</span></div>`;
        return `<button type="button" class="sg ${res(m)}${state.match === String(m.id) ? " sel" : ""}" data-m="${m.id}" aria-pressed="${state.match === String(m.id)}">
          <span class="md">${i + 1}.</span><span class="ha">${home ? "H" : "A"}</span><span class="op">${esc(opp)}</span><b>${mine(m)}:${theirs(m)}</b></button>`;
      }).join("")}</div>`;
    box.querySelectorAll("[data-m]").forEach((b) => b.addEventListener("click", () => openMatch(b.dataset.m, true)));
  }

  function openMatch(id, scroll) {
    state.match = String(id);
    renderSchedule();
    renderReport();
    if (scroll) byId("bericht").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  WB.openMatch = (id) => openMatch(id, true);

  // ---------- Spielbericht ----------
  function renderReport() {
    const box = byId("bericht");
    const m = matches.find((x) => String(x.id) === String(state.match));
    if (!m) { box.innerHTML = `<p class="hint">Noch kein Spiel gespielt.</p>`; return; }
    const [xgW, xgO] = xgOf(m);
    const potm = m.potm && m.potm.name ? `<span>Spieler des Spiels: <b>${esc(m.potm.name)}</b>${m.potm.r ? " (" + esc(m.potm.r) + ")" : ""}</span>` : "";
    const weather = m.weather && m.weather.temp !== undefined ? `<span>${fmt(m.weather.temp)} °C${m.weather.rain ? ", Regen" : ""}</span>` : "";
    box.innerHTML = `
      <div class="rep-head ${res(m)}">
        <div class="rep-team ${isHome(m) ? "me" : ""}">${esc(m.home)}</div>
        <div class="rep-score"><b>${m.hs}:${m.as}</b><span>${RES[res(m)]} · ${m.round}. Spieltag</span></div>
        <div class="rep-team ${!isHome(m) ? "me" : ""}">${esc(m.away)}</div>
      </div>
      <div class="rep-meta">
        <span>${dateDe(m.date.slice(0, 10))}, ${m.date.slice(11, 16)} Uhr (UTC)</span>
        <span>${esc(m.stadium || "")}${m.city ? ", " + esc(m.city) : ""}</span>
        ${m.attendance ? `<span>${fmt(m.attendance)} Zuschauer</span>` : ""}
        ${m.referee ? `<span>Schiedsrichter ${esc(m.referee)}</span>` : ""}
        ${weather}${potm}
        ${xgW !== null ? `<span>xG ${fmt(isHome(m) ? xgW : xgO, 2)} : ${fmt(isHome(m) ? xgO : xgW, 2)}</span>` : ""}
      </div>
      <div class="rep-grid">
        <div class="rep-col">
          <h4>Spielverlauf</h4>
          <div class="timeline" id="rep-timeline"></div>
          <h4>Momentum <small>wer gerade Druck macht, nach FotMob-Modell</small></h4>
          <svg id="rep-momentum" class="viz momentum" role="img" aria-label="Momentum des Spiels"></svg>
          <h4>Schusskarte <small>Punktgröße = xG, ausgefüllt = Tor</small></h4>
          <svg id="rep-shots" class="pitch-svg" viewBox="-2 -2 109 72" role="img" aria-label="Schüsse beider Teams"></svg>
          <div class="legend"><span><i class="sw sw-a"></i>Werder (greift nach rechts an)</span><span><i class="sw sw-opp"></i>${esc(oppName(m))}</span></div>
        </div>
        <div class="rep-col">
          <div class="rep-statshead"><h4>Statistik</h4><div class="seg small" id="rep-period"></div></div>
          <div class="rep-stats" id="rep-stats"></div>
          <h4>Werder-Aufstellung <small>${esc((isHome(m) ? m.lineup.home : m.lineup.away)?.formation || "")} · Spieler anklicken</small></h4>
          <svg id="rep-lineup" class="pitch-svg" viewBox="-2 -2 109 72" role="img" aria-label="Werder-Aufstellung mit Noten"></svg>
          <div id="rep-bench"></div>
        </div>
      </div>
      <h4>Werder-Spieler in diesem Spiel</h4>
      <div class="table-scroll"><table class="kader rep-players" id="rep-players"></table></div>`;
    renderTimeline(m);
    renderMomentum(m);
    renderShots(m);
    renderPeriodTabs(m);
    renderStats(m);
    renderLineup(m);
    renderMatchPlayers(m);
  }

  function renderTimeline(m) {
    const box = byId("rep-timeline");
    const max = Math.max(90, ...m.events.map((e) => e.min + (e.plus || 0)));
    const icon = (e) => (e.t === "goal" ? "●" : e.t === "card" ? "" : "⇄");
    const my = (e) => (e.home === isHome(m));
    const items = m.events.map((e) => {
      const left = ((e.min + (e.plus || 0) * 0.3) / max) * 100;
      const label = e.t === "goal" ? `${e.min}' Tor ${e.name}${e.own ? " (Eigentor)" : ""}${e.how === "Penalty" ? " (Elfmeter)" : ""}${e.assist ? ", Vorlage " + e.assist : ""} · ${e.score[0]}:${e.score[1]}`
        : e.t === "card" ? `${e.min}' ${e.card === "Yellow" ? "Gelb" : e.card === "Red" ? "Rot" : "Gelb-Rot"} für ${e.name}`
        : `${e.min}' Wechsel: ${e.inn} für ${e.out}${e.injury ? " (verletzt)" : ""}`;
      const cls = `ev ${e.t} ${my(e) ? "top" : "bottom"} ${e.t === "card" ? (e.card || "").toLowerCase() : ""}`;
      return `<span class="${cls}" style="left:${left.toFixed(1)}%" title="${esc(label)}" tabindex="0" aria-label="${esc(label)}">${icon(e)}</span>`;
    }).join("");
    const goals = m.events.filter((e) => e.t === "goal").map((e) =>
      `<li class="${my(e) ? "me" : ""}"><b>${e.min}'${e.plus ? "+" + e.plus : ""}</b> ${esc(e.name)}${e.own ? " (ET)" : ""}${e.how === "Penalty" ? " (FE)" : ""}${e.assist ? ` <small>Vorlage ${esc(e.assist)}</small>` : ""} <span class="sc">${e.score[0]}:${e.score[1]}</span></li>`).join("");
    box.innerHTML = `<div class="tl-track"><span class="tl-label top">Werder</span><span class="tl-label bottom">${esc(oppName(m))}</span>
      <span class="tl-half" style="left:${(45 / max) * 100}%"></span>${items}</div>
      <div class="tl-axis"><span>0'</span><span style="left:${(45 / max) * 100}%">45'</span><span style="right:0">${max}'</span></div>
      ${goals ? `<ul class="goals">${goals}</ul>` : `<p class="hint">Keine Tore.</p>`}`;
  }

  function renderMomentum(m) {
    const svg = byId("rep-momentum");
    const W = svg.clientWidth || 500, H = 120;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = "";
    const data = m.momentum;
    if (!data.length) return;
    const maxMin = data[data.length - 1][0] || 90;
    const sign = isHome(m) ? 1 : -1; // positiv = Werder
    const x = (t) => (t / maxMin) * W, y = (v) => H / 2 - (v * sign / 100) * (H / 2 - 4);
    const pos = "M0," + H / 2 + data.map(([t, v]) => `L${x(t).toFixed(1)},${Math.min(H / 2, y(v)).toFixed(1)}`).join("") + `L${W},${H / 2}Z`;
    const neg = "M0," + H / 2 + data.map(([t, v]) => `L${x(t).toFixed(1)},${Math.max(H / 2, y(v)).toFixed(1)}`).join("") + `L${W},${H / 2}Z`;
    svgEl("path", { d: pos, class: "mom-me" }, svg);
    svgEl("path", { d: neg, class: "mom-opp" }, svg);
    svgEl("line", { x1: 0, x2: W, y1: H / 2, y2: H / 2, class: "baseline" }, svg);
    svgEl("line", { x1: x(45), x2: x(45), y1: 0, y2: H, class: "s-mean" }, svg);
    m.events.filter((e) => e.t === "goal").forEach((e) => {
      const up = e.home === isHome(m);
      svgEl("circle", { cx: x(Math.min(e.min, maxMin)), cy: up ? 8 : H - 8, r: 4, class: up ? "mom-goal me" : "mom-goal" }, svg);
    });
    svgEl("text", { x: 4, y: 14, class: "mom-l" }, svg).textContent = "Werder";
    svgEl("text", { x: 4, y: H - 6, class: "mom-l" }, svg).textContent = oppName(m);
  }

  function renderShots(m) {
    const svg = byId("rep-shots");
    svg.innerHTML = "";
    pitch(svg);
    const meSide = isHome(m) ? "h" : "a";
    shotDots(svg, m.shots.filter((s) => s.team === meSide), null, "me");
    shotDots(svg, m.shots.filter((s) => s.team !== meSide), (x, y) => [105 - x, 68 - y], "opp");
  }

  const PERIODS = { All: "Gesamt", FirstHalf: "1. HZ", SecondHalf: "2. HZ" };
  function renderPeriodTabs(m) {
    const box = byId("rep-period");
    box.innerHTML = "";
    Object.keys(PERIODS).filter((p) => m.stats[p]).forEach((p) => {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = PERIODS[p];
      b.setAttribute("aria-selected", p === state.period);
      b.addEventListener("click", () => { state.period = p; renderPeriodTabs(m); renderStats(m); });
      box.appendChild(b);
    });
  }
  const STAT_DE = {
    "Ball possession": "Ballbesitz", "Expected goals (xG)": "Expected Goals (xG)", "Total shots": "Schüsse", "Shots on target": "Schüsse aufs Tor",
    "Big chances": "Großchancen", "Big chances missed": "Großchancen vergeben", "Accurate passes": "Angekommene Pässe", "Fouls committed": "Fouls",
    "Corners": "Ecken", "Shots off target": "Schüsse daneben", "Blocked shots": "Geblockte Schüsse", "Hit woodwork": "Aluminium",
    "Shots inside box": "Schüsse im Strafraum", "Shots outside box": "Schüsse von außerhalb", "xG open play": "xG aus dem Spiel", "xG set play": "xG nach Standards",
    "xG non-penalty": "xG ohne Elfmeter", "xG on target (xGOT)": "xG aufs Tor (xGOT)", "Passes": "Pässe", "Own half": "Pässe eigene Hälfte",
    "Opposition half": "Pässe gegnerische Hälfte", "Accurate long balls": "Lange Bälle angekommen", "Accurate crosses": "Flanken angekommen", "Throws": "Einwürfe",
    "Touches in opposition box": "Ballkontakte im Strafraum", "Offsides": "Abseits", "Tackles": "Tacklings", "Interceptions": "Abgefangene Bälle",
    "Blocks": "Blocks", "Clearances": "Klärungen", "Keeper saves": "Paraden", "Duels won": "Zweikämpfe gewonnen", "Ground duels won": "Bodenzweikämpfe gewonnen",
    "Aerial duels won": "Kopfballduelle gewonnen", "Successful dribbles": "Erfolgreiche Dribblings", "Yellow cards": "Gelbe Karten", "Red cards": "Rote Karten",
  };
  function renderStats(m) {
    const rows = (m.stats[state.period] || []);
    const seen = new Set();
    const html = rows.filter((r) => { const k = r[1]; if (seen.has(k)) return false; seen.add(k); return true; }).map((r) => {
      let [h, a] = [r[2], r[3]];
      let [w, o] = isHome(m) ? [h, a] : [a, h];
      const nw = num(w), no = num(o);
      const tot = (isNaN(nw) ? 0 : nw) + (isNaN(no) ? 0 : no);
      const pw = tot ? (nw / tot) * 100 : 50;
      const label = STAT_DE[r[1]] || r[1];
      return `<div class="st-row"><span class="sv me">${esc(w)}${r[1] === "Ball possession" ? " %" : ""}</span><span class="sl">${esc(label)}</span><span class="sv">${esc(o)}${r[1] === "Ball possession" ? " %" : ""}</span>
        <span class="st-bar"><i class="me" style="width:${pw.toFixed(1)}%"></i><i style="width:${(100 - pw).toFixed(1)}%"></i></span></div>`;
    }).join("");
    byId("rep-stats").innerHTML = `<div class="st-legend"><span>Werder</span><span>${esc(oppName(m))}</span></div>${html}`;
  }

  function renderLineup(m) {
    const side = isHome(m) ? m.lineup.home : m.lineup.away;
    const svg = byId("rep-lineup");
    svg.innerHTML = "";
    if (!side) return;
    pitch(svg);
    side.starters.forEach((p) => {
      if (p.x === undefined || p.x === null) return;
      // verticalLayout: y = Tiefe (0 = eigenes Tor), x = Breite
      const cx = 4 + p.y * 97, cy = 68 - (3 + p.x * 62);
      const g = svgEl("g", { class: "lp", tabindex: 0, role: "button", "data-id": p.id }, svg);
      const r = num(p.r);
      svgEl("circle", { cx, cy, r: 4.2, class: "lp-dot" + (r >= 7.5 ? " hi" : r < 6.5 ? " lo" : "") }, g);
      svgEl("text", { x: cx, y: cy + 1.3, class: "lp-num", "text-anchor": "middle" }, g).textContent = p.num || "";
      svgEl("text", { x: cx, y: cy + 8.2, class: "lp-name", "text-anchor": "middle" }, g).textContent = p.name.split(" ").slice(-1)[0];
      if (p.r) {
        svgEl("rect", { x: cx + 2.2, y: cy - 7, width: 6.4, height: 3.6, rx: 1, class: "lp-rbg" + (r >= 7.5 ? " hi" : r < 6.5 ? " lo" : "") }, g);
        svgEl("text", { x: cx + 5.4, y: cy - 4.3, class: "lp-r", "text-anchor": "middle" }, g).textContent = fmt(r, 1);
      }
      if (p.subOut) svgEl("text", { x: cx - 5.2, y: cy - 4.3, class: "lp-sub", "text-anchor": "middle" }, g).textContent = p.subOut + "'";
      const t = svgEl("title", {}, g);
      t.textContent = `${p.name}${p.r ? ", Note " + fmt(r, 1) : ""}${p.subOut ? ", ausgewechselt " + p.subOut + "'" : ""}`;
      const open = () => WB.focusPlayer && WB.focusPlayer(p.id, true);
      g.addEventListener("click", open);
      g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
    });
    byId("rep-bench").innerHTML = side.subs.length ? `<p class="bench">Eingewechselt: ${side.subs.map((p) =>
      `<button type="button" class="linkish" data-id="${p.id}">${esc(p.name)} ${p.subIn ? p.subIn + "'" : ""}${p.r ? ` <small>(${fmt(num(p.r), 1)})</small>` : ""}</button>`).join(", ")}</p>` : "";
    byId("rep-bench").querySelectorAll("[data-id]").forEach((b) => b.addEventListener("click", () => WB.focusPlayer && WB.focusPlayer(+b.dataset.id, true)));
  }

  function renderMatchPlayers(m) {
    const t = byId("rep-players");
    const rows = Object.entries(m.pstats).map(([id, s]) => ({ id: +id, s, p: K.players.find((x) => x.id === +id) })).filter((r) => (r.s["Minutes played"] || 0) > 0);
    rows.sort((a, b) => (b.s["FotMob rating"] || 0) - (a.s["FotMob rating"] || 0));
    const cell = (v, d = 0) => (v === undefined || v === null ? "–" : Array.isArray(v) ? `${v[0]}/${v[1]}` : typeof v === "number" ? fmt(v, d) : esc(v));
    const cols = [["Min.", "Minutes played"], ["Note", "FotMob rating", 1], ["Tore", "Goals"], ["Vorl.", "Assists"], ["xG", "Expected goals (xG)", 2], ["xA", "Expected assists (xA)", 2],
      ["Schüsse", "Total shots"], ["Pässe", "Accurate passes"], ["Chancen", "Chances created"], ["Zwk. gew.", "Duels won"], ["Zwk. verl.", "Duels lost"], ["Tacklings", "Tackles"], ["Ballgew.", "Recoveries"], ["Fouls", "Fouls committed"]];
    t.innerHTML = `<thead><tr><th class="l sticky">Spieler</th>${cols.map((c) => `<th>${c[0]}</th>`).join("")}</tr></thead>
      <tbody>${rows.map((r) => `<tr data-id="${r.id}" tabindex="0"><td class="l sticky">${esc(r.p ? r.p.name : r.id)}</td>${cols.map((c) => `<td>${cell(r.s[c[1]], c[2] || 0)}</td>`).join("")}</tr>`).join("")}</tbody>`;
    t.querySelectorAll("tbody tr").forEach((tr) => tr.addEventListener("click", () => WB.focusPlayer && WB.focusPlayer(+tr.dataset.id, true)));
  }

  // ---------- Pech-Barometer ----------
  // Wahrscheinlichkeit für Sieg/Remis/Niederlage aus xG, Tore als Poisson-verteilt
  function poisson(l, k) { let p = Math.exp(-l); for (let i = 1; i <= k; i++) p *= l / i; return p; }
  function xPoints(a, b) {
    let w = 0, d = 0;
    for (let i = 0; i <= 10; i++) for (let j = 0; j <= 10; j++) {
      const p = poisson(a, i) * poisson(b, j);
      if (i > j) w += p; else if (i === j) d += p;
    }
    return { pts: 3 * w + d, w, d, l: 1 - w - d };
  }
  function renderLuck() {
    const rows = matches.map((m) => {
      const [xf, xa] = xgOf(m);
      const xp = xf !== null ? xPoints(xf, xa) : null;
      const pts = res(m) === "w" ? 3 : res(m) === "d" ? 1 : 0;
      return { m, xf, xa, xp, pts, luck: xp ? pts - xp.pts : 0 };
    });
    const totPts = rows.reduce((s, r) => s + r.pts, 0), totX = rows.reduce((s, r) => s + (r.xp ? r.xp.pts : 0), 0);
    const gf = rows.reduce((s, r) => s + mine(r.m), 0), xgf = rows.reduce((s, r) => s + (r.xf || 0), 0);
    const ga = rows.reduce((s, r) => s + theirs(r.m), 0), xga = rows.reduce((s, r) => s + (r.xa || 0), 0);
    const max = Math.max(1.5, ...rows.map((r) => Math.abs(r.luck)));
    const verdict = totPts - totX > 1 ? "Werder hat bisher mehr Punkte, als die Chancen hergeben." : totPts - totX < -1 ? "Werder hat bisher weniger Punkte, als die Chancen hergeben." : "Punkte und Chancen passen ungefähr zusammen.";
    byId("pech").innerHTML = `<h3 class="rk-title">Pech-Barometer</h3>
      <p class="sub">Echte Punkte gegen erwartete Punkte nach xG. Rechts: glücklicher als verdient, links: Pech.</p>
      <div class="luck-sum">
        <div><b>${totPts}</b><span>Punkte</span></div><div><b>${fmt(totX, 1)}</b><span>erwartet nach xG</span></div>
        <div><b class="${totPts - totX >= 0 ? "up" : "down"}">${signed(totPts - totX, 1)}</b><span>Glück/Pech</span></div>
        <div><b>${gf} <small>/ ${fmt(xgf, 1)}</small></b><span>Tore / xG</span></div><div><b>${ga} <small>/ ${fmt(xga, 1)}</small></b><span>Gegentore / xG gegen</span></div>
      </div>
      <p class="verdict">${verdict} Vorne trifft Werder ${gf >= xgf ? "besser" : "schlechter"} als erwartet (${signed(gf - xgf, 1)}), hinten kassiert Werder ${ga <= xga ? "weniger" : "mehr"} als erwartet (${signed(ga - xga, 1)}).</p>
      <div class="luck">${rows.map((r) => `<button type="button" class="luck-row" data-m="${r.m.id}">
        <span class="lo-opp">${r.m.round}. ${isHome(r.m) ? "vs." : "@"} ${esc(oppName(r.m))}</span>
        <span class="lo-res ${res(r.m)}">${mine(r.m)}:${theirs(r.m)}</span>
        <span class="lo-xg">xG ${r.xf !== null ? fmt(r.xf, 1) + ":" + fmt(r.xa, 1) : "–"}</span>
        <span class="lo-bar"><i class="${r.luck >= 0 ? "pos" : "neg"}" style="${r.luck >= 0 ? "left:50%" : `right:50%`};width:${(Math.abs(r.luck) / max) * 50}%"></i></span>
        <span class="lo-val">${r.xp ? `${r.pts} statt ${fmt(r.xp.pts, 1)}` : ""}</span>
      </button>`).join("")}</div>
      <p class="hint">Erwartete Punkte: aus dem xG beider Teams berechnet, wie oft dieses Spiel bei gleichen Chancen gewonnen, remis gespielt oder verloren würde (Poisson-Modell).</p>`;
    byId("pech").querySelectorAll("[data-m]").forEach((b) => b.addEventListener("click", () => openMatch(b.dataset.m, true)));
  }

  // ---------- Halbzeit-Analyse ----------
  function renderHalves() {
    const buckets = [[0, 15], [16, 30], [31, 45], [46, 60], [61, 75], [76, 90]];
    const bf = buckets.map(() => 0), ba = buckets.map(() => 0);
    let h1f = 0, h1a = 0, h2f = 0, h2a = 0;
    const flips = { leadLost: 0, behindWon: 0, htLead: 0, htBehind: 0, htDraw: 0 };
    matches.forEach((m) => {
      let htF = 0, htA = 0;
      m.events.filter((e) => e.t === "goal").forEach((e) => {
        const forUs = e.home === isHome(m);
        const first = e.min <= 45;
        const idx = buckets.findIndex(([a, b]) => e.min >= a && e.min <= b);
        const bi = idx < 0 ? buckets.length - 1 : idx;
        if (forUs) { bf[bi]++; first ? h1f++ : h2f++; if (first) htF++; } else { ba[bi]++; first ? h1a++ : h2a++; if (first) htA++; }
      });
      const ft = res(m);
      if (htF > htA) { flips.htLead++; if (ft !== "w") flips.leadLost++; }
      else if (htF < htA) { flips.htBehind++; if (ft !== "l") flips.behindWon++; }
      else flips.htDraw++;
    });
    const max = Math.max(1, ...bf, ...ba);
    const poss = (p) => { const v = matches.map((m) => statOf(m, "Ball possession", p)).filter(Boolean).map((v) => num(v[0])); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
    const xgH = (p) => matches.map((m) => statOf(m, "Expected goals (xG)", p)).filter(Boolean).reduce((s, v) => [s[0] + num(v[0]), s[1] + num(v[1])], [0, 0]);
    const x1 = xgH("FirstHalf"), x2 = xgH("SecondHalf");
    byId("halbzeit").innerHTML = `<h3 class="rk-title">Halbzeit-Analyse</h3>
      <p class="sub">Wann fallen Werders Tore und Gegentore?</p>
      <div class="halves">
        <div class="half"><span>1. Halbzeit</span><b>${h1f}:${h1a}</b><small>xG ${fmt(x1[0], 1)}:${fmt(x1[1], 1)} · Ballbesitz ${poss("FirstHalf") !== null ? fmt(poss("FirstHalf"), 0) + " %" : "–"}</small></div>
        <div class="half"><span>2. Halbzeit</span><b>${h2f}:${h2a}</b><small>xG ${fmt(x2[0], 1)}:${fmt(x2[1], 1)} · Ballbesitz ${poss("SecondHalf") !== null ? fmt(poss("SecondHalf"), 0) + " %" : "–"}</small></div>
      </div>
      <div class="buckets" role="img" aria-label="Tore und Gegentore je 15 Minuten">
        ${buckets.map(([a, b], i) => `<div class="bk">
          <div class="bk-bars"><i class="f" style="height:${(bf[i] / max) * 100}%" title="${bf[i]} Tore"><span>${bf[i] || ""}</span></i><i class="a" style="height:${(ba[i] / max) * 100}%" title="${ba[i]} Gegentore"><span>${ba[i] || ""}</span></i></div>
          <span class="bk-l">${a}–${b}'</span></div>`).join("")}
      </div>
      <div class="legend"><span><i class="sw sw-w"></i>Tore</span><span><i class="sw sw-l"></i>Gegentore</span><span>Nachspielzeit zählt zum Abschnitt davor</span></div>
      <ul class="facts-list">
        <li>Zur Pause geführt: <b>${flips.htLead}×</b>${flips.htLead ? `, davon ${flips.leadLost}× nicht gewonnen` : ""}</li>
        <li>Zur Pause hinten: <b>${flips.htBehind}×</b>${flips.htBehind ? `, davon ${flips.behindWon}× noch gepunktet` : ""}</li>
        <li>Zur Pause unentschieden: <b>${flips.htDraw}×</b></li>
      </ul>`;
  }

  // ---------- Werder im Ligavergleich ----------
  const TS = {
    rating_team: ["FotMob-Note", "o"], goals_team_match: ["Tore pro Spiel", "o"], expected_goals_team: ["xG gesamt", "o"], _xg_diff_team: ["xG-Differenz", "o"],
    ontarget_scoring_att_team: ["Schüsse aufs Tor pro Spiel", "o"], big_chance_team: ["Großchancen", "o"], big_chance_missed_team: ["Vergebene Großchancen", "o"],
    touches_in_opp_box_team: ["Ballkontakte im Strafraum", "o"], _set_piece_goals_team: ["Tore nach Standards", "o"], penalty_won_team: ["Elfmeter bekommen", "o"],
    corner_taken_team: ["Ecken", "o"], accurate_pass_team: ["Angekommene Pässe pro Spiel", "b"], possession_percentage_team: ["Ballbesitz in %", "b"],
    accurate_long_balls_team: ["Lange Bälle pro Spiel", "b"], accurate_cross_team: ["Flanken pro Spiel", "b"],
    goals_conceded_team_match: ["Gegentore pro Spiel", "d"], expected_goals_conceded_team: ["xG gegen", "d"], clean_sheet_team: ["Spiele ohne Gegentor", "d"],
    total_tackle_team: ["Tacklings pro Spiel", "d"], interception_team: ["Abgefangene Bälle pro Spiel", "d"], effective_clearance_team: ["Klärungen pro Spiel", "d"],
    poss_won_att_3rd_team: ["Ballgewinne im letzten Drittel", "d"], saves_team: ["Paraden pro Spiel", "d"], _set_piece_goals_conceded_team: ["Gegentore nach Standards", "d"],
    penalty_conceded_team: ["Elfmeter verursacht", "d"], fk_foul_lost_team: ["Fouls pro Spiel", "x"], total_yel_card_team: ["Gelbe Karten", "x"], total_red_card_team: ["Rote Karten", "x"],
    home_attendance_team: ["Zuschauer pro Heimspiel", "x"], squad_value_team: ["Kaderwert", "x"],
  };
  const TSG = { o: "Offensive", b: "Ballbesitz und Passspiel", d: "Defensive", x: "Sonstiges" };
  function renderLeague() {
    const groups = {};
    S.teamStats.forEach((s) => { const d = TS[s.key]; if (!d) return; (groups[d[1]] = groups[d[1]] || []).push({ ...s, label: d[0] }); });
    const val = (s) => (s.key === "squad_value_team" ? fmt(s.value / 1e6, 0) + " Mio. €" : s.key === "home_attendance_team" ? fmt(s.value) : fmt(s.value, s.value % 1 ? 1 : 0));
    byId("ligavergleich").innerHTML = `<h3 class="rk-title">Werder im Ligavergleich</h3>
      <p class="sub">Rang unter den 18 Bundesligisten in jeder FotMob-Wertung. Rang 1 ist der Ligaspitzenwert der Wertung, bei Gegentoren der niedrigste.</p>
      ${Object.keys(TSG).filter((g) => groups[g]).map((g) => `<h4>${TSG[g]}</h4><div class="lv">${groups[g].map((s) => `
        <div class="lv-row"><span class="lv-l">${esc(s.label)}</span>
          <span class="lv-track" aria-hidden="true">${Array.from({ length: 18 }, (_, i) => `<i class="${i + 1 === s.rank ? "me" : ""}"></i>`).join("")}</span>
          <span class="lv-v"><b>${s.rank}.</b> ${val(s)}</span>
          <span class="lv-top">Spitze: ${esc(s.top[0] ? s.top[0][0] : "")}</span></div>`).join("")}</div>`).join("")}`;
  }

  // ---------- Prognose (Monte-Carlo) ----------
  function renderForecast() {
    const table = K.table;
    const teams = table.map((r) => r.id);
    const stat = Object.fromEntries(table.map((r) => {
      const [gf, ga] = r.goals.split("-").map(Number);
      // Stärke aus xG und Toren gemischt, zur Mitte gezogen (wenige Spiele)
      const g = Math.max(1, r.played);
      const att = ((r.xg ?? gf) * 0.6 + gf * 0.4) / g, def = ((r.xga ?? ga) * 0.6 + ga * 0.4) / g;
      return [r.id, { att, def, pts: r.pts, gd: r.diff, gf }];
    }));
    const avg = teams.reduce((s, t) => s + stat[t].att, 0) / teams.length;
    const shrink = (v) => (v * 6 + avg * 4) / 10;
    teams.forEach((t) => { stat[t].att = shrink(stat[t].att) / avg; stat[t].def = shrink(stat[t].def) / avg; });
    const HOME = 1.1;
    const rest = S.leagueFixtures.filter((f) => !f[3] && stat[f[1]] && stat[f[2]]);
    const done = S.leagueFixtures.filter((f) => f[3]).length;
    const N = 4000;
    const posCount = Array(19).fill(0);
    let ptsSum = 0;
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const pois = (l) => { const L = Math.exp(-l); let k = 0, p = 1; do { k++; p *= rnd(); } while (p > L); return k - 1; };
    for (let n = 0; n < N; n++) {
      const pts = {}, gd = {};
      teams.forEach((t) => { pts[t] = stat[t].pts; gd[t] = stat[t].gd; });
      for (const [, h, a] of rest) {
        const lh = avg * stat[h].att * stat[a].def * HOME, la = avg * stat[a].att * stat[h].def / HOME;
        const gh = pois(lh), ga = pois(la);
        gd[h] += gh - ga; gd[a] += ga - gh;
        if (gh > ga) pts[h] += 3; else if (gh < ga) pts[a] += 3; else { pts[h]++; pts[a]++; }
      }
      const order = teams.slice().sort((x, y) => pts[y] - pts[x] || gd[y] - gd[x] || rnd() - 0.5);
      posCount[order.indexOf(ME) + 1]++;
      ptsSum += pts[ME];
    }
    const prob = (a, b) => posCount.slice(a, b + 1).reduce((s, v) => s + v, 0) / N * 100;
    const maxP = Math.max(...posCount.slice(1));
    const mostLikely = posCount.indexOf(maxP);
    // Restprogramm: durchschnittliche Stärke der Gegner
    const mineRest = rest.filter((f) => f[1] === ME || f[2] === ME);
    const oppStr = (t) => stat[t].att / stat[t].def;
    const avgOpp = mineRest.reduce((s, f) => s + oppStr(f[1] === ME ? f[2] : f[1]), 0) / Math.max(1, mineRest.length);
    const leagueAvgOpp = teams.filter((t) => t !== ME).reduce((s, t) => s + oppStr(t), 0) / (teams.length - 1);
    const hard = avgOpp > leagueAvgOpp * 1.03 ? "schwerer als der Schnitt" : avgOpp < leagueAvgOpp * 0.97 ? "leichter als der Schnitt" : "durchschnittlich schwer";
    const next5 = mineRest.slice(0, 5).map((f) => { const opp = f[1] === ME ? f[2] : f[1]; const r = table.find((x) => x.id === opp); return `${f[1] === ME ? "vs." : "@"} ${esc(S.teams[opp] || r?.name)} <small>(${r ? r.pos + "." : ""})</small>`; });
    byId("prognose").innerHTML = `<h3 class="rk-title">Prognose für den Endplatz</h3>
      <p class="sub">${fmt(N)} simulierte Rest-Saisons nach Stärke aus xG und Toren, mit Heimvorteil. ${done} von 306 Ligaspielen sind gespielt, früh in der Saison ist die Prognose noch sehr unsicher.</p>
      <div class="fc-sum">
        <div><b>${mostLikely}.</b><span>wahrscheinlichster Platz</span></div>
        <div><b>${fmt(ptsSum / N, 0)}</b><span>erwartete Punkte</span></div>
        <div><b>${fmt(prob(1, 4), 0)} %</b><span>Champions League (1–4)</span></div>
        <div><b>${fmt(prob(5, 7), 0)} %</b><span>Europapokal (5–7)</span></div>
        <div><b>${fmt(prob(16, 16), 0)} %</b><span>Relegation (16)</span></div>
        <div><b>${fmt(prob(17, 18), 0)} %</b><span>Abstieg (17–18)</span></div>
      </div>
      <div class="fc-bars" role="img" aria-label="Wahrscheinlichkeit je Endplatz">${posCount.slice(1).map((c, i) => `<div class="fc-b ${i + 1 <= 4 ? "cl" : i + 1 <= 7 ? "eu" : i + 1 >= 17 ? "ab" : i + 1 === 16 ? "rel" : ""}" title="Platz ${i + 1}: ${fmt(c / N * 100, 1)} %">
        <span class="fc-v">${c / N >= 0.05 ? fmt(c / N * 100, 0) : ""}</span><i style="height:${(c / maxP) * 100}%"></i><span class="fc-l">${i + 1}</span></div>`).join("")}</div>
      <p class="verdict">Restprogramm: ${mineRest.length} Spiele, ${hard}. Die nächsten Gegner: ${next5.join(", ")}.</p>`;
  }

  // ---------- Kader & Verein ----------
  function renderClub() {
    const sq = K.players;
    const ages = sq.map((p) => p.age).filter(Boolean);
    const avgAge = ages.reduce((a, b) => a + b, 0) / ages.length;
    const minsAge = sq.filter((p) => p.mins && p.age).reduce((s, p) => [s[0] + p.age * p.mins, s[1] + p.mins], [0, 0]);
    const groups = [["bis 21", 0, 21], ["22–25", 22, 25], ["26–29", 26, 29], ["30+", 30, 99]];
    const gmax = Math.max(...groups.map((g) => sq.filter((p) => p.age >= g[1] && p.age <= g[2]).length));
    const nat = {};
    sq.forEach((p) => { if (p.nat) nat[p.nat] = (nat[p.nat] || 0) + 1; });
    const natList = Object.entries(nat).sort((a, b) => b[1] - a[1]);
    const years = {};
    sq.forEach((p) => { const y = p.contract ? p.contract.slice(0, 4) : "unbekannt"; (years[y] = years[y] || []).push(p); });
    const injured = sq.filter((p) => p.injured);
    const mv = (p) => (p.mv.length ? p.mv[p.mv.length - 1][1] : 0);
    const totalMv = sq.reduce((s, p) => s + mv(p), 0);
    const topMv = sq.slice().sort((a, b) => mv(b) - mv(a)).slice(0, 8);
    const loans = sq.filter((p) => p.onLoan);
    byId("struktur").innerHTML = `<h3 class="rk-title">Kaderstruktur</h3><p class="sub">${sq.length} Spieler im Profikader</p>
      <div class="luck-sum three"><div><b>${fmt(avgAge, 1)}</b><span>Jahre im Schnitt</span></div><div><b>${minsAge[1] ? fmt(minsAge[0] / minsAge[1], 1) : "–"}</b><span>Jahre, gewichtet nach Minuten</span></div><div><b>${natList.length}</b><span>Nationen</span></div></div>
      <h4>Altersgruppen</h4>
      <div class="agebars">${groups.map((g) => { const ps = sq.filter((p) => p.age >= g[1] && p.age <= g[2]); return `<div class="ab-row"><span>${g[0]}</span><span class="ab-t"><i style="width:${(ps.length / gmax) * 100}%"></i></span><b>${ps.length}</b><small>${ps.map((p) => esc(p.name.split(" ").slice(-1)[0])).join(", ")}</small></div>`; }).join("")}</div>
      <h4>Herkunft</h4>
      <div class="nat">${natList.map(([n, c]) => `<span class="pill-n">${esc(NAT_DE[n] || n)} <b>${c}</b></span>`).join("")}</div>
      ${loans.length ? `<h4>Leihspieler</h4><p class="small">${loans.map((p) => esc(p.name)).join(", ")}</p>` : ""}`;
    byId("vertraege").innerHTML = `<h3 class="rk-title">Vertragslaufzeiten</h3><p class="sub">Bis wann die Spieler gebunden sind (bei Leihspielern das Leihende laut FotMob)</p>
      <div class="contracts">${Object.keys(years).sort().map((y) => `<div class="ct-row"><b>${y}</b><span>${years[y].sort((a, b) => a.name.localeCompare(b.name)).map((p) => `<button type="button" class="linkish" data-id="${p.id}">${esc(p.name)}</button>`).join(", ")}</span></div>`).join("")}</div>
      <h3 class="rk-title" style="margin-top:18px">Verletzt oder angeschlagen</h3>
      ${injured.length ? `<ul class="inj-list">${injured.map((p) => `<li><b>${esc(p.name)}</b><span>Rückkehr: ${esc(RET_DE(p.injuryReturn))}</span></li>`).join("")}</ul>` : `<p class="hint">Aktuell keine Verletzten gemeldet.</p>`}`;
    byId("kaderwert").innerHTML = `<h3 class="rk-title">Kaderwert</h3><p class="sub">Geschätzte Marktwerte (SciSports über FotMob, nicht Transfermarkt)</p>
      <div class="luck-sum three"><div><b>${fmt(totalMv / 1e6, 1)}</b><span>Mio. € gesamt</span></div><div><b>${fmt(totalMv / sq.length / 1e6, 1)}</b><span>Mio. € pro Spieler</span></div><div><b>${fmt((mv(topMv[0]) / totalMv) * 100, 0)} %</b><span>des Werts entfallen auf ${esc(topMv[0].name.split(" ").slice(-1)[0])}</span></div></div>
      <ol class="rank-list">${topMv.map((p, i) => `<li class="rank-row"><span class="rk">${i + 1}.</span><span class="nm"><button type="button" class="linkish" data-id="${p.id}">${esc(p.name)}</button></span><span class="val">${fmt(mv(p) / 1e6, 1)} <small>Mio. €</small></span><span class="bar"><i style="width:${(mv(p) / mv(topMv[0])) * 100}%"></i></span></li>`).join("")}</ol>`;
    // Transfers 2026
    const tr = S.transfers.filter((t) => !t.ext);
    const fee = (t) => t.fee || t.est || 0;
    const ins = tr.filter((t) => t.in), outs = tr.filter((t) => !t.in);
    const sum = (a) => a.reduce((s, t) => s + fee(t), 0);
    const feeTxt = (t) => (t.fee ? fmt(t.fee / 1e6, t.fee % 1e6 ? 2 : 0) + " Mio. €" : t.est ? "ca. " + fmt(t.est / 1e6, 2) + " Mio. €" : { "on loan": "Leihe", "free transfer": "ablösefrei", undisclosed: "unbekannt", fee: "Ablöse" }[t.feeText] || esc(t.feeText || ""));
    const list = (arr, dir) => `<ul class="tr-list">${arr.map((t) => `<li><span class="tr-d">${shortDate(t.date)}${t.date.slice(2, 4)}</span><span class="tr-n"><b>${esc(t.name)}</b> <small>${esc(t.pos || "")}</small><br><small>${dir} ${esc(t.club)}</small></span><span class="tr-f ${t.fee ? "money" : ""}">${feeTxt(t)}${t.loan && t.fee ? " Leihgebühr" : ""}</span></li>`).join("")}</ul>`;
    byId("transfers26").innerHTML = `<h3 class="rk-title">Wechsel 2026</h3><p class="sub">Alle Zu- und Abgänge laut FotMob, inklusive Leihen</p>
      <div class="luck-sum three"><div><b>${fmt(sum(ins) / 1e6, 1)}</b><span>Mio. € ausgegeben</span></div><div><b>${fmt(sum(outs) / 1e6, 1)}</b><span>Mio. € eingenommen</span></div><div><b class="${sum(outs) - sum(ins) >= 0 ? "up" : "down"}">${signed((sum(outs) - sum(ins)) / 1e6, 1)}</b><span>Mio. € Transfersaldo</span></div></div>
      <div class="grid-2 tight"><div><h4>Zugänge (${ins.length})</h4>${list(ins, "von")}</div><div><h4>Abgänge (${outs.length})</h4>${list(outs, "zu")}</div></div>
      <p class="hint">Vertragsverlängerungen: ${S.transfers.filter((t) => t.ext).map((t) => esc(t.name)).join(", ") || "keine"}.</p>`;
    document.querySelectorAll("#struktur [data-id], #vertraege [data-id], #kaderwert [data-id]").forEach((b) => b.addEventListener("click", () => WB.focusPlayer && WB.focusPlayer(+b.dataset.id, true)));
  }
  const NAT_DE = { Germany: "Deutschland", Austria: "Österreich", Netherlands: "Niederlande", Belgium: "Belgien", Switzerland: "Schweiz", Poland: "Polen", Estonia: "Estland", Denmark: "Dänemark", France: "Frankreich", Spain: "Spanien", Brazil: "Brasilien", Ghana: "Ghana", Senegal: "Senegal", Nigeria: "Nigeria", Sweden: "Schweden", Norway: "Norwegen", Turkey: "Türkei", Türkiye: "Türkei", Turkiye: "Türkei", Kosovo: "Kosovo", England: "England", USA: "USA", Japan: "Japan", "Ivory Coast": "Elfenbeinküste", Morocco: "Marokko", Guinea: "Guinea", Croatia: "Kroatien", Serbia: "Serbien", Finland: "Finnland", Iceland: "Island", Mali: "Mali", Cameroon: "Kamerun", "DR Congo": "DR Kongo", Italy: "Italien", Portugal: "Portugal", Czechia: "Tschechien", Slovakia: "Slowakei", Hungary: "Ungarn", Albania: "Albanien", Greece: "Griechenland" };
  function RET_DE(s) {
    if (!s) return "offen";
    const M = { January: "Januar", February: "Februar", March: "März", April: "April", May: "Mai", June: "Juni", July: "Juli", August: "August", September: "September", October: "Oktober", November: "November", December: "Dezember" };
    return s.replace("Early", "Anfang").replace("Mid", "Mitte").replace("Late", "Ende").replace(/January|February|March|April|May|June|July|August|September|October|November|December/, (x) => M[x]);
  }

  // ---------- Fans: Derby, Vorschau, Momente ----------
  function h2hSummary(g) {
    const w = g.filter((x) => x.w > x.o).length, d = g.filter((x) => x.w === x.o).length, l = g.filter((x) => x.w < x.o).length;
    const gf = g.reduce((s, x) => s + x.w, 0), ga = g.reduce((s, x) => s + x.o, 0);
    return { w, d, l, gf, ga };
  }
  function h2hBlock(pv, title, countdown) {
    if (!pv) return "";
    const g = pv.games;
    const s = h2hSummary(g);
    const tot = Math.max(1, g.length);
    const lastWin = g.find((x) => x.w > x.o);
    const best = g.slice().sort((a, b) => (b.w - b.o) - (a.w - a.o))[0];
    const worst = g.slice().sort((a, b) => (a.w - a.o) - (b.w - b.o))[0];
    const days = Math.ceil((new Date(pv.date + ":00Z") - new Date()) / 864e5);
    return `<h3 class="rk-title">${title}</h3>
      <p class="sub">${pv.home ? "Werder Bremen – " + esc(pv.opponent) : esc(pv.opponent) + " – Werder Bremen"} · ${dateDe(pv.date.slice(0, 10))}${pv.stadium ? " · " + esc(pv.stadium) : ""}</p>
      ${countdown && days >= 0 ? `<div class="countdown"><b>${days}</b><span>${days === 1 ? "Tag" : "Tage"} bis zum Anpfiff</span></div>` : ""}
      <div class="h2h-bar" role="img" aria-label="${s.w} Siege, ${s.d} Remis, ${s.l} Niederlagen"><i class="w" style="width:${(s.w / tot) * 100}%">${s.w}</i><i class="d" style="width:${(s.d / tot) * 100}%">${s.d}</i><i class="l" style="width:${(s.l / tot) * 100}%">${s.l}</i></div>
      <div class="wdl-caption"><span>${s.w} Werder-Siege</span><span>${s.d} Remis</span><span>${s.l} Niederlagen</span></div>
      <ul class="facts-list">
        <li>Tore in den letzten ${g.length} Duellen: <b>${s.gf}:${s.ga}</b></li>
        ${lastWin ? `<li>Letzter Werder-Sieg: <b>${lastWin.w}:${lastWin.o}</b> am ${dateDe(lastWin.date)}</li>` : ""}
        ${best && best.w > best.o ? `<li>Höchster Sieg darunter: <b>${best.w}:${best.o}</b> (${best.date.slice(0, 4)})</li>` : ""}
        ${worst && worst.w < worst.o ? `<li>Höchste Niederlage darunter: <b>${worst.w}:${worst.o}</b> (${worst.date.slice(0, 4)})</li>` : ""}
      </ul>
      <div class="h2h-games">${g.slice(0, 10).map((x) => `<span class="hg ${x.w > x.o ? "w" : x.w === x.o ? "d" : "l"}" title="${esc(x.home)} – ${esc(x.away)} ${x.hs}:${x.as}, ${dateDe(x.date)}${x.league ? ", " + esc(x.league) : ""}"><b>${x.w}:${x.o}</b><small>${x.date.slice(2, 4)}/${x.date.slice(5, 7)}</small></span>`).join("")}</div>
      <p class="hint">Aus Werder-Sicht, neueste zuerst. Quelle: FotMob, ${g.length} Pflichtspiele.</p>`;
  }
  function renderFans() {
    const pv = S.previews || {};
    byId("derby").innerHTML = pv.derby ? h2hBlock(pv.derby, "Nordderby", true) : `<h3 class="rk-title">Nordderby</h3><p class="hint">Kein Derby im Spielplan.</p>`;
    // Vorschau: Gegner in der Tabelle und Form
    let preview = "";
    if (pv.next) {
      const opp = K.table.find((r) => r.name === pv.next.opponent || S.teams[r.id] === pv.next.opponent);
      const me = K.table.find((r) => r.id === ME);
      preview = h2hBlock(pv.next, "Nächstes Spiel", true) + (opp ? `<div class="vs-table">
        <div><span>Werder</span><b>${me.pos}.</b><small>${me.pts} Pkt. · ${me.goals.replace("-", ":")}</small></div>
        <div><span>${esc(opp.name)}</span><b>${opp.pos}.</b><small>${opp.pts} Pkt. · ${opp.goals.replace("-", ":")}</small></div></div>` : "");
    }
    byId("vorschau").innerHTML = preview || `<p class="hint">Kein kommendes Spiel.</p>`;
    // Momente der Saison
    const moments = [];
    let bestPerf = null;
    K.players.forEach((p) => p.games.forEach((g) => { if (g.r && (!bestPerf || g.r > bestPerf.g.r)) bestPerf = { p, g }; }));
    if (bestPerf) moments.push(["Beste Einzelleistung", `${bestPerf.p.name}: Note ${fmt(bestPerf.g.r, 1)}`, `${bestPerf.g.home ? "gegen" : "bei"} ${bestPerf.g.opp}${bestPerf.g.g ? `, ${bestPerf.g.g} Tor${bestPerf.g.g > 1 ? "e" : ""}` : ""}${bestPerf.g.a ? `, ${bestPerf.g.a} Vorlage${bestPerf.g.a > 1 ? "n" : ""}` : ""}`, null, bestPerf.p.id]);
    const wins = matches.filter((m) => res(m) === "w");
    const bigWin = wins.slice().sort((a, b) => (mine(b) - theirs(b)) - (mine(a) - theirs(a)) || mine(b) - mine(a))[0];
    if (bigWin) moments.push(["Höchster Sieg", `${mine(bigWin)}:${theirs(bigWin)} ${isHome(bigWin) ? "gegen" : "bei"} ${oppName(bigWin)}`, `${bigWin.round}. Spieltag`, bigWin.id]);
    const comeback = matches.find((m) => {
      let f = 0, a = 0, behind = false;
      m.events.filter((e) => e.t === "goal").forEach((e) => { if (e.home === isHome(m)) f++; else a++; if (a > f) behind = true; });
      return behind && res(m) !== "l";
    });
    if (comeback) moments.push(["Comeback", `${mine(comeback)}:${theirs(comeback)} ${isHome(comeback) ? "gegen" : "bei"} ${oppName(comeback)}`, "nach Rückstand noch gepunktet", comeback.id]);
    const late = [];
    matches.forEach((m) => m.events.filter((e) => e.t === "goal" && e.home === isHome(m) && e.min >= 85).forEach((e) => late.push({ m, e })));
    if (late.length) { const l = late[late.length - 1]; moments.push(["Später Treffer", `${l.e.name}, ${l.e.min}'${l.e.plus ? "+" + l.e.plus : ""}`, `${isHome(l.m) ? "gegen" : "bei"} ${oppName(l.m)} zum ${l.e.score[isHome(l.m) ? 0 : 1]}:${l.e.score[isHome(l.m) ? 1 : 0]}`, l.m.id]);}
    let bigShot = null;
    matches.forEach((m) => m.shots.filter((s) => s.team === (isHome(m) ? "h" : "a") && s.res === "Goal" && s.sit !== "Penalty").forEach((s) => { if (!bigShot || s.xg < bigShot.s.xg) bigShot = { m, s }; }));
    if (bigShot) moments.push(["Unwahrscheinlichstes Tor", `${bigShot.s.name}, ${bigShot.s.min}'`, `nur ${fmt(bigShot.s.xg * 100, 0)} % Torchance (xG ${fmt(bigShot.s.xg, 2)}) ${isHome(bigShot.m) ? "gegen" : "bei"} ${oppName(bigShot.m)}`, bigShot.m.id]);
    const crowd = matches.filter((m) => m.attendance).sort((a, b) => b.attendance - a.attendance)[0];
    if (crowd) moments.push(["Größte Kulisse", `${fmt(crowd.attendance)} Zuschauer`, `${crowd.stadium}, ${isHome(crowd) ? "gegen" : "bei"} ${oppName(crowd)}`, crowd.id]);
    byId("momente").innerHTML = `<h3 class="rk-title">Momente der Saison</h3><p class="sub">Automatisch aus den Spieldaten ermittelt. Anklicken öffnet Spiel oder Spieler.</p>
      <div class="moments">${moments.map(([t, big, small, mid, pid]) => `<button type="button" class="moment" ${mid ? `data-m="${mid}"` : ""} ${pid ? `data-id="${pid}"` : ""}><span class="mt">${esc(t)}</span><b>${esc(big)}</b><small>${esc(small)}</small></button>`).join("")}</div>`;
    byId("momente").querySelectorAll(".moment").forEach((b) => b.addEventListener("click", () => {
      if (b.dataset.m) openMatch(b.dataset.m, true); else if (b.dataset.id) WB.focusPlayer && WB.focusPlayer(+b.dataset.id, true);
    }));
  }

  renderSchedule();
  renderReport();
  renderLuck();
  renderHalves();
  renderLeague();
  renderForecast();
  renderClub();
  renderFans();
  let raf;
  window.addEventListener("resize", () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { const m = matches.find((x) => String(x.id) === String(state.match)); if (m) renderMomentum(m); }); });
})();
