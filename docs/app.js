const { useMemo, useState, useEffect, useRef } = React;

// ---------- Helpers ----------
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const currency = (v) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 })
    .format(isNaN(v) ? 0 : v);

function ageToMonthIndex(currentAge, age) { return Math.round((age - currentAge) * 12); }
function monthsRange(fromIdx, toIdxExclusive) {
  const out = [];
  for (let i = Math.max(0, fromIdx); i < toIdxExclusive; i++) out.push(i);
  return out;
}
const lastId = (arr) => (arr && arr.length ? (arr[arr.length - 1].id || 0) : 0);

// ---------- Small Chart.js React wrappers ----------
function useChartJs(canvasRef, config) {
  useEffect(() => {
    if (!canvasRef.current || !window.Chart) return;
    const chart = new Chart(canvasRef.current.getContext('2d'), config());
    return () => chart.destroy();
  }, [canvasRef, config]);
}

function BarChartJS({ labels, inflows, outflows }) {
  const ref = useRef(null);
  useChartJs(ref, () => ({
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Inflows', data: inflows },
        { label: 'Outflows', data: outflows }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top' }, tooltip: { callbacks: { label: (ctx) => currency(ctx.raw) } } },
      scales: {
        y: { ticks: { callback: (v) => (Math.abs(v) >= 1000 ? Math.round(v/1000)+'k' : v) } }
      }
    }
  }));
  return <canvas ref={ref} />;
}

