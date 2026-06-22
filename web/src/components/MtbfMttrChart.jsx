import LineTrendChart from './LineTrendChart.jsx';

// Placeholder targets -- replace with whatever values make sense for your
// machines/process once decided.
const MTBF_TARGET = 100; // jam
const MTTR_TARGET = 2; // jam

export default function MtbfMttrChart({ data }) {
  return (
    <>
      <LineTrendChart
        title="MTBF Trend" sub="Mean Time Between Failure (jam antara problem)"
        data={data} valueKey="mtbf" color="#a855f7" unit="jam"
        target={MTBF_TARGET} targetLabel={`${MTBF_TARGET} jam`}
      />
      <LineTrendChart
        title="MTTR Trend" sub="Mean Time To Repair (jam untuk perbaikan)"
        data={data} valueKey="mttr" color="#00d084" unit="jam"
        target={MTTR_TARGET} targetLabel={`${MTTR_TARGET} jam`}
      />
    </>
  );
}
