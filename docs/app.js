// Visible error helper
function showErr(msg) {
  var box = document.getElementById('err');
  if (box) { box.style.display='block'; box.textContent = 'Error: ' + msg; }
  console.error(msg);
}
window.addEventListener('error', e => showErr(e.error?.message || e.message));

// Sanity logs
console.log('Sanity → React:', !!window.React, 'ReactDOM:', !!window.ReactDOM, 'Recharts:', !!window.Recharts);

const { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } = window.Recharts || {};

function Smoke() {
  return (
    <div style={{background:'#fff', padding:16, borderRadius:12, boxShadow:'0 2px 12px rgba(0,0,0,.06)'}}>
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
