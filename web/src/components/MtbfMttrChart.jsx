import LineTrendChart from './LineTrendChart.jsx';

export default function MtbfMttrChart({ data, lineLabel, year }) {
  const scope = lineLabel ? `LINE ${lineLabel.toUpperCase()}` : 'SEMUA MESIN';
  return (
    <>
      <LineTrendChart
        title={`MTBF ${scope} ${year}`}
        data={data} valueKey="mtbf" targetKey="mtbfTarget" color="#a855f7" unit="jam"
      />
      <LineTrendChart
        title={`MTTR ${scope} ${year}`}
        data={data} valueKey="mttr" targetKey="mttrTarget" color="#00d084" unit="jam"
      />
    </>
  );
}
