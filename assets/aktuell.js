(function () {
  "use strict";
  const K = window.KADER;
  if (!K) return;

  const SVG_NS = "http://www.w3.org/2000/svg";
  const MIN_MINS = 270; // Mindestminuten für Quoten und Noten in den Bestenlisten
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmt = (n, d = 0) => n.toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d });
  const signed = (n, d = 0) => (n > 0 ? "+" : n < 0 ? "−" : "±") + fmt(Math.abs(n), d);
  const dateDe = (iso) => iso.slice(8, 10) + "." + iso.slice(5, 7) + ".";
  // Kurzname: letztes Wort, außer es ist ein Zusatz wie "05" oder "FC"
  const short = (name) => {
    const parts = name.split(" ");
    if (parts.length < 2) return name;
    const last = parts[parts.length - 1];
    return /^\d+$/.test(last) || last.length <= 2 ? parts[0] : last;
  };

  const players = K.players.slice();
  const played = players.filter((p) => p.apps > 0);
  const POS_NAME = { TW: "Torwart", AB: "Abwehr", MF: "Mittelfeld", ST: "Sturm" };
  const POS_ORDER = { TW: 0, AB: 1, MF: 2, ST: 3 };

  // ---------- Werte ----------
  const sv = (p, k) => (p.s[k] ? p.s[k].v : null);
  const spct = (p, k) => (p.s[k] ? p.s[k].pct : null);
  const per90 = (p, v) => (v === null || !p.mins ? null : (v / p.mins) * 90);
  function missedPasses(p) {
    const acc = sv(p, "acc_pass"), pct = sv(p, "pass_pct");
    if (acc === null || !pct) return null;
    return Math.round(acc / (pct / 100)) - acc;
  }

  // Spalten: get = Gesamtwert, p90 = pro 90 sinnvoll, d = Nachkommastellen, pk = Schlüssel des FotMob-Perzentils
  const C = {
    apps:   { label: "Sp.", title: "Bundesliga-Einsätze", get: (p) => p.apps },
    starts: { label: "S11", title: "Spiele in der Startelf", get: (p) => p.starts },
    mins:   { label: "Min.", title: "Gespielte Minuten", get: (p) => p.mins },
    sub_in: { label: "Ein", title: "Eingewechselt", get: (p) => p.sub_in },
    sub_out:{ label: "Aus", title: "Ausgewechselt", get: (p) => p.sub_out },
    rating: { label: "Note", title: "FotMob-Durchschnittsnote (1–10, höher ist besser)", get: (p) => p.rating, d: 2 },
    motm:   { label: "SdS", title: "Spieler des Spiels laut FotMob", get: (p) => p.motm },
    goals:  { label: "Tore", title: "Tore", get: (p) => sv(p, "goals") ?? (p.apps ? 0 : null), p90: true, pk: "goals" },
    assists:{ label: "Vorl.", title: "Torvorlagen", get: (p) => sv(p, "assists") ?? (p.apps ? 0 : null), p90: true, pk: "assists" },
    yellow: { label: "Gelb", title: "Gelbe Karten", get: (p) => sv(p, "yellow") ?? (p.apps ? 0 : null), lowGood: true },
    red:    { label: "Rot", title: "Rote Karten", get: (p) => sv(p, "red") ?? (p.apps ? 0 : null), lowGood: true },
    xg:     { label: "xG", title: "Expected Goals: so viele Tore wären nach Qualität der Schüsse zu erwarten", get: (p) => sv(p, "xg"), p90: true, d: 2, pk: "xg" },
    gxg:    { label: "T−xG", title: "Tore minus xG: positiv heißt, er trifft besser als seine Chancen erwarten lassen", get: (p) => (sv(p, "xg") === null ? null : (sv(p, "goals") || 0) - sv(p, "xg")), d: 2, signed: true },
    xgot:   { label: "xGOT", title: "xG der Schüsse aufs Tor, bewertet nach Platzierung", get: (p) => sv(p, "xgot"), p90: true, d: 2, pk: "xgot" },
    shots:  { label: "Schüsse", title: "Torschüsse", get: (p) => sv(p, "shots"), p90: true, pk: "shots" },
    sot:    { label: "aufs Tor", title: "Schüsse aufs Tor", get: (p) => sv(p, "sot"), p90: true, pk: "sot" },
    box:    { label: "Strafr.", title: "Ballkontakte im gegnerischen Strafraum", get: (p) => sv(p, "box_touches"), p90: true, pk: "box_touches" },
    drib:   { label: "Dribbl.", title: "Erfolgreiche Dribblings", get: (p) => sv(p, "dribbles"), p90: true, pk: "dribbles" },
    xa:     { label: "xA", title: "Expected Assists: erwartete Vorlagen nach Qualität der Pässe", get: (p) => sv(p, "xa"), p90: true, d: 2, pk: "xa" },
    acc:    { label: "Pässe", title: "Angekommene Pässe", get: (p) => sv(p, "acc_pass"), p90: true, pk: "acc_pass" },
    passp:  { label: "Quote", title: "Passquote in %", get: (p) => sv(p, "pass_pct"), d: 1, pct: true, pk: "pass_pct" },
    miss:   { label: "Fehlp.", title: "Fehlpässe (aus Pässen und Passquote berechnet)", get: missedPasses, p90: true, lowGood: true },
    long:   { label: "Lange B.", title: "Angekommene lange Bälle", get: (p) => sv(p, "acc_long"), p90: true, pk: "acc_long" },
    longp:  { label: "Quote l.", title: "Quote lange Bälle in %", get: (p) => sv(p, "long_pct"), d: 1, pct: true, pk: "long_pct" },
    lbp:    { label: "Linienbr.", title: "Linienbrechende Pässe: Pässe, die eine gegnerische Kette überspielen", get: (p) => sv(p, "lbp"), p90: true, pk: "lbp" },
    chances:{ label: "Chancen", title: "Kreierte Torchancen (Pässe, die zu einem Schuss führen)", get: (p) => sv(p, "chances"), p90: true, pk: "chances" },
    bigch:  { label: "Großch.", title: "Kreierte Großchancen", get: (p) => sv(p, "big_chances"), p90: true, pk: "big_chances" },
    duels:  { label: "Zwk. gew.", title: "Gewonnene Zweikämpfe", get: (p) => sv(p, "duels"), p90: true, pk: "duels" },
    duelsp: { label: "Zwk. %", title: "Zweikampfquote in %", get: (p) => sv(p, "duels_pct"), d: 1, pct: true, pk: "duels_pct" },
    aer:    { label: "Kopfb. gew.", title: "Gewonnene Kopfballduelle", get: (p) => sv(p, "aerials"), p90: true, pk: "aerials" },
    aerp:   { label: "Kopfb. %", title: "Kopfballquote in %", get: (p) => sv(p, "aerials_pct"), d: 1, pct: true, pk: "aerials_pct" },
    disp:   { label: "Ballverl.", title: "Ballverluste im Dribbling oder bei Ballannahme", get: (p) => sv(p, "dispossessed"), p90: true, lowGood: true, pk: "dispossessed" },
    fwon:   { label: "Gefoult", title: "Fouls, die an ihm begangen wurden", get: (p) => sv(p, "fouls_won"), p90: true, pk: "fouls_won" },
    fouls:  { label: "Fouls", title: "Begangene Fouls", get: (p) => sv(p, "fouls"), p90: true, lowGood: true, pk: "fouls" },
    defa:   { label: "Def. Akt.", title: "Defensivaktionen gesamt", get: (p) => sv(p, "def_actions"), p90: true, pk: "def_actions" },
    tack:   { label: "Tacklings", title: "Tacklings", get: (p) => sv(p, "tackles"), p90: true, pk: "tackles" },
    inter:  { label: "Abgef.", title: "Abgefangene Bälle", get: (p) => sv(p, "interceptions"), p90: true, pk: "interceptions" },
    recov:  { label: "Ballgew.", title: "Ballgewinne", get: (p) => sv(p, "recoveries"), p90: true, pk: "recoveries" },
    won3:   { label: "Gew. vorne", title: "Ballgewinne im letzten Drittel", get: (p) => sv(p, "won_final3"), p90: true, pk: "won_final3" },
    clear:  { label: "Klär.", title: "Klärende Aktionen", get: (p) => sv(p, "clearances"), p90: true, pk: "clearances" },
    blocks: { label: "Blocks", title: "Geblockte Schüsse", get: (p) => sv(p, "blocks"), p90: true, pk: "blocks" },
    dpast:  { label: "Ausgesp.", title: "Wie oft er ausgedribbelt wurde", get: (p) => sv(p, "dribbled_past"), p90: true, lowGood: true, pk: "dribbled_past" },
    gaon:   { label: "GT auf Pl.", title: "Gegentore, während er auf dem Platz stand", get: (p) => sv(p, "ga_on"), p90: true, lowGood: true },
    saves:  { label: "Paraden", title: "Paraden", get: (p) => sv(p, "saves"), p90: true, pk: "saves" },
    savep:  { label: "Quote", title: "Anteil gehaltener Schüsse aufs Tor in %", get: (p) => sv(p, "save_pct"), d: 1, pct: true, pk: "save_pct" },
    conc:   { label: "Gegent.", title: "Gegentore", get: (p) => sv(p, "conceded"), p90: true, lowGood: true },
    gprev:  { label: "Verh. T.", title: "Verhinderte Tore: erwartete Gegentore (xGOT) minus echte Gegentore. Positiv ist gut", get: (p) => sv(p, "goals_prevented"), d: 2, signed: true, pk: "goals_prevented" },
    cs:     { label: "Weiße W.", title: "Spiele ohne Gegentor", get: (p) => sv(p, "clean_sheets"), pk: "clean_sheets" },
    pens:   { label: "Elf. geh.", title: "Gehaltene Elfmeter", get: (p) => sv(p, "pen_saved") },
    claims: { label: "Hohe B.", title: "Abgefangene hohe Bälle", get: (p) => sv(p, "high_claims"), p90: true, pk: "high_claims" },
  };
  const GROUPS = {
    overview: { label: "Überblick", cols: ["apps", "starts", "mins", "sub_in", "sub_out", "rating", "motm", "goals", "assists", "yellow", "red"] },
    attack:   { label: "Offensive", cols: ["goals", "xg", "gxg", "xgot", "shots", "sot", "box", "drib", "assists", "xa"] },
    passing:  { label: "Passspiel", cols: ["acc", "passp", "miss", "long", "longp", "lbp", "chances", "bigch", "xa", "assists"] },
    duels:    { label: "Zweikampf", cols: ["duels", "duelsp", "aer", "aerp", "disp", "fwon", "fouls", "yellow", "red"] },
    defense:  { label: "Defensive", cols: ["defa", "tack", "inter", "recov", "won3", "clear", "blocks", "dpast", "gaon"] },
    keeper:   { label: "Torhüter", cols: ["apps", "mins", "rating", "saves", "savep", "conc", "gprev", "cs", "pens", "claims", "acc", "passp"] },
  };

  const state = { group: "overview", mode: "total", all: false, sort: "mins", dir: -1, focus: null, scatter: "duels", hover: null };

  // ---------- Kopfbereich ----------
  function renderHero() {
    const done = K.fixtures.filter((f) => f.done);
    const next = K.fixtures.filter((f) => !f.done).slice(0, 3);
    const me = K.table.find((r) => r.id === K.teamId);
    const isHome = (f) => f.homeId === K.teamId;
    const res = (f) => {
      const mine = isHome(f) ? f.hs : f.as, theirs = isHome(f) ? f.as : f.hs;
      return mine > theirs ? "w" : mine === theirs ? "d" : "l";
    };
    const RES = { w: "S", d: "U", l: "N" };
    const RES_LONG = { w: "Sieg", d: "Unentschieden", l: "Niederlage" };
    const xgr = me.xg !== undefined ? `<div class="ch-stat"><span>xG-Bilanz</span><b>${fmt(me.xg, 1)} : ${fmt(me.xga, 1)}</b><small>Erwartet ${fmt(me.xpts, 1)} Punkte, ${me.xpos}. Platz</small></div>` : "";
    document.getElementById("cur-hero").innerHTML = `
      <div class="ch-top">
        <div>
          <p class="eyebrow">Laufende Saison</p>
          <h2 class="ch-title">Saison ${esc(K.season)}</h2>
          <p class="ch-sub">Nach ${done.length} Spieltagen · Trainer ${esc(K.coach || "")} · Daten von FotMob, Stand ${dateDe(K.fetched)}${K.fetched.slice(0, 4)}</p>
        </div>
        <div class="ch-stats">
          <div class="ch-stat"><span>Platz</span><b>${me.pos}.</b><small>${me.w} S · ${me.d} U · ${me.l} N</small></div>
          <div class="ch-stat"><span>Punkte</span><b>${me.pts}</b><small>${fmt(me.pts / me.played, 2)} pro Spiel</small></div>
          <div class="ch-stat"><span>Tore</span><b>${esc(me.goals.replace("-", " : "))}</b><small>Differenz ${signed(me.diff)}</small></div>
          ${xgr}
        </div>
      </div>
      <div class="ch-games" aria-label="Ergebnisse">
        ${done.map((f, i) => `<button type="button" class="game ${res(f)}" data-fid="${f.id}" title="${RES_LONG[res(f)]}, Spielbericht öffnen">
          <span class="md">${i + 1}. Sp.</span>
          <span class="opp">${isHome(f) ? "vs." : "@"} ${esc(isHome(f) ? f.away : f.home)}</span>
          <b>${isHome(f) ? f.hs : f.as}:${isHome(f) ? f.as : f.hs}</b>
          <span class="res">${RES[res(f)]}</span>
        </button>`).join("")}
        ${next.map((f) => `<div class="game next"><span class="md">${dateDe(f.date)}</span><span class="opp">${isHome(f) ? "vs." : "@"} ${esc(isHome(f) ? f.away : f.home)}</span><b>–:–</b><span class="res">offen</span></div>`).join("")}
      </div>`;
  }

  // ---------- Bestenlisten ----------
  function renderLeaders() {
    const reg = played.filter((p) => p.mins >= MIN_MINS);
    const L = [
      { t: "Tore", pool: played, get: (p) => sv(p, "goals") || 0, f: (v) => fmt(v) },
      { t: "Vorlagen", pool: played, get: (p) => sv(p, "assists") || 0, f: (v) => fmt(v) },
      { t: "Beste Note", pool: reg, get: (p) => p.rating, f: (v) => fmt(v, 2), note: `ab ${MIN_MINS} Min.` },
      { t: "Zweikämpfe gewonnen", pool: played, get: (p) => sv(p, "duels"), f: (v) => fmt(v) },
      { t: "Zweikampfquote", pool: reg, get: (p) => sv(p, "duels_pct"), f: (v) => fmt(v, 1) + " %", note: `ab ${MIN_MINS} Min.` },
      { t: "Passquote", pool: reg.filter((p) => p.pos !== "TW"), get: (p) => sv(p, "pass_pct"), f: (v) => fmt(v, 1) + " %", note: `Feldspieler ab ${MIN_MINS} Min.` },
      { t: "Expected Goals", pool: played, get: (p) => sv(p, "xg"), f: (v) => fmt(v, 2) },
      { t: "Chancen kreiert", pool: played, get: (p) => sv(p, "chances"), f: (v) => fmt(v) },
      { t: "Ballgewinne", pool: played, get: (p) => sv(p, "recoveries"), f: (v) => fmt(v) },
      { t: "Meiste Minuten", pool: played, get: (p) => p.mins, f: (v) => fmt(v) },
    ];
    document.getElementById("leaders").innerHTML = L.map((l) => {
      const top = l.pool.filter((p) => l.get(p) !== null && l.get(p) !== undefined).sort((a, b) => l.get(b) - l.get(a)).slice(0, 3);
      if (!top.length) return "";
      const [first, ...rest] = top;
      return `<button type="button" class="leader" data-id="${first.id}">
        <span class="lt">${esc(l.t)}${l.note ? ` <small>${esc(l.note)}</small>` : ""}</span>
        <span class="lv">${l.f(l.get(first))}</span>
        <span class="ln">${esc(first.name)}</span>
        <span class="lr">${rest.map((p) => `${esc(short(p.name))} ${l.f(l.get(p))}`).join(" · ")}</span>
      </button>`;
    }).join("");
    document.querySelectorAll("#leaders .leader").forEach((b) => b.addEventListener("click", () => focusPlayer(+b.dataset.id, true)));
  }

  // ---------- Kadertabelle ----------
  function seg(boxId, items, current, onPick) {
    const box = document.getElementById(boxId);
    box.innerHTML = "";
    items.forEach(([key, label]) => {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("role", "tab");
      b.textContent = label;
      b.setAttribute("aria-selected", key === current);
      b.addEventListener("click", () => onPick(key));
      box.appendChild(b);
    });
  }
  function renderControls() {
    seg("kader-tabs", Object.entries(GROUPS).map(([k, g]) => [k, g.label]), state.group, (k) => {
      state.group = k;
      if (!GROUPS[k].cols.includes(state.sort)) { state.sort = GROUPS[k].cols[0]; state.dir = -1; }
      renderControls(); renderTable();
    });
    seg("kader-mode", [["total", "Gesamt"], ["p90", "pro 90 Min."]], state.mode, (k) => { state.mode = k; renderControls(); renderTable(); });
  }

  function cellValue(p, key) {
    const c = C[key];
    let v = c.get(p);
    if (v === null || v === undefined) return null;
    if (state.mode === "p90" && c.p90) v = per90(p, v);
    return v;
  }
  function cellText(v, key) {
    const c = C[key];
    if (v === null || v === undefined) return "–";
    const d = state.mode === "p90" && c.p90 ? 2 : c.d || 0;
    return c.signed ? signed(v, d) : fmt(v, d);
  }

  function renderTable() {
    const cols = GROUPS[state.group].cols;
    let rows = (state.all ? players : played).slice();
    if (state.group === "keeper") rows = rows.filter((p) => p.pos === "TW");
    const sortVal = (p) => (state.sort === "name" ? p.name : state.sort === "pos" ? POS_ORDER[p.pos] * 100 + (p.num || 0) : cellValue(p, state.sort));
    rows.sort((a, b) => {
      const x = sortVal(a), y = sortVal(b);
      if (x === null || x === undefined) return 1;
      if (y === null || y === undefined) return -1;
      return (x < y ? -1 : x > y ? 1 : 0) * state.dir;
    });
    const th = (key, label, title, cls = "") =>
      `<th class="${cls}" data-k="${key}" title="${esc(title)}" ${state.sort === key ? `aria-sort="${state.dir > 0 ? "ascending" : "descending"}"` : ""}>${esc(label)}</th>`;
    const t = document.getElementById("kader-table");
    t.innerHTML = `<thead><tr>${th("pos", "Spieler", "Nach Position sortieren", "l sticky")}${cols.map((k) => th(k, C[k].label, C[k].title)).join("")}</tr></thead>
      <tbody>${rows.map((p) => `<tr data-id="${p.id}" tabindex="0" class="${state.focus === p.id ? "is-focus" : ""}">
        <td class="l sticky"><span class="pnum">${p.num ?? ""}</span>${esc(p.name)} <span class="ppos">${p.pos}</span>${p.injured ? ' <span class="inj" title="verletzt">verletzt</span>' : ""}</td>
        ${cols.map((k) => {
          const v = cellValue(p, k);
          const pk = C[k].pk;
          // FotMob-Perzentil als Hintergrund (nur Gesamtwerte), bei "weniger ist besser" bereits so gerechnet
          const pc = pk && state.mode === "total" ? spct(p, pk) : null;
          const style = pc !== null && pc !== undefined && v !== null ? ` style="--h:${(pc / 100).toFixed(2)}"` : "";
          return `<td class="${style ? "heat" : ""}"${style}>${cellText(v, k)}</td>`;
        }).join("")}
      </tr>`).join("")}</tbody>`;
    t.querySelectorAll("th").forEach((h) => h.addEventListener("click", () => {
      const k = h.dataset.k;
      if (state.sort === k) state.dir *= -1;
      else { state.sort = k; state.dir = k === "pos" || (C[k] && C[k].lowGood) ? 1 : -1; }
      renderTable();
    }));
    t.querySelectorAll("tbody tr").forEach((tr) => {
      tr.addEventListener("click", () => focusPlayer(+tr.dataset.id, false));
      tr.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); focusPlayer(+tr.dataset.id, false); } });
    });
  }

  // ---------- Steckbrief ----------
  const PROFILE = {
    TW: ["save_pct", "saves", "goals_prevented", "high_claims", "pass_pct", "acc_long"],
    AB: ["duels_pct", "aerials_pct", "tackles", "interceptions", "clearances", "recoveries", "pass_pct", "lbp", "acc_long", "dribbled_past"],
    MF: ["pass_pct", "acc_pass", "lbp", "chances", "xa", "duels_pct", "tackles", "recoveries", "dribbles", "xg"],
    ST: ["goals", "xg", "xgot", "shots", "sot", "box_touches", "chances", "xa", "dribbles", "duels_pct", "aerials_pct"],
  };
  const PNAME = {
    save_pct: "Paradenquote", saves: "Paraden", goals_prevented: "Verhinderte Tore", high_claims: "Hohe Bälle", pass_pct: "Passquote",
    acc_long: "Lange Bälle", duels_pct: "Zweikampfquote", aerials_pct: "Kopfballquote", tackles: "Tacklings", interceptions: "Abgefangene Bälle",
    clearances: "Klärungen", recoveries: "Ballgewinne", lbp: "Linienbrechende Pässe", dribbled_past: "Selten ausgespielt",
    acc_pass: "Angekommene Pässe", chances: "Chancen kreiert", xa: "xA", dribbles: "Dribblings", xg: "xG", goals: "Tore", xgot: "xGOT",
    shots: "Schüsse", sot: "Schüsse aufs Tor", box_touches: "Kontakte im Strafraum",
  };

  function focusPlayer(id, scroll) {
    if (window.WB && window.WB.showPage) window.WB.showPage("aktuell", { keepScroll: true });
    state.focus = state.focus === id && !scroll ? null : id;
    renderTable();
    renderCard();
    renderScatter();
    setHash(state.focus);
    if (scroll && state.focus) document.getElementById("pcard").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  (window.WB = window.WB || {}).focusPlayer = (id, scroll) => { state.focus = null; focusPlayer(id, scroll); };

  function renderCard() {
    const box = document.getElementById("pcard");
    const p = players.find((x) => x.id === state.focus);
    if (!p) {
      box.innerHTML = `<p class="hint">Klick auf einen Spieler in der Tabelle, im Diagramm oder in den Bestenlisten, um seinen Steckbrief zu sehen.</p>`;
      return;
    }
    const keys = PROFILE[p.pos] || PROFILE.MF;
    const bars = keys.filter((k) => p.s[k] && p.s[k].pct !== null && p.s[k].pct !== undefined).map((k) => {
      const s = p.s[k];
      const isPct = /_pct$/.test(k);
      const val = isPct ? fmt(s.v, 1) + " %" : k === "goals_prevented" ? signed(s.v, 2) : fmt(s.v, s.v % 1 ? 2 : 0);
      return `<div class="pbar"><span class="pl">${esc(PNAME[k] || k)}</span><span class="pt"><i style="width:${Math.max(2, s.pct)}%"></i></span><span class="pv">${val}<small>${Math.round(s.pct)}. Pz.</small></span></div>`;
    }).join("");
    // Noten je Spiel als kleines Säulendiagramm
    const g = p.games;
    const W = 100 / Math.max(g.length, 1);
    const ratingBars = g.length ? `<div class="rgames" role="img" aria-label="Noten je Spiel">
      ${g.map((m) => {
        const r = m.r || 0, h = Math.max(4, ((r - 4) / 6) * 100);
        return `<div class="rg" style="width:${W}%" title="${esc((m.home ? "vs. " : "@ ") + m.opp)}: ${m.min} Min.${m.r ? ", Note " + fmt(m.r, 1) : ""}${m.g ? ", " + m.g + " Tor" + (m.g > 1 ? "e" : "") : ""}${m.a ? ", " + m.a + " Vorl." : ""}">
          <span class="rv">${m.r ? fmt(m.r, 1) : "–"}</span>
          <span class="rcol"><i class="${r >= 7.5 ? "hi" : r < 6.5 ? "lo" : ""}" style="height:${h}%"></i></span>
          <span class="ro">${esc(short(m.opp))}</span>
          <span class="rm">${m.min}'${m.g ? ` · ${m.g} T` : ""}${m.a ? ` · ${m.a} V` : ""}</span>
        </div>`;
      }).join("")}
    </div>` : `<p class="hint">Noch kein Bundesliga-Einsatz in dieser Saison.</p>`;
    const line = [
      [p.apps, "Spiele"], [p.starts, "Startelf"], [fmt(p.mins), "Minuten"], [p.sub_in, "eingewechselt"], [p.sub_out, "ausgewechselt"],
      [sv(p, "goals") ?? 0, "Tore"], [sv(p, "assists") ?? 0, "Vorlagen"], [p.rating ? fmt(p.rating, 2) : "–", "Note"],
    ];
    box.innerHTML = `
      <div class="pc-head">
        <div class="pc-num">${p.num ?? ""}</div>
        <div>
          <h3>${esc(p.name)}</h3>
          <p class="sub">${POS_NAME[p.pos] || ""}${p.age ? " · " + p.age + " Jahre" : ""}${p.height ? " · " + p.height + " cm" : ""}${p.foot ? " · Fuß " + p.foot : ""}${p.nat ? " · " + esc(p.nat) : ""}${p.motm ? ` · ${p.motm}× Spieler des Spiels` : ""}</p>
          <p class="sub">${p.contract ? (p.onLoan ? "Leihe bis " : "Vertrag bis ") + p.contract.slice(8, 10) + "." + p.contract.slice(5, 7) + "." + p.contract.slice(0, 4) : ""}${p.injured ? ` · <span class="inj">verletzt, Rückkehr ${esc(p.injuryReturn || "offen")}</span>` : ""}</p>
        </div>
        <div class="pc-actions">
          <button type="button" class="btn" id="pc-share">Link kopieren</button>
          <button type="button" class="btn pc-close" id="pc-close">Schließen</button>
        </div>
      </div>
      <div class="pc-line">${line.map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join("")}</div>
      <div class="pc-grid">
        <div>
          <h4>Noten je Spiel</h4>
          ${ratingBars}
        </div>
        <div>
          <h4>Im Vergleich zur Liga</h4>
          ${bars ? `<div class="pbars">${bars}</div><p class="hint">Balken = Perzentil laut FotMob: 80 heißt besser als 80 % der Bundesliga-Spieler.</p>` : `<p class="hint">Zu wenige Minuten für einen Ligavergleich.</p>`}
        </div>
      </div>
      <div class="pc-grid three">
        <div>
          <h4>Schusskarte <small>${p.shots.length} Schüsse, Größe = xG</small></h4>
          ${p.shots.length ? `<svg class="pitch-svg half" id="pc-shots" viewBox="50.5 -2 57.5 72" role="img" aria-label="Schüsse von ${esc(p.name)}"></svg>` : `<p class="hint">Keine Schüsse in dieser Saison.</p>`}
        </div>
        <div>
          <h4>Heatmap <small>wo er am Ball war, Angriff nach rechts</small></h4>
          ${p.heat.length ? `<svg class="pitch-svg" id="pc-heat" viewBox="-2 -2 109 72" role="img" aria-label="Heatmap von ${esc(p.name)}"></svg>` : `<p class="hint">Keine Heatmap verfügbar.</p>`}
        </div>
        <div>
          <h4>Marktwert <small>Schätzung von SciSports</small></h4>
          ${p.mv.length > 1 ? `<svg class="viz mv" id="pc-mv" role="img" aria-label="Marktwert-Verlauf"></svg>` : `<p class="hint">Kein Marktwert-Verlauf.</p>`}
        </div>
      </div>
      ${bars ? `<div class="pc-radar">
        <div class="pc-radar-head"><h4>Spieler gegen Spieler</h4>
          <label class="check">Vergleichen mit <select id="pc-cmp">${played.filter((x) => x.id !== p.id && x.mins >= 90 && Object.keys(x.s).length).sort((a, b) => (a.pos === p.pos ? -1 : 0) - (b.pos === p.pos ? -1 : 0) || b.mins - a.mins)
            .map((x) => `<option value="${x.id}" ${x.id === state.cmp ? "selected" : ""}>${esc(x.name)} (${x.pos})</option>`).join("")}</select></label></div>
        <svg class="viz radar" id="pc-radar" role="img" aria-label="Radar-Vergleich"></svg>
        <div class="legend"><span><i class="sw sw-a"></i>${esc(p.name)}</span><span><i class="sw sw-b"></i><span id="pc-cmp-name"></span></span><span>Perzentile im Ligavergleich, außen ist besser</span></div>
      </div>` : ""}`;
    document.getElementById("pc-close").addEventListener("click", () => { state.focus = null; setHash(null); renderTable(); renderCard(); renderScatter(); });
    document.getElementById("pc-share").addEventListener("click", (e) => {
      const btn = e.currentTarget;
      const url = location.href.split("#")[0] + "#spieler-" + p.id;
      const done = () => { btn.textContent = "Link kopiert"; setTimeout(() => (btn.textContent = "Link kopieren"), 1800); };
      try {
        navigator.clipboard.writeText(url).then(done, () => { btn.textContent = "#spieler-" + p.id; });
      } catch (err) { btn.textContent = "#spieler-" + p.id; }
    });
    drawCardExtras(p);
  }

  function setHash(id) {
    try { history.replaceState(null, "", id ? "#spieler-" + id : location.pathname + location.search); } catch (e) { /* Rahmen erlaubt das nicht */ }
  }

  function drawCardExtras(p) {
    const WB = window.WB || {};
    const shots = document.getElementById("pc-shots");
    if (shots && WB.pitch) {
      WB.pitch(shots);
      WB.shotDots(shots, p.shots.map((s) => ({ ...s, name: p.name })), null, "me");
    }
    const heat = document.getElementById("pc-heat");
    if (heat && WB.pitch) {
      WB.pitch(heat);
      // Ballaktionen in 5 × 4,86 m große Felder zählen
      const cols = 21, rows = 14, cw = 105 / cols, ch = 68 / rows;
      const grid = Array.from({ length: rows }, () => Array(cols).fill(0));
      p.heat.forEach(([x, y]) => { const c = Math.min(cols - 1, Math.max(0, Math.floor(x / cw))), r = Math.min(rows - 1, Math.max(0, Math.floor(y / ch))); grid[r][c]++; });
      // leicht glätten, damit Flächen statt Kacheln entstehen
      const sm = grid.map((row, r) => row.map((_, c) => {
        let s = 0, n = 0;
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const v = grid[r + dr]?.[c + dc]; if (v !== undefined) { const w = dr || dc ? 0.5 : 1; s += v * w; n += w; } }
        return s / n;
      }));
      const max = Math.max(...sm.flat(), 1);
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      sm.forEach((row, r) => row.forEach((v, c) => {
        if (v / max < 0.08) return;
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", c * cw); rect.setAttribute("y", r * ch); rect.setAttribute("width", cw); rect.setAttribute("height", ch);
        rect.setAttribute("class", "heat-cell");
        rect.setAttribute("style", `opacity:${(0.12 + 0.78 * (v / max)).toFixed(2)}`);
        g.appendChild(rect);
      }));
      heat.insertBefore(g, heat.querySelector(".pitch").nextSibling);
      heat.appendChild(heat.querySelector(".pitch").cloneNode(true)).querySelector(".pitch-bg").remove();
    }
    const mvSvg = document.getElementById("pc-mv");
    if (mvSvg) drawMarketValue(mvSvg, p.mv);
    const radar = document.getElementById("pc-radar");
    if (radar) {
      const sel = document.getElementById("pc-cmp");
      if (!state.cmp || !players.some((x) => x.id === state.cmp) || state.cmp === p.id) state.cmp = +sel.value;
      sel.value = state.cmp;
      sel.addEventListener("change", () => { state.cmp = +sel.value; drawRadar(radar, p, players.find((x) => x.id === state.cmp)); });
      drawRadar(radar, p, players.find((x) => x.id === state.cmp));
    }
  }

  function drawMarketValue(svg, mv) {
    const W = svg.clientWidth || 300, H = svg.clientHeight || 180;
    const M = { t: 12, r: 10, b: 22, l: 42 };
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = "";
    const pts = mv.map(([d, v]) => [new Date(d).getTime(), v / 1e6]);
    const x0 = pts[0][0], x1 = pts[pts.length - 1][0], ymax = Math.max(...pts.map((q) => q[1])) * 1.1 || 1;
    const x = (t) => M.l + ((t - x0) / (x1 - x0 || 1)) * (W - M.l - M.r), y = (v) => H - M.b - (v / ymax) * (H - M.t - M.b);
    const NS = "http://www.w3.org/2000/svg";
    const mk = (tag, a) => { const n = document.createElementNS(NS, tag); for (const k in a) n.setAttribute(k, a[k]); svg.appendChild(n); return n; };
    [0, ymax / 2, ymax].forEach((v) => { mk("line", { x1: M.l, x2: W - M.r, y1: y(v), y2: y(v), class: "mv-grid" }); mk("text", { x: M.l - 6, y: y(v) + 4, "text-anchor": "end" }).textContent = fmt(v, v < 10 ? 1 : 0); });
    const y0 = new Date(x0).getFullYear(), y1 = new Date(x1).getFullYear();
    const step = Math.max(1, Math.ceil((y1 - y0) / 4));
    for (let yr = y0 + 1; yr <= y1; yr += step) mk("text", { x: x(new Date(yr + "-01-01").getTime()), y: H - 6, "text-anchor": "middle" }).textContent = yr;
    const d = pts.map((q, i) => (i ? "L" : "M") + x(q[0]).toFixed(1) + "," + y(q[1]).toFixed(1)).join("");
    mk("path", { d: d + `L${x(x1)},${y(0)}L${x(x0)},${y(0)}Z`, class: "mv-area" });
    mk("path", { d, class: "mv-line" });
    const lastP = pts[pts.length - 1], peak = pts.reduce((a, b) => (b[1] > a[1] ? b : a));
    mk("circle", { cx: x(lastP[0]), cy: y(lastP[1]), r: 4, class: "mv-dot" });
    mk("text", { x: x(lastP[0]) - 6, y: y(lastP[1]) - 8, "text-anchor": "end", class: "mv-label" }).textContent = fmt(lastP[1], 1) + " Mio. €";
    if (peak !== lastP) mk("text", { x: x(peak[0]), y: y(peak[1]) - 8, "text-anchor": "middle", class: "mv-label muted" }).textContent = "Hoch " + fmt(peak[1], 1);
    mk("text", { x: M.l, y: M.t - 2, class: "mv-unit" }).textContent = "Mio. €";
  }

  function drawRadar(svg, a, b) {
    const keys = (PROFILE[a.pos] || PROFILE.MF).filter((k) => a.s[k] && a.s[k].pct != null);
    document.getElementById("pc-cmp-name").textContent = b ? b.name : "";
    const W = svg.clientWidth || 360, H = svg.clientHeight || 320;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = "";
    if (keys.length < 3) return;
    const cx = W / 2, cy = H / 2 + 4, R = Math.min(W, H) / 2 - 46;
    const NS = "http://www.w3.org/2000/svg";
    const mk = (tag, at) => { const n = document.createElementNS(NS, tag); for (const k in at) n.setAttribute(k, at[k]); svg.appendChild(n); return n; };
    const ang = (i) => -Math.PI / 2 + (i / keys.length) * Math.PI * 2;
    [25, 50, 75, 100].forEach((v) => mk("polygon", { points: keys.map((_, i) => `${cx + Math.cos(ang(i)) * R * v / 100},${cy + Math.sin(ang(i)) * R * v / 100}`).join(" "), class: "rd-ring" }));
    keys.forEach((k, i) => {
      mk("line", { x1: cx, y1: cy, x2: cx + Math.cos(ang(i)) * R, y2: cy + Math.sin(ang(i)) * R, class: "rd-axis" });
      const lx = cx + Math.cos(ang(i)) * (R + 16), ly = cy + Math.sin(ang(i)) * (R + 16);
      const t = mk("text", { x: lx, y: ly + 4, "text-anchor": Math.abs(Math.cos(ang(i))) < 0.2 ? "middle" : Math.cos(ang(i)) > 0 ? "start" : "end", class: "rd-label" });
      t.textContent = PNAME[k] || k;
    });
    const poly = (p, cls) => mk("polygon", { points: keys.map((k, i) => { const v = (p.s[k] && p.s[k].pct != null ? p.s[k].pct : 0) / 100; return `${cx + Math.cos(ang(i)) * R * v},${cy + Math.sin(ang(i)) * R * v}`; }).join(" "), class: "rd-poly " + cls });
    if (b) poly(b, "b");
    poly(a, "a");
  }

  // ---------- Streudiagramm ----------
  const SCAT = {
    duels: { label: "Zweikämpfe", x: (p) => sv(p, "duels"), y: (p) => sv(p, "duels_pct"), xl: "Gewonnene Zweikämpfe", yl: "Zweikampfquote in %", yd: 1 },
    aerials: { label: "Kopfbälle", x: (p) => sv(p, "aerials"), y: (p) => sv(p, "aerials_pct"), xl: "Gewonnene Kopfballduelle", yl: "Kopfballquote in %", yd: 1 },
    passes: { label: "Pässe", x: (p) => sv(p, "acc_pass"), y: (p) => sv(p, "pass_pct"), xl: "Angekommene Pässe", yl: "Passquote in %", yd: 1 },
    goals: { label: "Tore vs. xG", x: (p) => sv(p, "xg"), y: (p) => sv(p, "goals"), xl: "Expected Goals (xG)", yl: "Tore", xd: 2, diag: true },
  };
  const ssvg = document.getElementById("scatter");
  const stip = document.getElementById("stip");
  function el(tag, attrs, parent) {
    const n = document.createElementNS(SVG_NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function niceStep(span, n) {
    const raw = span / n, mag = Math.pow(10, Math.floor(Math.log10(raw)));
    return [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
  }
  function renderScatter() {
    const S = SCAT[state.scatter];
    document.getElementById("scatter-title").textContent = S.label;
    document.getElementById("scatter-sub").textContent = S.diag
      ? "Über der Linie trifft ein Spieler öfter, als seine Chancen erwarten lassen."
      : `Rechts: viele gewonnen. Oben: hohe Quote. Spieler ab 90 Minuten${state.scatter === "passes" ? ", ohne Torhüter" : ""}.`;
    const pts = played.filter((p) => p.mins >= 90 && S.x(p) !== null && S.y(p) !== null && !(state.scatter === "passes" && p.pos === "TW") && !(state.scatter === "goals" && p.pos === "TW"));
    const W = ssvg.clientWidth || 600, H = ssvg.clientHeight || 360;
    const M = { top: 16, right: 16, bottom: 42, left: 46 };
    const iw = W - M.left - M.right, ih = H - M.top - M.bottom;
    ssvg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    ssvg.innerHTML = "";
    const g = el("g", { transform: `translate(${M.left},${M.top})` }, ssvg);
    const xs = pts.map(S.x), ys = pts.map(S.y);
    let x0 = 0, x1 = Math.max(...xs, 1) * 1.08;
    let y0 = S.diag ? 0 : Math.floor(Math.min(...ys) / 10) * 10, y1 = S.diag ? Math.max(...ys, x1) * 1.08 : Math.min(100, Math.ceil(Math.max(...ys) / 10) * 10 + 2);
    if (S.diag) { x1 = y1 = Math.max(x1, y1); }
    const x = (v) => ((v - x0) / (x1 - x0)) * iw, y = (v) => ih - ((v - y0) / (y1 - y0)) * ih;
    const gx = el("g", { class: "grid" }, g);
    const sx = niceStep(x1 - x0, 5), sy = niceStep(y1 - y0, 5);
    for (let v = Math.ceil(y0 / sy) * sy; v <= y1 + 1e-9; v += sy) {
      el("line", { x1: 0, x2: iw, y1: y(v), y2: y(v) }, gx);
      el("text", { x: -8, y: y(v) + 4, "text-anchor": "end" }, g).textContent = fmt(v, sy < 1 ? 1 : 0);
    }
    for (let v = Math.ceil(x0 / sx) * sx; v <= x1 + 1e-9; v += sx) {
      el("text", { x: x(v), y: ih + 18, "text-anchor": "middle" }, g).textContent = fmt(v, sx < 1 ? 1 : 0);
    }
    el("text", { class: "axis-label", x: iw / 2, y: ih + 36, "text-anchor": "middle" }, g).textContent = S.xl;
    el("text", { class: "axis-label", x: -ih / 2, y: -34, "text-anchor": "middle", transform: "rotate(-90)" }, g).textContent = S.yl;
    if (S.diag) {
      el("line", { class: "p-avg", x1: x(0), y1: y(0), x2: x(x1), y2: y(x1) }, g);
    } else {
      const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
      el("line", { class: "s-mean", x1: x(mx), x2: x(mx), y1: 0, y2: ih }, g);
      el("line", { class: "s-mean", x1: 0, x2: iw, y1: y(my), y2: y(my) }, g);
      el("text", { class: "s-mean-l", x: 4, y: y(my) - 6 }, g).textContent = "Ø Kader " + fmt(my, 1) + " %";
    }
    // Namen nur für auffällige Punkte und den markierten Spieler
    const score = (p) => (x(S.x(p)) / iw) + (1 - y(S.y(p)) / ih);
    const labelled = new Set(pts.slice().sort((a, b) => score(b) - score(a)).slice(0, 4).map((p) => p.id));
    if (state.focus) labelled.add(state.focus);
    if (state.hover) labelled.add(state.hover);
    const placed = [];
    pts.forEach((p) => {
      const cx = x(S.x(p)), cy = y(S.y(p));
      const cls = "s-dot" + (p.id === state.focus ? " focus" : "") + (p.id === state.hover ? " hover" : "");
      el("circle", { class: cls, cx, cy, r: p.id === state.focus ? 8 : 6 }, g);
      if (labelled.has(p.id)) {
        let ly = cy - 11;
        while (placed.some((q) => Math.abs(q.y - ly) < 13 && Math.abs(q.x - cx) < 70)) ly -= 13;
        placed.push({ x: cx, y: ly });
        const anchor = cx > iw - 60 ? "end" : cx < 40 ? "start" : "middle";
        el("text", { class: "s-label", x: cx, y: ly, "text-anchor": anchor }, g).textContent = short(p.name);
      }
    });
    // Trefferflächen größer als die Punkte
    pts.forEach((p) => {
      const cx = x(S.x(p)), cy = y(S.y(p));
      const hit = el("circle", { class: "s-hit", cx, cy, r: 14, tabindex: 0, role: "button", "aria-label": `${p.name}: ${S.xl} ${fmt(S.x(p), S.xd || 0)}, ${S.yl} ${fmt(S.y(p), S.yd || 0)}` }, g);
      const show = () => {
        state.hover = p.id;
        stip.innerHTML = `<b>${esc(p.name)}</b>${S.xl}: ${fmt(S.x(p), S.xd || 0)}<br>${S.yl}: ${fmt(S.y(p), S.yd || 0)}<br><span class="t-muted">${fmt(p.mins)} Min. · klicken für Steckbrief</span>`;
        stip.classList.add("show");
        const w = stip.offsetWidth;
        stip.style.left = Math.max(w / 2 + 4, Math.min(W - w / 2 - 4, M.left + cx)) + "px";
        stip.style.top = Math.max(stip.offsetHeight + 4, M.top + cy - 14) + "px";
      };
      hit.addEventListener("mouseenter", show);
      hit.addEventListener("focus", show);
      hit.addEventListener("mouseleave", () => { state.hover = null; stip.classList.remove("show"); });
      hit.addEventListener("click", () => focusPlayer(p.id, true));
    });
  }

  // ---------- Bundesliga-Tabelle ----------
  function renderBlTable() {
    const t = document.getElementById("bl-table");
    const hasX = K.table.some((r) => r.xpts !== undefined);
    t.innerHTML = `<thead><tr><th class="l">#</th><th class="l">Verein</th><th>Sp.</th><th>Tore</th><th>Diff.</th><th>Pkt.</th>${hasX ? '<th title="Erwartete Punkte nach xG">xPkt.</th>' : ""}</tr></thead>
      <tbody>${K.table.map((r) => `<tr class="${r.id === K.teamId ? "me" : ""}">
        <td class="l">${r.pos}</td><td class="l">${esc(r.name)}</td><td>${r.played}</td><td>${esc(r.goals.replace("-", ":"))}</td><td>${signed(r.diff)}</td><td><b>${r.pts}</b></td>${hasX ? `<td>${r.xpts !== undefined ? fmt(r.xpts, 1) : "–"}</td>` : ""}
      </tr>`).join("")}</tbody>`;
  }

  document.getElementById("kader-all").addEventListener("change", (e) => { state.all = e.target.checked; renderTable(); });
  renderHero();
  renderLeaders();
  renderControls();
  renderTable();
  renderCard();
  seg("scatter-tabs", Object.entries(SCAT).map(([k, s]) => [k, s.label]), state.scatter, function pick(k) {
    state.scatter = k;
    seg("scatter-tabs", Object.entries(SCAT).map(([kk, s]) => [kk, s.label]), k, pick);
    renderScatter();
  });
  renderScatter();
  renderBlTable();
  document.querySelectorAll("#cur-hero [data-fid]").forEach((b) => b.addEventListener("click", () => window.WB && window.WB.openMatch && window.WB.openMatch(b.dataset.fid)));
  // Direktlink auf einen Spieler, z. B. #spieler-276791
  window.addEventListener("load", () => {
    const m = /^#spieler-(\d+)$/.exec(location.hash);
    if (m && players.some((p) => p.id === +m[1])) focusPlayer(+m[1], true);
  });
  let raf;
  window.addEventListener("resize", () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(renderScatter); });
})();
