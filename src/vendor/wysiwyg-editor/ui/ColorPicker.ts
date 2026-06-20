export class ColorPicker {
  element: HTMLElement;
  private _canvas: HTMLCanvasElement;
  private _hueCanvas: HTMLCanvasElement;
  private _preview: HTMLElement;
  private _hexInput: HTMLInputElement;
  private _hue = 0;
  private _sat = 1;
  private _val = 1;

  constructor(initialColor: string, recentColors: string[] = []) {
    this.element = document.createElement('div');
    this.element.className = 'wysiwyg-color-picker';
    this._canvas = document.createElement('canvas');
    this._canvas.width = 200;
    this._canvas.height = 150;
    this._canvas.className = 'wysiwyg-color-canvas';
    this._hueCanvas = document.createElement('canvas');
    this._hueCanvas.width = 200;
    this._hueCanvas.height = 20;
    this._hueCanvas.className = 'wysiwyg-hue-canvas';
    this._preview = document.createElement('div');
    this._preview.className = 'wysiwyg-color-preview';
    this._hexInput = document.createElement('input');
    this._hexInput.type = 'text';
    this._hexInput.className = 'wysiwyg-input wysiwyg-hex-input';
    this._hexInput.placeholder = '#000000';
    this._hexInput.value = this._normalizeColor(initialColor) ?? '#000000';

    this._parseColor(this._hexInput.value);
    this._drawHue();
    this._drawGradient();
    this._updatePreview();

    this._canvas.addEventListener('click', (e) => this._onCanvasClick(e));
    this._hueCanvas.addEventListener('click', (e) => this._onHueClick(e));
    this._hexInput.addEventListener('change', () => {
      const normalized = this._normalizeColor(this._hexInput.value);
      if (normalized) {
        this._hexInput.value = normalized;
        this._parseColor(normalized);
      }
      this._drawGradient();
      this._updatePreview();
    });

    if (recentColors.length > 0) {
      const recentRow = document.createElement('div');
      recentRow.className = 'wysiwyg-recent-colors';
      recentColors.forEach(c => {
        const swatch = document.createElement('button');
        swatch.className = 'wysiwyg-color-swatch';
        swatch.style.backgroundColor = c;
        swatch.title = c;
        swatch.addEventListener('click', () => {
          this._hexInput.value = c;
          this._parseColor(c);
          this._drawGradient();
          this._updatePreview();
        });
        recentRow.appendChild(swatch);
      });
      this.element.appendChild(recentRow);
    }

    const presets = ['#000000','#ffffff','#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899','#6b7280'];
    const presetsRow = document.createElement('div');
    presetsRow.className = 'wysiwyg-color-presets';
    presets.forEach(c => {
      const swatch = document.createElement('button');
      swatch.className = 'wysiwyg-color-swatch';
      swatch.style.backgroundColor = c;
      swatch.title = c;
      swatch.addEventListener('click', () => {
        this._hexInput.value = c;
        this._parseColor(c);
        this._drawGradient();
        this._updatePreview();
      });
      presetsRow.appendChild(swatch);
    });

    this.element.appendChild(this._canvas);
    this.element.appendChild(this._hueCanvas);
    this.element.appendChild(presetsRow);
    const row = document.createElement('div');
    row.className = 'wysiwyg-color-input-row';
    row.appendChild(this._preview);
    row.appendChild(this._hexInput);
    this.element.appendChild(row);
  }

  private _parseColor(hex: string): void {
    const normalized = this._normalizeColor(hex);
    if (!normalized) return;
    const clean = normalized.slice(1);
    const r = parseInt(clean.slice(0, 2), 16) / 255;
    const g = parseInt(clean.slice(2, 4), 16) / 255;
    const b = parseInt(clean.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    this._val = max;
    this._sat = max === 0 ? 0 : (max - min) / max;
    if (max === min) { this._hue = 0; return; }
    const d = max - min;
    if (max === r) this._hue = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) this._hue = ((b - r) / d + 2) / 6;
    else this._hue = ((r - g) / d + 4) / 6;
  }

  private _drawGradient(): void {
    const ctx = this._canvas.getContext('2d')!;
    const h = this._hue * 360;
    const w = this._canvas.width, ht = this._canvas.height;
    ctx.clearRect(0, 0, w, ht);
    const gradX = ctx.createLinearGradient(0, 0, w, 0);
    gradX.addColorStop(0, '#fff');
    gradX.addColorStop(1, `hsl(${h},100%,50%)`);
    ctx.fillStyle = gradX;
    ctx.fillRect(0, 0, w, ht);
    const gradY = ctx.createLinearGradient(0, 0, 0, ht);
    gradY.addColorStop(0, 'transparent');
    gradY.addColorStop(1, '#000');
    ctx.fillStyle = gradY;
    ctx.fillRect(0, 0, w, ht);
  }

  private _drawHue(): void {
    const ctx = this._hueCanvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, this._hueCanvas.width, 0);
    for (let i = 0; i <= 6; i++) grad.addColorStop(i / 6, `hsl(${i * 60},100%,50%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this._hueCanvas.width, this._hueCanvas.height);
  }

  private _onCanvasClick(e: MouseEvent): void {
    const rect = this._canvas.getBoundingClientRect();
    this._sat = (e.clientX - rect.left) / rect.width;
    this._val = 1 - (e.clientY - rect.top) / rect.height;
    this._sat = Math.max(0, Math.min(1, this._sat));
    this._val = Math.max(0, Math.min(1, this._val));
    this._hexInput.value = this._getHsvValue();
    this._updatePreview();
  }

  private _onHueClick(e: MouseEvent): void {
    const rect = this._hueCanvas.getBoundingClientRect();
    this._hue = (e.clientX - rect.left) / rect.width;
    this._hue = Math.max(0, Math.min(1, this._hue));
    this._drawGradient();
    this._hexInput.value = this._getHsvValue();
    this._updatePreview();
  }

  private _updatePreview(): void {
    this._preview.style.backgroundColor = this.getValue();
  }

  private _getHsvValue(): string {
    const h = this._hue * 360;
    const s = this._sat;
    const v = this._val;
    const i = Math.floor(h / 60) % 6;
    const f = h / 60 - Math.floor(h / 60);
    const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
    let r = 0, g = 0, b = 0;
    if (i === 0) { r = v; g = t; b = p; }
    else if (i === 1) { r = q; g = v; b = p; }
    else if (i === 2) { r = p; g = v; b = t; }
    else if (i === 3) { r = p; g = q; b = v; }
    else if (i === 4) { r = t; g = p; b = v; }
    else { r = v; g = p; b = q; }
    const hex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
    return `#${hex(r)}${hex(g)}${hex(b)}`;
  }

  getValue(): string {
    const normalized = this._normalizeColor(this._hexInput.value);
    if (normalized) return normalized;
    return this._getHsvValue();
  }

  private _normalizeColor(value: string): string | null {
    const trimmed = value.trim();
    const hexMatch = trimmed.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
    if (hexMatch) {
      const hex = hexMatch[1];
      if (hex.length === 3) {
        return `#${hex.split('').map(char => char + char).join('')}`.toLowerCase();
      }
      return `#${hex}`.toLowerCase();
    }

    const rgbMatch = trimmed.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/);
    if (!rgbMatch) return null;

    const toHex = (channel: string) => {
      const value = Math.max(0, Math.min(255, Number(channel)));
      return value.toString(16).padStart(2, '0');
    };
    return `#${toHex(rgbMatch[1])}${toHex(rgbMatch[2])}${toHex(rgbMatch[3])}`;
  }
}
