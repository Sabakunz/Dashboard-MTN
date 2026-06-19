import { useToast } from '../ToastContext.jsx';

export default function ParetoList({ data, labelKey }) {
  const showToast = useToast();
  if (!data.length) {
    return <div style={{ color: 'var(--muted)', fontSize: 12 }}>Tidak ada data</div>;
  }
  const max = Math.max(...data.map((p) => p.pct));

  return (
    <>
      {data.map((p, i) => (
        <div className="pareto-row" key={i} onClick={() => showToast(`${p[labelKey]}: ${p.count}x (${p.pct}%)`, 'green')}>
          <div className="pareto-rank">{i + 1}</div>
          <div className="pareto-name">{p[labelKey]}</div>
          <div className="pareto-bar-wrap"><div className="pareto-bar-fill" style={{ width: `${(p.pct / max) * 100}%` }}></div></div>
          <div className="pareto-pct">{p.pct}%</div>
          <div className="pareto-count">{p.count}x</div>
        </div>
      ))}
    </>
  );
}
