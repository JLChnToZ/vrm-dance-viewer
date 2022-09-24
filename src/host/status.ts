import { combineLatest } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import workerService from './worker-service';
import { observeMediaQuery } from '../utils/rx-helpers';

export interface Stats {
  render: {
    calls: number;
    frame: number;
    lines: number;
    points: number;
    triangles: number;
  };
  memory: {
    geometries: number;
    textures: number;
    heap: {
      jsHeapSizeLimit?: number;
      totalJSHeapSize?: number;
      usedJSHeapSize?: number;
    };
  };
  fps: number;
}

const statsUpdate = workerService.observe<Stats>('stats').pipe(shareReplay(1));
const darkThemeObservable = observeMediaQuery('(prefers-color-scheme:dark)');

export default function register(fpsDisp: HTMLElement, drawCallDisp: HTMLElement, triCntDisp: HTMLElement) {
  if (!fpsDisp.textContent) fpsDisp.textContent = '0';
  if (!drawCallDisp.textContent) drawCallDisp.textContent = '0';
  if (!triCntDisp.textContent) triCntDisp.textContent = '0';
  combineLatest([statsUpdate.pipe(map(stats => stats.fps)), darkThemeObservable])
  .subscribe(([fps, isDarkTheme]) => {
    fpsDisp.textContent = fps.toFixed(2);
    fpsDisp.style.color = calculateColor(fps, 20, 40, 60, 120, isDarkTheme);
  });
  combineLatest([statsUpdate.pipe(map(stats => stats.render.calls)), darkThemeObservable])
  .subscribe(([calls, isDarkTheme]) => {
    drawCallDisp.textContent = calls.toString();
    drawCallDisp.style.color = calculateColor(-calls, -128, -96, -32, 0, isDarkTheme);
  });
  combineLatest([statsUpdate.pipe(map(stats => stats.render.triangles)), darkThemeObservable])
  .subscribe(([triangles, isDarkTheme]) => {
    triCntDisp.textContent = triangles.toString();
    triCntDisp.style.color = calculateColor(-triangles, -5e5, -5e4, -5e3, 0, isDarkTheme);
  });
}

function calculateColor(v: number, r: number, y: number, g: number, c: number, isDarkTheme: boolean) {
  if (v < r || Number.isNaN(v)) return color2RGB(1, 0, 0, isDarkTheme);
  if (v < y) return color2RGB(1, 1 - (r - v) / (y - r), 0, isDarkTheme);
  if (v < g) return color2RGB((g - v) / (g - y), 1, 0, isDarkTheme);
  if (v < c) return color2RGB(0, 1, 1 - (c - v) / (c - g), isDarkTheme);
  return color2RGB(0, 1, 1, isDarkTheme);
}

function color2RGB(r: number, g: number, b: number, isDarkTheme: boolean) {
  return `#${(
    Math.round(0xFF * (r || 0)) << 16 |
    Math.round(0xFF * (g || 0) * (isDarkTheme ? 1 : 0.5)) << 8 |
    Math.round(0xFF * (b || 0))
  ).toString(16).padStart(6, '0')}`;
}