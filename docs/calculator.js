// docs/calculator.js
(function () {
  "use strict";

  // ---------------------------
  // Version + tiny helpers
  // ---------------------------
  const __CALC_VERSION__ = "v6";
  console.log("__CALC_VERSION__:", __CALC_VERSION__);

  const GBP = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  });

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ---------------------------
  // State (persisted)
  // ---------------------------
  const STORAGE_KEY = "lifetime-calc-v6";
  let state = loadState();

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return {
      currentAge: 40,
      endAge: 90,
      flows: [
        { id: 1, name: "Salary", amountMonthly: 2000, startAge: 40, endAge: 65 },
        { id: 2, name: "Living costs", amountMonthly: -1500, startAge: 40, endAge: 90 },
      ],
      nextFlowId: 3,
      pots: [
        {
          id: 1,
          name: "Pension-like pot",
          inMonthly: 500, inStartAge: 45, inYears: 20,
          outStartAge: 66, outYears: 20,
          lockEqualInOut: true,
          overrideOutMonthly: ""
        },
      ],
      nextPotId: 2,
      flowsTable: [],
      annualTable: [],
    };
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }

  // Expose for debugging
  window.state = state;
  console.log("state:", typeof state);

  // ---------------------------
  // Compute (debounced)
  // ---------------------------
  let computeQueued = false;
  let renderQueued = false;

  function computeNow() {
    console.log("compute: function");
    try {
      // If a v4/v6 bridge is present, let it fill flowsTable/annualTable
      if (typeof window.v4Compute === "function") {
        window.v4Compute();
      } else {
        // Fallback: zero-out tables
        state.flowsTable = [];
        state.annualTable = [];
      }
    } catch (err) {
      console.error("compute() error:", err);
    }
  }

  function renderNow() {
    console.log("render: function");
    // Badge
    const badge = $("#badge");
    if (badge) {
      const rows = state?.flowsTable?.length || 0;
      const annual = state?.annualTable?.length || 0;
      badge.textContent = `Calculator ${__CALC_VERSION__} ✅ | Flows: ${rows} | Annual: ${annual}`;
    }

    // Inputs
    const currentAgeEl = $("#currentAge");
    const endAgeEl = $("#endAge");
    if (currentAgeEl) currentAgeEl.value = Number(state.currentAge || 0);
    if (endAgeEl) endAgeEl.value = Number(state.endAge || 0);

    // Flows table
    const flowsBody = $("#flowsBody");
    if (flowsBody) {
      flowsBody.innerHTML = "";
      const rows = state.flowsTable || [];
      if (!rows.length) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 4;
        td.className = "muted";
        td.textContent = "No rows yet";
        tr.appendChild(td);
        flowsBody.appendChild(tr);
      } else {
        rows.forEach(r => {
          const tr = document.createElement("tr");
          const tYear = document.createElement("td"); tYear.textContent = String(r.year);
          const tInc  = document.createElement("td"); tInc.textContent  = GBP.format(r.income || 0);
          const tExp  = document.createElement("td"); tExp.textContent  = GBP.format(r.expenses || 0);
          const tNet  = document.createElement("td"); tNet.textContent  = GBP.format(r.net || 0);
          tr.append(tYear, tInc, tExp, tNet);
          flowsBody.appendChild(tr);
        });
      }
    }

    // Annual table
    const annualBody = $("#annualBody");
    if (annualBody) {
      annualBody.innerHTML = "";
      const rows = state.annualTable || [];
      if (!rows.length) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 4;
        td.className = "muted";
        td.textContent = "No rows yet";
        tr.appendChild(td);
        annualBody.appendChild(tr);
      } else {
        rows.forEach(r => {
          const tr = document.createElement("tr");
          const tAge = document.createElement("td"); tAge.textContent = String(r.age);
          const tOpn = document.createElement("td"); tOpn.textContent = GBP.format(r.opening || 0);
          const tNet = document.createElement("td"); tNet.textContent = GBP.format(r.net || 0);
          const tCls = document.createElement("td"); tCls.textContent = GBP.format(r.closing || 0);
          tr.append(tAge, tOpn, tNet, tCls);
          annualBody.appendChild(tr);
        });
      }
    }

    // Pots summary (simple name column; balances are implied/handled by compute engine if needed)
    const potsBody = $("#potsBody");
    if (potsBody) {
      potsBody.innerHTML = "";
      const pots = state.pots || [];
      if (!pots.length) {
        const tr = document.createElement("tr");
        const td1 = document.createElement("td");
        td1.className = "muted";
        td1.textContent = "None yet";
        const td2 = document.createElement("td");
        td2.className = "muted";
        td2.style.textAlign = "right";
        td2.textContent = "—";
        tr.append(td1, td2);
        potsBody.appendChild(tr);
      } else {
        pots.forEach(p => {
          const tr = document.createElement("tr");
          const td1 = document.createElement("td"); td1.textContent = p.name || `Pot ${p.id}`;
          const td2 = document.createElement("td"); td2.style.textAlign = "right"; td2.textContent = "—";
          tr.append(td1, td2);
          potsBody.appendChild(tr);
        });
      }
    }
  }

  // Debounced wrappers (prevents runaway loops on rapid input)
  function compute() {
    if (computeQueued) return;
    computeQueued = true;
    requestAnimationFrame(() => {
      computeQueued = false;
      console.log("[v4] compute() called");
      computeNow();
      saveState();
      render(); // paint after compute
    });
  }
  function render() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
      renderQueued = false;
      renderNow();
    });
  }

  // Expose for HTML hooks and v4 bridge
  window.compute = compute;
  window.render = render;

  // ---------------------------
  // Wire UI events
  // ---------------------------
  function wireInputs() {
    const currentAgeEl = $("#currentAge");
    const endAgeEl = $("#endAge");

    if (currentAgeEl) {
      currentAgeEl.addEventListener("input", () => {
        state.currentAge = Number(currentAgeEl.value || 0);
        compute();
      });
    }
    if (endAgeEl) {
      endAgeEl.addEventListener("input", () => {
        state.endAge = Number(endAgeEl.value || 0);
        compute();
      });
    }

    // Export
    const btnExport = $("#btnExport");
    if (btnExport) btnExport.addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "lifetime-calc-v6.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });

    // Import
    const btnImport = $("#btnImport");
    const fileInput = $("#importFile");
    if (btnImport && fileInput) {
      btnImport.addEventListener("click", () => fileInput.click());
      fileInput.addEventListener("change", async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        try {
          const text = await file.text();
          const data = JSON.parse(text);
          if (typeof data === "object" && data) {
            state = Object.assign({}, state, data);
            window.state = state; // keep exposed reference in sync
            compute();
            // v4 editors repaint (if present)
            if (typeof window.v4Render === "function") window.v4Render();
          }
        } catch (err) {
          alert("Import failed: " + (err?.message || err));
        } finally {
          e.target.value = "";
        }
      });
    }

    // Reset
    const btnReset = $("#btnReset");
    if (btnReset) {
      btnReset.addEventListener("click", () => {
        localStorage.removeItem(STORAGE_KEY);
        state = loadState();
        window.state = state; // keep exposed reference in sync
        // Paint editors first (so inputs reflect defaults), then compute
        if (typeof window.v4Render === "function") window.v4Render();
        compute();
      });
    }
  }

  // ---------------------------
  // Boot
  // ---------------------------
  function boot() {
    // Initial v4 editors render (inputs + editors)
    if (typeof window.v4Render === "function") window.v4Render();

    // Wire all buttons/inputs once DOM is ready
    wireInputs();

    // First compute + paint
    compute();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();


