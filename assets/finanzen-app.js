(function () {
  "use strict";
  const F = window.FINANZEN;
  const root = document.getElementById("fin-root");
  if (!F || !root) return;
  const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmt = (n, d = 1) => Number(n).toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d });
  const signed = (n, d = 1) => (n > 0 ? "+" : n < 0 ? "−" : "±") + fmt(Math.abs(n), d);

  const Y = F.years;
  const last = Y[Y.length - 1];
  const maxRev = Math.max(...Y.map((y) => y.revenue));
  const maxRes = Math.max(...Y.map((y) => Math.abs(y.result)));
  const eq = Y.filter((y) => y.equity !== undefined || y.equityNegative);
  const maxEq = Math.max(...eq.map((y) => Math.abs(y.equity || 0)), 1);
  const H = F.halfYear;

  root.innerHTML = `
    <div class="fin-kpis">
      <div class="kpi"><div class="label">Umsatz ${last.fy}</div><div class="value">${fmt(last.revenue)} <small>Mio. €</small></div><div class="ctx">Vorjahr ${fmt(Y[Y.length - 2].revenue)} Mio. €</div></div>
      <div class="kpi"><div class="label">Ergebnis ${last.fy}</div><div class="value ${last.result < 0 ? "down" : "up"}">${signed(last.result)} <small>Mio. €</small></div><div class="ctx">Vorjahr ${signed(Y[Y.length - 2].result)} Mio. €</div></div>
      <div class="kpi"><div class="label">Eigenkapital 30.06.2025</div><div class="value">${fmt(last.equity)} <small>Mio. €</small></div><div class="ctx">Quote ${fmt(last.equityRatio)} %</div></div>
      <div class="kpi"><div class="label">Personalaufwand ${last.fy}</div><div class="value">${fmt(last.personnel)} <small>Mio. €</small></div><div class="ctx">${fmt((last.personnel / last.revenue) * 100, 0)} % vom Umsatz</div></div>
      <div class="kpi"><div class="label">${esc(H.label.split(" (")[0])}</div><div class="value down">${signed(H.result)} <small>Mio. €</small></div><div class="ctx">Umsatz ${fmt(H.revenue)} Mio. € (Vj. ${fmt(H.revenuePrev)})</div></div>
    </div>

    <div class="grid-2">
      <article class="card">
        <h3 class="rk-title">Umsatz und Ergebnis</h3>
        <p class="sub">Konzern, Geschäftsjahr Juli bis Juni, in Mio. €. Fahr über ein Jahr für Details.</p>
        <div class="fin-chart" role="img" aria-label="Umsatz und Ergebnis je Geschäftsjahr">
          ${Y.map((y) => `<div class="fy" tabindex="0" title="${esc(y.fy)}: Umsatz ${fmt(y.revenue)} Mio. €${y.revenueCalc ? " (berechnet)" : ""}, Ergebnis ${signed(y.result)} Mio. €. ${esc(y.note)}">
            <span class="fy-rev-v">${fmt(y.revenue, 0)}</span>
            <span class="fy-rev"><i class="${y.league === "BL2" ? "bl2" : ""}" style="height:${(y.revenue / maxRev) * 100}%"></i></span>
            <span class="fy-res"><span class="fy-res-up">${y.result > 0 ? `<i class="pos" style="height:${(y.result / maxRes) * 100}%"></i>` : ""}</span><span class="fy-res-down">${y.result < 0 ? `<i class="neg" style="height:${(-y.result / maxRes) * 100}%"></i>` : ""}</span></span>
            <span class="fy-res-v ${y.result < 0 ? "down" : "up"}">${signed(y.result)}</span>
            <span class="fy-l">${y.fy.slice(2)}</span>
          </div>`).join("")}
        </div>
        <div class="legend"><span><i class="sw"></i>Umsatz</span><span><i class="sw sw-hatch"></i>Zweitliga-Jahr</span><span><i class="sw sw-w"></i>Gewinn</span><span><i class="sw sw-l"></i>Verlust</span></div>
        <p class="hint">Je nach Quelle wird „Umsatz“ unterschiedlich abgegrenzt, etwa mit oder ohne Transfererlöse. Hier steht jeweils der Konzernumsatz, 2020/21 aus dem Rückgang zum Vorjahr berechnet.</p>
      </article>

      <article class="card">
        <h3 class="rk-title">Eigenkapital</h3>
        <p class="sub">Vom Corona-Tief zurück ins Positive, dann wieder kleiner</p>
        <div class="eq">${eq.map((y) => `<div class="eq-row"><span class="eq-y">${y.fy}</span>
          <span class="eq-track"><span class="eq-neg">${(y.equity || 0) < 0 || y.equityNegative ? `<i style="width:${y.equity ? (-y.equity / maxEq) * 100 : 20}%"></i>` : ""}</span><span class="eq-pos">${(y.equity || 0) > 0 ? `<i style="width:${(y.equity / maxEq) * 100}%"></i>` : ""}</span></span>
          <b class="${(y.equity || 0) < 0 || y.equityNegative ? "down" : "up"}">${y.equity !== undefined ? signed(y.equity) + " Mio. €" : "negativ"}</b></div>`).join("")}</div>
        <p class="hint">2020/21: nicht durch Eigenkapital gedeckter Fehlbetrag der KGaA. 2022/23: laut Verein negativ, ohne veröffentlichte Zahl.</p>
        <h3 class="rk-title" style="margin-top:18px">Was sich 2024/25 bei den Erlösen änderte</h3>
        <div class="chg">${F.revenueChange2425.map(([l, v]) => `<div class="chg-row"><span>${esc(l)}</span><span class="chg-track"><i class="${v >= 0 ? "pos" : "neg"}" style="${v >= 0 ? "left:50%" : "right:50%"};width:${(Math.abs(v) / 18) * 50}%"></i></span><b class="${v >= 0 ? "up" : "down"}">${signed(v)} Mio. €</b></div>`).join("")}</div>
        <p class="hint">Transfererlöse: ${fmt(Y[Y.length - 2].transfers)} Mio. € (2023/24) und rechnerisch ${fmt(last.transfers)} Mio. € (2024/25). Betriebliche Aufwendungen 2024/25: ${fmt(last.opex)} Mio. €.</p>
      </article>
    </div>

    <article class="card">
      <h3 class="rk-title">Wichtige Fakten</h3>
      <div class="fin-facts">${F.facts.map((f) => `<div class="fin-fact"><b>${esc(f.big)}</b><span>${esc(f.label)}</span><small>Quelle: ${esc(f.src)}</small></div>`).join("")}</div>
      <p class="verdict">${esc(H.label)}: ${esc(H.note)}</p>
      <div class="table-scroll"><table class="fin-table">
        <thead><tr><th class="l">Geschäftsjahr</th><th>Liga</th><th>Umsatz</th><th>Ergebnis</th><th>Eigenkapital</th><th class="l">Einordnung</th><th class="l">Quelle</th></tr></thead>
        <tbody>${Y.map((y) => `<tr><td class="l">${y.fy}</td><td>${y.league === "BL2" ? "2. BL" : "BL"}</td><td>${fmt(y.revenue)}${y.revenueCalc ? "*" : ""}</td><td class="${y.result < 0 ? "down" : "up"}">${signed(y.result)}</td><td>${y.equity !== undefined ? signed(y.equity) : y.equityNegative ? "negativ" : "–"}</td><td class="l">${esc(y.note)}</td><td class="l small">${esc(y.src)}</td></tr>`).join("")}</tbody>
      </table></div>
      <p class="hint">Alle Beträge in Mio. €. * berechnet. Stand ${esc(F.stand)}, der Abschluss 2025/26 war noch nicht veröffentlicht.</p>
      <details class="srcs"><summary>Quellen</summary><ul>${F.sources.map(([t, u]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a></li>`).join("")}</ul></details>
    </article>`;
})();
