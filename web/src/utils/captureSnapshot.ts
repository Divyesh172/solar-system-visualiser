import { useSnapshotStore } from '../state/useSnapshotStore';
import { useFocusStore } from '../state/useFocusStore';
import { useSimulationClock } from '../science/useSimulationClock';
import { PLANETARY_METADATA } from '../science/constants';
import { formatJde } from '../science/time';
import type { PlanetKey } from '../science/ephemeris';

export async function captureSnapshot(): Promise<void> {
  const store = useSnapshotStore.getState();
  store.triggerFlash();

  // Small delay for flash effect to start smoothly
  await new Promise((resolve) => setTimeout(resolve, 80));

  const webglCanvas = document.querySelector('canvas') as HTMLCanvasElement | null;
  if (!webglCanvas) {
    console.error('No WebGL canvas found for snapshot');
    return;
  }

  // Determine current target info
  const selectedId = useFocusStore.getState().selectedId;
  const currentJde = useSimulationClock.getState().currentJde;
  const dateStr = formatJde(currentJde);

  let targetTitle = 'The Solar System';
  let targetSubtitle = 'Heliocentric Planetary Observation';

  if (selectedId && selectedId in PLANETARY_METADATA) {
    const meta = PLANETARY_METADATA[selectedId as PlanetKey];
    targetTitle = `${meta.name}`;
    targetSubtitle = `${meta.temperatureKid} • Radius ${meta.radiusKm.toLocaleString()} km`;
  }

  const w = webglCanvas.width;
  const h = webglCanvas.height;

  const composite = document.createElement('canvas');
  composite.width = w;
  composite.height = h;
  const ctx = composite.getContext('2d');
  if (!ctx) return;

  // 1. Draw 3D scene from WebGL buffer
  ctx.drawImage(webglCanvas, 0, 0, w, h);

  // Scale elements relative to 1080p
  const s = Math.max(0.65, Math.min(w, h) / 1080);

  const drawRoundRect = (x: number, y: number, rw: number, rh: number, r: number) => {
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, rw, rh, r);
    } else {
      ctx.rect(x, y, rw, rh);
    }
  };

  // 2. Postcard Border Frame
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.lineWidth = Math.max(2, 4 * s);
  ctx.strokeRect(12 * s, 12 * s, w - 24 * s, h - 24 * s);

  // 3. Top-Left Badge: "🚀 KIDSTAR SPACE EXPLORER"
  const badgeW = 310 * s;
  const badgeH = 46 * s;
  drawRoundRect(24 * s, 24 * s, badgeW, badgeH, 14 * s);
  ctx.fillStyle = 'rgba(10, 16, 30, 0.75)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.24)';
  ctx.lineWidth = 1.5 * s;
  ctx.stroke();

  ctx.fillStyle = '#38bdf8';
  ctx.font = `bold ${Math.round(15 * s)}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.fillText('🚀 KIDSTAR SPACE EXPLORER', 42 * s, 24 * s + badgeH / 2);

  // 4. Bottom-Left Card: Target Info
  const cardW = Math.min(w - 48 * s, 460 * s);
  const cardH = 92 * s;
  const cardY = h - 24 * s - cardH;
  drawRoundRect(24 * s, cardY, cardW, cardH, 18 * s);
  ctx.fillStyle = 'rgba(10, 16, 30, 0.78)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.24)';
  ctx.lineWidth = 1.5 * s;
  ctx.stroke();

  // Target title
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(26 * s)}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.fillText(targetTitle, 44 * s, cardY + 34 * s);

  // Subtitle
  ctx.fillStyle = '#94a3b8';
  ctx.font = `${Math.round(13 * s)}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.fillText(targetSubtitle, 44 * s, cardY + 68 * s);

  // 5. Bottom-Right Badge: Date & Observatory Stamp
  const dateW = Math.min(w - 48 * s, 340 * s);
  const dateH = 46 * s;
  const dateX = w - 24 * s - dateW;
  const dateY = h - 24 * s - dateH;

  if (dateX > 24 * s + cardW + 16 * s) {
    drawRoundRect(dateX, dateY, dateW, dateH, 14 * s);
    ctx.fillStyle = 'rgba(10, 16, 30, 0.75)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.24)';
    ctx.lineWidth = 1.5 * s;
    ctx.stroke();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = `600 ${Math.round(13 * s)}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillText(`📅 ${dateStr}`, dateX + 18 * s, dateY + dateH / 2);
  }

  // 6. Convert to Blob & DataURL and open modal
  composite.toBlob(
    (blob) => {
      if (!blob) return;
      const imageUrl = URL.createObjectURL(blob);
      store.openSnapshot({
        imageUrl,
        imageBlob: blob,
        targetTitle,
        dateStr,
      });
    },
    'image/png',
    1.0
  );
}
