// ================================
// Lifetime Cashflow Calculator v6
// ================================
(function () {
  // ---- Globals ----
  window.__CALC_VERSION__ = "v6";

  // Keep shapes v4 expects
  window.state = {
    currentAge: 40,
    endAge: 90,
    pots: [
      // e.g., { name: "Cash", balance: 10000 }
    ],
    flowsTable: [],
    annualTable: [],
  };

  // ---- Utilities ----
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function setBadge(extra = "") {
    const el = $("#badge");
    const flows = window.state?.flowsTable?.length || 0;
    const annual = window.state?.annualTable?.length || 0;
    if (el) {
      el.textContent = `Calculator ${window.__CALC_VERSION__} ✅ | Flows: ${flows} | Annual: ${annual}${extra ? " | " + extra : ""}`;
    }
  }

  function safeNumber(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function readInputsIntoState() {
    const curr = $("#currentAge");
    const end = $("#endAge");
    if (curr) window.state.currentAge = safeNumber(curr.value, window.state.currentAge);
    if (end) window.state.endAge = safeNumber(end.value, window.state.endAge);
  }

  // ---- DEV helpers (export/import/reset) ----
  function download(filename, text) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  function bindDevButtons() {
    const btnExport = $("#btnExport");
    const btnImport = $("#btnImport");
    const btnReset  = $("#btnReset");
    const file      = $("#importFile");

    btnExport?.addEventListener("click", () => {
      download(`cashflow_state_${Date.now()}.json`, JSON.stringify(window.state, null, 2));
    });
    btnImport?.addEventListener("click", () => file?.click());
    file?.addEventListener("change", async () => {
      const f = file.files?.[0]; if (!f) return;
      try {
        const json = JSON.parse(await f.text());
        if (json && typeof json === "object") {
          window.state = json;
          window.compute();
          window.render();
        }
      } catch (e) { console.error("Import failed", e); }
    });
    btnReset?.addEventListener("click", () => {
      window.state = { currentAge: 40, endAge: 90, pots: [], flowsTable: [], annualTable: [] };
      window.compute();
      window.render();
    });
  }

  // ---- compute() scaffold (replace with v4 engine) ----
  // PASTE your v4 compute() logic inside this function body.
  window.compute = function compute() {
    const rows = [];
    const annual = [];
    const startAge = safeNumber(window.state.currentAge, 40);
    const endAge   = Math.max(startAge, safeNumber(window.state.endAge, 90));
    let opening = 0;
    for (let age = startAge; age <= endAge; age++) {
      const income = age < 67 ? 30000 : 20000; // naive: work then pension
      const expenses = 24000;                  // naive flat cost
      const net = income - expenses;
      const year = new Date().getFullYear() + (age - startAge);

      rows.push({ year, income, expenses, net });
      const closing = opening + net;
      annual.push({ age, opening, net, closing });
      opening = closing;
    }
    window.state.flowsTable = rows;
    window.state.annualTable = annual;
    return { rows, annual };
  };

  // ---- render() scaffold (replace with v4 painter) ----
  // PASTE your v4 render() logic inside this function body.
  window.render = function render() {
    try {
      setBadge(); // live feedback

      // pots
      const potsBody = $("#potsBody");
      if (potsBody) {
        potsBody.innerHTML = "";
        const pots = window.state.pots || [];
        if (!pots.length) {
          potsBody.innerHTML = `<tr><td class="muted">None</td><td class="muted" style="text-align:right">—</td></tr>`;
        } else {
          for (const p of pots) {
            const tr = document.createElement("tr");
            tr.innerHTML = `<td>${p.name ?? "Pot"}</td><td>${(p.balance ?? 0).toLocaleString(undefined,{maximumFractionDigits:0})}</td>`;
            potsBody.appendChild(tr);
          }
        }
      }

      // flows
      const flowsBody = $("#flowsBody");
      if (flowsBody) {
        flowsBody.innerHTML = "";
        for (const r of window.state.flowsTable || []) {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>${r.year}</td>
            <td>${(r.income ?? 0).toLocaleString()}</td>
            <td>${(r.expenses ?? 0).toLocaleString()}</td>
            <td>${(r.net ?? 0).toLocaleString()}</td>
          `;
          flowsBody.appendChild(tr);
        }
        if (!window.state.flowsTable?.length) {
          flowsBody.innerHTML = `<tr><td class="muted" colspan="4">No rows</td></tr>`;
        }
      }

      // annual
      const annualBody = $("#annualBody");
      if (annualBody) {
        annualBody.innerHTML = "";
        for (const r of window.state.annualTable || []) {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>${r.age}</td>
            <td>${(r.opening ?? 0).toLocaleString()}</td>
            <td>${(r.net ?? 0).toLocaleString()}</td>
            <td>${(r.closing ?? 0).toLocaleString()}</td>
          `;
          annualBody.appendChild(tr);
        }
        if (!window.state.annualTable?.length) {
          annualBody.innerHTML = `<tr><td class="muted" colspan="4">No rows</td></tr>`;
        }
      }

      setBadge(); // update with counts
    } catch (err) {
      console.error("render() error:", err);
      setBadge("render error");
    }
  };

  // ---- Boot ----
  function boot() {
    console.log("__CALC_VERSION__:", window.__CALC_VERSION__);
    console.log("state:", typeof window.state);
    console.log("render:", typeof window.render);
    console.log("compute:", typeof window.compute);

    $$("#inputsCard input").forEach((el) => {
      el.addEventListener("input", () => {
        readInputsIntoState();
        window.compute();
        window.render();
      });
    });

    bindDevButtons();
    readInputsIntoState();
    window.compute();
    window.render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
