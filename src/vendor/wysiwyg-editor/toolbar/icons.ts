import { CUSTOM_ICONS } from './icons-custom';
import type { EditorOptions } from '../core/types';

export function resolveIcons(option: EditorOptions['icons']): Record<string, string> {
  if (!option || option === 'custom') return CUSTOM_ICONS;
  if (typeof option === 'object') {
    return { ...CUSTOM_ICONS, ...(option as Record<string, string>) };
  }
  return CUSTOM_ICONS;
}
