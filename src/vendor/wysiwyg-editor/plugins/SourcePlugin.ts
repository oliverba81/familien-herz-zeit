import { BasePlugin } from './BasePlugin';

export class SourcePlugin extends BasePlugin {
  readonly name = 'Source';

  init(): void {
    this.registerCommand('toggleSource', () => {
      this.editor.toggleSourceMode();
    });
  }

  destroy(): void {}
}
