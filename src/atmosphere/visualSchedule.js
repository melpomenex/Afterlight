// The renderer samples the same authored schedule/absolute clock as semantic
// rain. Visual rows stay client-side; no second timer or server state exists.
export function sampleVisualSchedule(preset, now, out) {
  const schedule=preset?.schedule;
  if(!schedule)return null;
  const phase=((now%schedule.cycleMs)+schedule.cycleMs)%schedule.cycleMs;
  const frames=schedule.keyframes;
  let i=0;while(i<frames.length-1&&frames[i+1].atMs<=phase)i++;
  const a=frames[i],b=frames[(i+1)%frames.length];
  if(!a.visuals||!b.visuals)return null;
  const span=(i+1<frames.length?b.atMs:schedule.cycleMs)-a.atMs;
  const u=Math.max(0,Math.min(1,(phase-a.atMs)/span));
  out.fromVisuals=a.visuals;out.toVisuals=b.visuals;out.u=u*u*(3-2*u);
  return out;
}
