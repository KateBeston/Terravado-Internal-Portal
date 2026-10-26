"use client";
/* ===========================================================================
   Chart — faithful React port of the original hand-built SVG chart().
   Supports bar / line / area / step series, dual axes, grid, tooltips.
   No charting library, matching the original.
   =========================================================================== */
import { num } from "@/lib/format";

const LINE = "#E4E0D6", BLACK = "#0B0B0A", FAINT = "#A9A49A";

export interface Series {
  key: string;
  type: "line" | "bar" | "area";
  color: string;
  label?: string;
  axis?: "left" | "right";
  width?: number;
  dash?: string;
  dots?: boolean;
  step?: boolean;
  opacity?: number;
  colorFn?: (v: number) => string;
  tip?: (v: number) => string;
}
export interface ChartOpts {
  xKey: string;
  series: Series[];
  height?: number;
  yFmt?: (v: number) => string;
  xFmt?: (v: any) => string;
  y2Fmt?: (v: number) => string;
}

const shortN = (v: number) =>
  Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(2) + "M" : Math.abs(v) >= 1e3 ? Math.round(v / 1e3) + "k" : String(Math.round(v));

function stepPath(data: any[], px: (i: number) => number, Y: (v: number) => number, key: string) {
  let d = "";
  data.forEach((row, i) => {
    const x = px(i), y = Y(num(row[key]));
    if (i === 0) d += `M ${x.toFixed(1)},${y.toFixed(1)}`;
    else { const py = Y(num(data[i - 1][key])); d += ` L ${x.toFixed(1)},${py.toFixed(1)} L ${x.toFixed(1)},${y.toFixed(1)}`; }
  });
  return d;
}

export default function Chart({ data, opts }: { data: any[]; opts: ChartOpts }) {
  const W = 800, H = opts.height || 280, PL = 58,
    PR = opts.series.some((x) => x.axis === "right") ? 46 : 12, PT = 10, PB = 26;
  const iw = W - PL - PR, ih = H - PT - PB;
  const left = opts.series.filter((s) => s.axis !== "right"), right = opts.series.filter((s) => s.axis === "right");
  const vals = (k: string) => data.map((d) => num(d[k]));
  const range = (list: Series[]): [number, number] => {
    let mn = Infinity, mx = -Infinity;
    list.forEach((s) => vals(s.key).forEach((v) => { mn = Math.min(mn, v); mx = Math.max(mx, v); }));
    if (!isFinite(mn)) { mn = 0; mx = 1; }
    if (mn > 0) mn = 0; if (mx < 0) mx = 0;
    if (mn === mx) mx = mn + 1;
    const pad = (mx - mn) * 0.06; return [mn - (mn < 0 ? pad : 0), mx + pad];
  };
  const [l0, l1] = range(left), [r0, r1] = right.length ? range(right) : [0, 1];
  const n = data.length;
  const anyBar = opts.series.some((s) => s.type === "bar");
  const X = (i: number) => PL + (n <= 1 ? iw / 2 : i * iw / (n - 1));
  const XB = (i: number) => PL + (i + 0.5) * iw / n;
  const YL = (v: number) => PT + ih - ((v - l0) / (l1 - l0)) * ih;
  const YR = (v: number) => PT + ih - ((v - r0) / (r1 - r0)) * ih;
  const yFmt = opts.yFmt || shortN, xFmt = opts.xFmt || ((v: any) => v);
  const els: React.ReactNode[] = [];
  let ki = 0;

  for (let t = 0; t <= 4; t++) {
    const v = l0 + (l1 - l0) * t / 4, y = YL(v);
    els.push(<line key={`gl${ki++}`} x1={PL} x2={W - PR} y1={y} y2={y} stroke={LINE} strokeDasharray="2 4" />);
    els.push(<text key={`gt${ki++}`} x={PL - 8} y={y + 3} textAnchor="end" fontSize="10" fill={FAINT}>{yFmt(v)}</text>);
  }
  if (right.length) for (let t = 0; t <= 4; t++) {
    const v = r0 + (r1 - r0) * t / 4, y = YR(v);
    els.push(<text key={`r${ki++}`} x={W - PR + 8} y={y + 3} textAnchor="start" fontSize="10" fill={FAINT}>{(opts.y2Fmt || ((x: number) => x.toFixed(1)))(v)}</text>);
  }
  if (l0 < 0 && l1 > 0) els.push(<line key={`z${ki++}`} x1={PL} x2={W - PR} y1={YL(0)} y2={YL(0)} stroke={BLACK} />);
  const step = Math.max(1, Math.ceil(n / 12));
  data.forEach((d, i) => {
    if (i % step === 0 || i === n - 1)
      els.push(<text key={`x${ki++}`} x={anyBar ? XB(i) : X(i)} y={H - 8} textAnchor="middle" fontSize="10" fill={FAINT}>{xFmt(d[opts.xKey])}</text>);
  });

  const bars = opts.series.filter((s) => s.type === "bar").length; let bi = 0;
  opts.series.forEach((s) => {
    const Y = s.axis === "right" ? YR : YL;
    if (s.type === "bar") {
      const bw = iw / n * 0.62 / bars, off = (bi - (bars - 1) / 2) * bw;
      data.forEach((d, i) => {
        const v = num(d[s.key]), y0 = Y(0), y1v = Y(v);
        const top = Math.min(y0, y1v), h = Math.max(1, Math.abs(y0 - y1v));
        const col = s.colorFn ? s.colorFn(v) : s.color;
        els.push(<rect key={`b${ki++}`} x={XB(i) + off - bw / 2} y={top} width={bw} height={h} fill={col} opacity={s.opacity}>
          <title>{`${xFmt(d[opts.xKey])}: ${s.tip ? s.tip(v) : v}`}</title></rect>);
      });
      bi++;
    } else {
      const px = (i: number) => (bars ? XB(i) : X(i));
      const pts = data.map((d, i) => `${px(i).toFixed(1)},${Y(num(d[s.key])).toFixed(1)}`);
      if (s.type === "area") {
        els.push(<polygon key={`a${ki++}`} points={`${px(0).toFixed(1)},${Y(0).toFixed(1)} ${pts.join(" ")} ${px(n - 1).toFixed(1)},${Y(0).toFixed(1)}`} fill={s.color} opacity={s.opacity || .4} />);
      } else {
        const d0 = s.step ? stepPath(data, px, Y, s.key) : `M ${pts.join(" L ")}`;
        els.push(<path key={`p${ki++}`} d={d0} fill="none" stroke={s.color} strokeWidth={s.width || 2.2} strokeDasharray={s.dash} strokeLinejoin="round" />);
        if (s.dots) data.forEach((d, i) =>
          els.push(<circle key={`d${ki++}`} cx={px(i)} cy={Y(num(d[s.key]))} r="2.6" fill={s.color}>
            <title>{`${xFmt(d[opts.xKey])}: ${s.tip ? s.tip(num(d[s.key])) : num(d[s.key])}`}</title></circle>));
      }
    }
  });

  const legend = opts.series.filter((s) => s.label);
  return (
    <>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img">{els}</svg>
      {legend.length > 0 && (
        <div className="legend">
          {legend.map((s, i) => <span key={i}><i style={{ background: s.color }} />{s.label}</span>)}
        </div>
      )}
    </>
  );
}
