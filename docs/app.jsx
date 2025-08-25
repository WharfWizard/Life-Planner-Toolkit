// Show any runtime error on page
function showErr(msg) {
  const box = document.getElementById('err') || (() => {
    const b = document.createElement('div');
    b.id = 'err';
    b.style.cssText = 'background:#fff0f0;color:#7f1d1d;border:1px solid #fecaca;padding:10px;margin:12px 0;border-radius:8px';
    document.body.prepend(b);
    return b;
  })();
  box.textContent = 'Error: ' + msg;
  console.error(msg);
}

// Sanity logs
console.log('React:', !!window.React, 'ReactDOM:', !!window.ReactDOM, 'Recharts:', !!window.Recharts);

// Simple render without any app logic
const { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } = window.Recharts || {};

function Smoke() {
  return (
    <div style={{background:'#fff', padding:16, borderRadius:12}}>
      <h2 style={{marginTop:0}}>✅ App booted</h2>
      <div style={{height:200}}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[{x:'A',y:10},{x:'B',y:20}]}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" />
            <YAxis />
            <Bar dataKey="y" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

try {
  if (!window.React || !window.ReactDOM) throw new Error('React or ReactDOM missing');
  if (!window.Recharts) throw new Error('Recharts missing');
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(<Smoke />);
} catch (e) {
  showErr(e.message || String(e));
}

