// Default ("Общий профиль") inspection thresholds from the site's /check/ tool.
const wallLimits = Object.freeze({au585:.70, au750:.65, au750w:.70, pt950:.85, ag925:.80});
// Generation acceptance rule. Gray faces still count as unmeasured and are reported.
const minCoverage = .95;

export function stlPositions(buffer) {
  const bytes = new DataView(buffer);
  if (bytes.byteLength < 84) throw new Error('Неполный заголовок STL.');
  const faces = bytes.getUint32(80,true);
  if (!faces || 84 + 50 * faces !== bytes.byteLength)
    throw new Error('Размер STL не совпадает с числом граней.');
  const positions = new Float32Array(faces * 9);
  for (let i=0; i<faces; i++) {
    const offset=84 + 50*i + 12;
    for (let axis=0;axis<9;axis++) {
      const value=bytes.getFloat32(offset+axis*4,true);
      if (!Number.isFinite(value)) throw new Error('В STL найдена некорректная координата.');
      positions[9*i+axis]=value;
    }
  }
  return positions;
}

export function inspectionResult(metrics, walls, alloy) {
  if (!Object.hasOwn(wallLimits,alloy)) throw new Error('Выберите сплав для проверки.');
  const threshold=wallLimits[alloy];
  const criticalThreshold=Number(Math.max(.45,threshold-.18).toFixed(2));
  let measured=0, red=0, warning=0, minimum=Infinity;
  if (metrics.triCount!==walls.length) throw new Error('Получена неполная карта толщин.');
  for (const wall of walls) {
    if (!(wall>0 && Number.isFinite(wall))) continue;
    measured++;
    minimum=Math.min(minimum,wall);
    if(wall<criticalThreshold) red++;
    else if(wall<threshold) warning++;
  }
  const faces=walls.length, missing=faces-measured, coverage=faces ? measured/faces : 0;
  const faults=[];
  if(!metrics.reliable) faults.push('нарушена топология');
  if(metrics.shells!==1) faults.push('число оболочек: '+metrics.shells);
  if(metrics.weldOpen || metrics.weldNonManifold || metrics.weldCollapsed)
    faults.push('дефекты после сварки на сетке 0,001 мм');
  if(metrics.microEdges) faults.push('рёбра короче 0,001 мм: '+metrics.microEdges);
  if(metrics.scaleWarning) faults.push(metrics.scaleWarning);
  if(!measured) faults.push('нет встречных замеров');
  else if(coverage<minCoverage) faults.push('измерено менее 95% граней');
  if(red || warning) faults.push('ниже порога '+threshold.toLocaleString('ru-RU')+' мм: '+(red+warning));
  return {pass:!faults.length, detail:faults.join(' · '), open:metrics.openEdges,
    nonmanifold:metrics.nonManifold, inconsistent:metrics.inconsistent, red,warning,
    missing,measured,coverage,minCoverage,min:measured?minimum:null,faces,threshold,criticalThreshold,metrics};
}

export async function inspectSTL(buffer, alloy='au585', {signal,onProgress}={}) {
  if (signal?.aborted) throw new DOMException('Проверка отменена.','AbortError');
  if (!Object.hasOwn(wallLimits,alloy)) throw new Error('Выберите сплав для проверки.');
  const positions=stlPositions(buffer);
  const worker=new Worker(new URL('./check-worker.js',import.meta.url));
  return new Promise((resolve,reject)=>{
    const cleanup=()=>{worker.terminate(); signal?.removeEventListener('abort',abort);};
    const abort=()=>{cleanup();reject(new DOMException('Проверка отменена.','AbortError'));};
    signal?.addEventListener('abort',abort,{once:true});
    worker.onerror=event=>{cleanup();reject(new Error(event.message || 'Не удалось запустить инспектор STL.'));};
    worker.onmessageerror=()=>{cleanup();reject(new Error('Не удалось прочитать ответ инспектора STL.'));};
    worker.onmessage=({data})=>{
      if ('percent' in data) {onProgress?.(data.percent);return;}
      cleanup();
      try {
        if (data.error) throw new Error(data.error);
        resolve(inspectionResult(data.metrics,data.walls,alloy));
      } catch(error) {reject(error);}
    };
    worker.postMessage(positions,[positions.buffer]);
  });
}
