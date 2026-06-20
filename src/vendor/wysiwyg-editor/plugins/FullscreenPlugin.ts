import { BasePlugin } from './BasePlugin';

export class FullscreenPlugin extends BasePlugin {
  readonly name = 'Fullscreen';

  init(): void {
    this.registerCommand('toggleFullscreen', () => {
      this.editor.toggleFullscreen();
    });
  }

  destroy(): void {}
}
