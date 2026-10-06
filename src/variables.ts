/* ── Variable catalog ── */
import type { Variable, VariableId } from './types';

export const VARIABLES: Record<VariableId, Variable> = {
  temperature: {
    id: 'temperature',
    label: 'Temperature',
    icon: '🌡',
    unit: '°C / decade',
    colorNeg: '#2166ac',
    colorNeu: '#f7f7f7',
    colorPos: '#b2182b',
    labelNeg: 'Cooling',
    labelPos: 'Warming',
  },
  precipitation: {
    id: 'precipitation',
    label: 'Precipitation',
    icon: '🌧',
    unit: 'mm / decade',
    colorNeg: '#d6604d',
    colorNeu: '#f7f7f7',
    colorPos: '#4393c3',
    labelNeg: 'Decreasing',
    labelPos: 'Increasing',
  },
  vegetation: {
    id: 'vegetation',
    label: 'Vegetation',
    icon: '🌱',
    unit: 'NDVI / decade',
    colorNeg: '#8c510a',
    colorNeu: '#f5f5f5',
    colorPos: '#01665e',
    labelNeg: 'Declining',
    labelPos: 'Increasing',
  },
};
