(function () {
  "use strict";
  const R = window.REKORDE;
  if (!R) return;

  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const num = (v) => v.toLocaleString("de-DE", { maximumFractionDigits: 1 });

  function rankList(key) {
    const L = R[key];
    const max = Math.max(...L.rows.map((r) => r.value));
    // gleiche Werte teilen sich den Platz
    let lastV = null, lastRank = 0;
    const rows = L.rows.map((r, i) => {
      const rank = r.value === lastV ? lastRank : i + 1;
      lastV = r.value; lastRank = rank;
      const sub = [r.info ? esc(r.info) : "", r.flag ? `<span class="flag">${esc(r.flag)}</span>` : ""].filter(Boolean).join(" · ");
      return `<li class="rank-row">
        <span class="rk">${rank}.</span>
        <span class="nm">${esc(r.name)}${sub ? `<small>${sub}</small>` : ""}</span>
        <span class="val">${num(r.value)} <small>${esc(L.unit)}</small></span>
        <span class="bar" aria-hidden="true"><i style="width:${((r.value / max) * 100).toFixed(1)}%"></i></span>
      </li>`;
    }).join("");
    return `<h3>${esc(L.title)}</h3><p class="sub">${esc(L.scope)}</p>
      <ol class="rank-list">${rows}</ol>
      ${L.note ? `<p class="note">${esc(L.note)}</p>` : ""}
      <p class="src">Quelle: ${esc(L.source)} · Stand ${esc(R.stand)}</p>`;
  }

  document.querySelectorAll(".rank-card[data-list]").forEach((card) => {
    card.innerHTML = rankList(card.dataset.list);
  });

  const K = R.karten;
  document.getElementById("karten").innerHTML = `<h3>${esc(K.title)}</h3><p class="sub">${esc(K.scope)}</p>
    <div class="facts">${K.facts.map((f) => `<div class="fact"><b>${esc(f.big)}</b><span>${esc(f.label)}</span></div>`).join("")}</div>
    <p class="note">${esc(K.note)}</p>
    <p class="src">Quelle: ${esc(K.source)}</p>`;

  const RK = R.rueckkehrer;
  document.getElementById("rueckkehrer").innerHTML = `<h3 class="rk-title">${esc(RK.title)}</h3><p class="sub">${esc(RK.scope)}</p>
    <div class="rk-grid">${RK.rows.map((r) => `
      <div class="rk-item">
        <div class="top"><b>${esc(r.name)}</b><span class="pill">${r.times}× zurück</span></div>
        <ul>${r.back.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>
        ${r.info ? `<p>${esc(r.info)}</p>` : ""}
      </div>`).join("")}</div>
    <p class="src">Quelle: ${esc(RK.source)}</p>`;

  document.getElementById("titel-liste").innerHTML = `<h3 class="rk-title">Titel</h3>
    ${R.titel.map((t) => `<div class="title-row"><div class="lbl"><b>${esc(t.label)}</b><span>${t.years.length}×</span></div>
      <div class="years">${t.years.map((y) => `<span>${y}</span>`).join("")}</div></div>`).join("")}`;

  document.getElementById("kanonen").innerHTML = `<h3 class="rk-title">Torschützenkönige</h3><p class="sub">Beste Bundesliga-Torjäger einer Saison im Werder-Trikot</p>
    ${R.torschuetzenkoenige.map((k) => `<div class="kanone"><span class="yr">${esc(k.season)}</span>
      <span class="nm">${esc(k.name)}${k.note ? `<small>${esc(k.note)}</small>` : ""}</span>
      <span class="g">${k.goals} <small>Tore</small></span></div>`).join("")}`;
})();