function LineChartJS({ labels, balance }) {
  const ref = useRef(null);
  useChartJs(ref, () => ({
    type: 'line',
    data: {
      labels,
      datasets: [{ label: 'Balance', data: balance, pointRadius: 0, tension: 0.3 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top' }, tooltip: { callbacks: { label: (ctx) => currency(ctx.raw) } } },
      scales: {
        y: { ticks: { callback: (v) => (Math.abs(v) >= 1000 ? Math.round(v/1000)+'k' : v) } }
      }
    }
  }));
  return <canvas ref={ref} />;
}

// ---------- App ----------
function App() {
  // Global horizon
  const [currentAge, setCurrentAge] = useState(40);
  const [endAge, setEndAge] = useState(90);

  // Income/Expense rows
  const [flows, setFlows] = useState([
    { id: 1, name: "Salary", amountMonthly: 2000, startAge: 40, endAge: 65 },
    { id: 2, name: "Living costs", amountMonthly: -1500, startAge: 40, endAge: 90 },
  ]);

  // Pots
  const [pots, setPots] = useState([
    { id: 1, name: "Pension-like pot", inMonthly: 500, inStartAge: 45, inYears: 20, outStartAge: 66, outYears: 20, lockEqualInOut: true, overrideOutMonthly: "" },
  ]);

  const horizonMonths = useMemo(
    () => Math.max(0, Math.round((endAge - currentAge) * 12 + 12)),
    [currentAge, endAge]
  );

  // Engine
  const engine = useMemo(() => {
    const months = horizonMonths;
    const net = new Array(months).fill(0);
    const potBalances = pots.map(() => new Array(months).fill(0));

    // flows
    flows.forEach((f) => {
      const s = ageToMonthIndex(currentAge, f.startAge);
      const e = ageToMonthIndex(currentAge, f.endAge + 1);
      monthsRange(s, e).forEach((m) => { net[m] += Number(f.amountMonthly) || 0; });
    });

    // pots
    pots.forEach((p, idx) => {
      const inMonths = Math.max(0, Math.round(p.inYears * 12));
      const outMonths = Math.max(0, Math.round(p.outYears * 12));
      const inStart = ageToMonthIndex(currentAge, p.inStartAge);
      const outStart = ageToMonthIndex(currentAge, p.outStartAge);

      let outMonthly;
      const userOverride = parseFloat(p.overrideOutMonthly);
      if (!isNaN(userOverride)) outMonthly = userOverride;
      else if (p.lockEqualInOut) outMonthly = (p.inYears === p.outYears) ? p.inMonthly : (p.inMonthly * inMonths) / Math.max(1, outMonths);
      else outMonthly = (p.inMonthly * inMonths) / Math.max(1, outMonths);

      // contribs
      monthsRange(inStart, inStart + inMonths).forEach((m) => {
        net[m] -= Number(p.inMonthly) || 0;
        potBalances[idx][m] = (m > 0 ? potBalances[idx][m - 1] : 0) + (Number(p.inMonthly) || 0);
      });

      // carry forward after contribs
      for (let m = inStart + inMonths; m < months; m++) {
        potBalances[idx][m] = potBalances[idx][m - 1] || 0;
      }

      // drawdown
      monthsRange(outStart, outStart + outMonths).forEach((m) => {
        net[m] += Number(outMonthly) || 0;
        potBalances[idx][m] = (m > 0 ? potBalances[idx][m - 1] : 0) - (Number(outMonthly) || 0);
      });

      // backfill before start
      for (let m = 0; m < Math.min(inStart, months); m++) {
        potBalances[idx][m] = m > 0 ? potBalances[idx][m - 1] : 0;
      }
    });

    const totalPotBalance = new Array(months).fill(0);
    for (let m = 0; m < months; m++) {
      totalPotBalance[m] = pots.reduce((acc, _p, i) => acc + (potBalances[i][m] || 0), 0);
    }
    return { net, totalPotBalance };
  }, [flows, pots, currentAge, horizonMonths]);

  // Annual summary
  const annual = useMemo(() => {
    const years = [];
    const months = horizonMonths;
    const startYearAge = Math.floor(currentAge);
    const totalYears = Math.ceil(months / 12);
    let negPotSeen = false;

    for (let y = 0; y < totalYears; y++) {
      const from = y * 12;
      const to = Math.min(months, from + 12);
      let sumNet = 0;
      for (let m = from; m < to; m++) sumNet += engine.net[m] || 0;
      const endBal = engine.totalPotBalance[Math.max(0, to - 1)] || 0;
      for (let m = from; m < to; m++) if ((engine.totalPotBalance[m] || 0) < -1e-6) negPotSeen = true;

      years.push({
        age: startYearAge + y,
        inflows: sumNet >= 0 ? sumNet : 0,
        outflows: sumNet < 0 ? -sumNet : 0,
        net: sumNet,
        potBalance: endBal
      });
    }
    return { rows: years, negPotSeen };
  }, [engine, horizonMonths, currentAge]);

  // UI helpers
  const addFlow = () => {
    const id = lastId(flows) + 1;
    setFlows([...flows, { id, name: "New flow", amountMonthly: 0, startAge: currentAge, endAge }]);
  };
  const removeFlow = (id) => setFlows(flows.filter((f) => f.id !== id));

  const addPot = () => {
    const id = lastId(pots) + 1;
    setPots([...pots, {
      id, name: `Pot ${id}`, inMonthly: 0, inStartAge: currentAge, inYears: 10,
      outStartAge: Math.min(endAge, currentAge + 11), outYears: 10, lockEqualInOut: true, overrideOutMonthly: ""
    }]);
  };
  const removePot = (id) => setPots(pots.filter((p) => p.id !== id));

  const labels = annual.rows.map(r => r.age);
  const inflows = annual.rows.map(r => Math.round(r.inflows));
  const outflows = annual.rows.map(r => Math.round(r.outflows));
  const balances = annual.rows.map(r => Math.round(r.potBalance));

  return (
    <div>
      {/* Planning horizon */}
      <section className="card" style={{marginBottom:16}}>
        <h2 style={{marginTop:0}}>Planning Horizon</h2>
        <div style={{display:'grid', gridTemplateColumns:'repeat(4, minmax(0,1fr))', gap:12}}>
          <label>Current age
            <input type="number" min={0} max={120} value={currentAge}
              onChange={(e)=>setCurrentAge(clamp(parseInt(e.target.value||0),0,120))}/>
          </label>
          <label>End age
            <input type="number" min={currentAge} max={120} value={endAge}
              onChange={(e)=>setEndAge(clamp(parseInt(e.target.value||0), currentAge, 120))}/>
          </label>
          <div className="muted" style={{gridColumn:'span 2'}}>Engine runs monthly; charts & table summarise yearly by age.</div>
        </div>
      </section>

      {/* Flows */}
      <section className="card" style={{marginBottom:16}}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12}}>
          <h2 style={{margin:0}}>Incomes & Expenses</h2>
          <button className="btn" onClick={addFlow}>+ Add flow</button>
        </div>
        <div style={{overflowX:'auto'}}>
          <table>
            <thead>
              <tr className="muted">
                <th>Name</th><th>£/month</th><th>Start age</th><th>End age</th><th></th>
              </tr>
            </thead>
            <tbody>
              {flows.map((f)=>(
                <tr key={f.id}>
                  <td><input value={f.name} onChange={e=>setFlows(flows.map(x=>x.id===f.id? {...x, name:e.target.value}:x))}/></td>
                  <td><input type="number" value={f.amountMonthly} onChange={e=>setFlows(flows.map(x=>x.id===f.id? {...x, amountMonthly: parseFloat(e.target.value||0)}:x))}/></td>
                  <td><input type="number" value={f.startAge} onChange={e=>setFlows(flows.map(x=>x.id===f.id? {...x, startAge: parseFloat(e.target.value||0)}:x))}/></td>
                  <td><input type="number" value={f.endAge} onChange={e=>setFlows(flows.map(x=>x.id===f.id? {...x, endAge: parseFloat(e.target.value||0)}:x))}/></td>
                  <td style={{textAlign:'right'}}><button className="btn" style={{background:'#e2e8f0', color:'#0f172a'}} onClick={()=>removeFlow(f.id)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{fontSize:12, marginTop:8}}>Tip: positive = income; negative = expense. Ages inclusive.</p>
      </section>

      {/* Pots */}
      <section className="card" style={{marginBottom:16}}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <h2 style={{margin:0}}>Pay-In / Pay-Out Pots</h2>
          <button className="btn" onClick={addPot}>+ Add pot</button>
        </div>
        <p className="muted">Total withdrawals equal total contributions (unless overridden). If years differ, we compute a level payout.</p>

        <div style={{display:'grid', gap:12}}>
          {pots.map((p)=>{
            const inMonths = Math.max(0, Math.round(p.inYears * 12));
            const outMonths = Math.max(0, Math.round(p.outYears * 12));
            let impliedOutMonthly = (p.inMonthly * inMonths) / Math.max(1, outMonths);
            if (p.lockEqualInOut && p.inYears === p.outYears) impliedOutMonthly = p.inMonthly;
            const outMonthly = p.overrideOutMonthly !== "" ? parseFloat(p.overrideOutMonthly || 0) : impliedOutMonthly;

            return (
              <div key={p.id} className="card" style={{padding:12}}>
                <div style={{display:'flex', gap:8, alignItems:'center', marginBottom:8}}>
                  <input value={p.name} onChange={e=>setPots(pots.map(x=>x.id===p.id? {...x, name:e.target.value}:x))} />
                  <button className="btn" style={{background:'#e2e8f0', color:'#0f172a', marginLeft:'auto'}} onClick={()=>removePot(p.id)}>Delete</button>
                </div>

                <div style={{display:'grid', gridTemplateColumns:'repeat(12, minmax(0,1fr))', gap:8, alignItems:'end'}}>
                  <label style={{gridColumn:'span 3'}}>Pay-in £/month
                    <input type="number" value={p.inMonthly} onChange={e=>setPots(pots.map(x=>x.id===p.id? {...x, inMonthly: parseFloat(e.target.value||0)}:x))}/>
                  </label>
                  <label style={{gridColumn:'span 3'}}>Pay-in start age
                    <input type="number" value={p.inStartAge} onChange={e=>setPots(pots.map(x=>x.id===p.id? {...x, inStartAge: parseFloat(e.target.value||0)}:x))}/>
                  </label>
                  <label style={{gridColumn:'span 2'}}>Pay-in years
                    <input type="number" value={p.inYears} onChange={e=>setPots(pots.map(x=>x.id===p.id? {...x, inYears: parseFloat(e.target.value||0)}:x))}/>
                  </label>
                  <label style={{gridColumn:'span 3'}}>Pay-out start age
                    <input type="number" value={p.outStartAge} onChange={e=>setPots(pots.map(x=>x.id===p.id? {...x, outStartAge: parseFloat(e.target.value||0)}:x))}/>
                  </label>
                  <label style={{gridColumn:'span 2'}}>Pay-out years
                    <input type="number" value={p.outYears} onChange={e=>setPots(pots.map(x=>x.id===p.id? {...x, outYears: parseFloat(e.target.value||0)}:x))}/>
                  </label>

                  <label style={{gridColumn:'span 12', display:'flex', alignItems:'center', gap:8'}}>
                    <input type="checkbox" checked={p.lockEqualInOut}
                      onChange={e=>setPots(pots.map(x=>x.id===p.id? {...x, lockEqualInOut: e.target.checked}:x))}/>
                    Lock £out to equal £in (if years match; else compute equivalent)
                  </label>

                  <label style={{gridColumn:'span 12', display:'flex', alignItems:'center', gap:8'}}>
                    Override £/month out:
                    <input type="number" placeholder={impliedOutMonthly.toFixed(0)} style={{width:120}}
                      value={p.overrideOutMonthly}
                      onChange={e=>setPots(pots.map(x=>x.id===p.id? {...x, overrideOutMonthly: e.target.value}:x))}/>
                    <span className="muted" style={{fontSize:12}}>(leave blank to auto-compute)</span>

                    <div style={{marginLeft:'auto'}} className="muted">
                      Implied pay-out: <strong>{currency(outMonthly)}</strong> / month
                    </div>
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Charts (Chart.js) */}
      <section style={{display:'grid', gridTemplateColumns:'1fr', gap:16}}>
        <div className="card">
          <h3 style={{marginTop:0}}>Net cashflow per year</h3>
          <div style={{height:260}}><BarChartJS labels={labels} inflows={inflows} outflows={outflows} /></div>
        </div>

        <div className="card">
          <h3 style={{marginTop:0}}>Total pot balance (no-growth)</h3>
          <div style={{height:260}}><LineChartJS labels={labels} balance={balances} /></div>
        </div>
      </section>

      {/* Table */}
      <section className="card" style={{marginTop:16}}>
        <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:8}}>
          <h3 style={{margin:0}}>Annual summary (today’s pounds)</h3>
          {annual.negPotSeen && (<span className="warn">Warning: pot dips below £0 with current settings</span>)}
        </div>
        <div style={{overflowX:'auto'}}>
          <table>
            <thead>
              <tr className="muted">
                <th>Age</th><th>Inflows</th><th>Outflows</th><th>Net</th><th>Pot balance (end-yr)</th>
              </tr>
            </thead>
            <tbody>
              {annual.rows.map(r=>(
                <tr key={r.age}>
                  <td>{r.age}</td>
                  <td>{currency(r.inflows)}</td>
                  <td>{currency(r.outflows)}</td>
                  <td style={{color: r.net>=0? '#047857' : '#be123c'}}>{currency(r.net)}</td>
                  <td style={{color: r.potBalance>=0? 'inherit' : '#be123c'}}>{currency(r.potBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{fontSize:12, marginTop:8}}>No-growth, no-inflation model for quick feasibility checks. For regulated advice, use appropriate tools & disclosures.</p>
      </section>

      <footer className="muted" style={{fontSize:12, padding:'24px 4px', textAlign:'center'}}>
        © {new Date().getFullYear()} Academy of Life Planning — Back-of-the-Packet Forecaster.
      </footer>
    </div>
  );
}

// Mount
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
