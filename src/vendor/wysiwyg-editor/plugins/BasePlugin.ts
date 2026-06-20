import type { Editor } from '../core/Editor';
import type { ToolbarItemConfig } from '../core/types';

export abstract class BasePlugin {
  abstract readonly name: string;
  protected editor: Editor;

  constructor(editor: Editor) {
    this.editor = editor;
  }

  abstract init(): void;
  abstract destroy(): void;

  getToolbarItems(): ToolbarItemConfig[] {
    return [];
  }

  protected registerCommand(name: string, handler: (args?: unknown) => void): void {
    this.editor.commands.register(name, handler);
  }
}
