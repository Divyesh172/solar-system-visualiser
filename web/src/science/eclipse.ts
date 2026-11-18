/**
 * High-Precision Eclipse Predictor Engine.
 * 
 * Leverages Astronomy Engine to calculate real-time Solar and Lunar eclipses,
 * active eclipse states, and upcoming astronomical events.
 */

import * as Astronomy from 'astronomy-engine';
import { jdeToDate, dateToJde } from './time';

export type EclipseType = 'solar' | 'lunar';

export interface EclipseEvent {
  id: string;
  type: EclipseType;
  kind: string; // 'total' | 'partial' | 'annular' | 'hybrid' | 'penumbral'
  peakDate: Date;
  peakJde: number;
  diffDays: number;
  diffHours: number;
  isActive: boolean;
  label: string;
  description: string;
  emoji: string;
  badgeColor: string;
}

export interface EclipseReport {
  activeEclipse: EclipseEvent | null;
  upcomingEclipse: EclipseEvent | null;
  nextSolar: EclipseEvent;
  nextLunar: EclipseEvent;
}

/**
 * Searches and analyzes the closest solar and lunar eclipses relative to simulated time.
 */
export function getEclipseReport(currentJde: number): EclipseReport {
  const currentDate = jdeToDate(currentJde);

  // Search starting 12 hours prior to capture any eclipse currently in progress
  const searchStart = new Date(currentDate.getTime() - 12 * 3600 * 1000);

  // 1. Solar Eclipse Search
  const solarRaw = Astronomy.SearchGlobalSolarEclipse(searchStart);
  const solarPeakDate = solarRaw.peak.date;
  const solarDiffMs = solarPeakDate.getTime() - currentDate.getTime();
  const solarDiffHours = solarDiffMs / (3600 * 1000);
  const solarDiffDays = solarDiffHours / 24.0;
  // A global solar eclipse typically lasts ~2.5 hours before and after peak
  const isSolarActive = Math.abs(solarDiffHours) <= 2.5;

  let solarKindName = 'Solar Eclipse';
  if (solarRaw.kind === 'total') solarKindName = 'Total Solar Eclipse';
  else if (solarRaw.kind === 'annular') solarKindName = 'Annular "Ring of Fire" Eclipse';
  else solarKindName = 'Partial Solar Eclipse';

  const nextSolar: EclipseEvent = {
    id: `solar-${solarPeakDate.toISOString()}`,
    type: 'solar',
    kind: solarRaw.kind,
    peakDate: solarPeakDate,
    peakJde: dateToJde(solarPeakDate),
    diffDays: Math.round(solarDiffDays * 10) / 10,
    diffHours: Math.round(solarDiffHours * 10) / 10,
    isActive: isSolarActive,
    label: solarKindName,
    description: isSolarActive
      ? 'The Moon is passing directly between the Sun and Earth right now, casting its shadow onto the surface!'
      : `Next ${solarKindName} will peak on ${solarPeakDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}.`,
    emoji: solarRaw.kind === 'total' ? '🌑☀️' : '🌒',
    badgeColor: '#f59e0b',
  };

  // 2. Lunar Eclipse Search
  const lunarRaw = Astronomy.SearchLunarEclipse(searchStart);
  const lunarPeakDate = lunarRaw.peak.date;
  const lunarDiffMs = lunarPeakDate.getTime() - currentDate.getTime();
  const lunarDiffHours = lunarDiffMs / (3600 * 1000);
  const lunarDiffDays = lunarDiffHours / 24.0;
  // Semi-duration in hours for penumbral eclipse
  const lunarSemiDurationHours = (lunarRaw.sd_penum || 120) / 60.0;
  const isLunarActive = Math.abs(lunarDiffHours) <= lunarSemiDurationHours;

  let lunarKindName = 'Lunar Eclipse';
  if (lunarRaw.kind === 'total') lunarKindName = 'Total "Blood Moon" Eclipse';
  else if (lunarRaw.kind === 'partial') lunarKindName = 'Partial Lunar Eclipse';
  else lunarKindName = 'Penumbral Lunar Eclipse';

  const nextLunar: EclipseEvent = {
    id: `lunar-${lunarPeakDate.toISOString()}`,
    type: 'lunar',
    kind: lunarRaw.kind,
    peakDate: lunarPeakDate,
    peakJde: dateToJde(lunarPeakDate),
    diffDays: Math.round(lunarDiffDays * 10) / 10,
    diffHours: Math.round(lunarDiffHours * 10) / 10,
    isActive: isLunarActive,
    label: lunarKindName,
    description: isLunarActive
      ? 'Earth is passing directly between the Sun and Moon right now, casting Earth’s shadow onto the Moon!'
      : `Next ${lunarKindName} will peak on ${lunarPeakDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}.`,
    emoji: lunarRaw.kind === 'total' ? '🌕🔴' : '🌗',
    badgeColor: '#ef4444',
  };

  // Determine currently active eclipse (if any)
  const activeEclipse = isSolarActive ? nextSolar : isLunarActive ? nextLunar : null;

  // Determine closest upcoming eclipse within 30 days
  let upcomingEclipse: EclipseEvent | null = null;
  if (!activeEclipse) {
    if (solarDiffDays > 0 && solarDiffDays <= 30 && (lunarDiffDays <= 0 || solarDiffDays < lunarDiffDays)) {
      upcomingEclipse = nextSolar;
    } else if (lunarDiffDays > 0 && lunarDiffDays <= 30) {
      upcomingEclipse = nextLunar;
    }
  }

  return {
    activeEclipse,
    upcomingEclipse,
    nextSolar,
    nextLunar,
  };
}
