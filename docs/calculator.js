// ================================
// Lifetime Cashflow Calculator v6
// ================================
(function () {
  // ---- Globals (expected by the app) ----
  window.__CALC_VERSION__ = "v6";

  // Minimal starter state; keep shapes v4 expects
  window.state = {
    currentAge: 40,
    endAge: 90,
    pots: [
      // Example: { name: "Cash", balance: 10000 }
    ],
    flowsTable: [
      // Example row shape v4 may use:
      // { year: 2025, income: 30000, expenses: 24000, net: 6000 }
    ],
    annualTable: [
      // Example: { age: 40, opening: 0, net: 6000, closing: 6000 }
    ],
  };

  // ---- Utility helpers ----
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

  // ---- Default compute (replace with v4's) ----
  // PASTE V4 compute() HERE (keep the signature).
  window.compute = function compute() {
    // This default just synthesizes trivial rows as a scaffold.
    const rows = [];
    const annual = [];
    let opening = 0;
    for (let age = window.state.currentAge; age <= window.state.endAge; age++) {
      const income = age < 67 ? 30000 : 20000; // naive: work then pension
      const expenses = 24000;                  // naive flat cost
      const net = income - expenses;
      const year = new Date().getFullYear() + (age - window.state.currentAge);

      rows.push({ year, income, expenses, net });
      const closing = opening + net;
      annual.push({ age, opening, net, closing });
      opening = closing;
    }
    window.state.flowsTable = rows;
    window.state.annualTable = annual;
    return { rows, annual };
  };

  // ---- Default render (replace with v4's) ----
  // PASTE V4 render() HERE (keep the signature).
  window.render = function render() {
    try {
      // badge first so we always get live feedback
      setBadge();

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

      // final badge with counts (robust against empty states)
      setBadge();
    } catch (err) {
      console.error("render() error:", err);
      setBadge("render error");
    }
  };

  // ---- Wire-up & boot ----
  function boot() {
    // Dev console breadcrumbs
    console.log("__CALC_VERSION__:", window.__CALC_VERSION__);
    console.log("state:", typeof window.state);
    console.log("render:", typeof window.render);
    console.log("compute:", typeof window.compute);

    // Recompute on input changes (mirrors typical v4 behaviour)
    $$("#inputsCard input").forEach((el) => {
      el.addEventListener("input", () => {
        readInputsIntoState();
        window.compute();
        window.render();
      });
    });

    // First paint
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
