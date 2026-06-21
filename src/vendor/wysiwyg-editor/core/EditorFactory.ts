import { Editor } from './Editor';
import type { EditorOptions } from './types';
import { Toolbar } from '../toolbar/Toolbar';
import { TextFormattingPlugin } from '../plugins/TextFormattingPlugin';
import { ParagraphPlugin } from '../plugins/ParagraphPlugin';
import { AlignmentPlugin } from '../plugins/AlignmentPlugin';
import { ListPlugin } from '../plugins/ListPlugin';
import { FontPlugin } from '../plugins/FontPlugin';
import { ColorPlugin } from '../plugins/ColorPlugin';
import { LinkPlugin } from '../plugins/LinkPlugin';
import { ImagePlugin } from '../plugins/ImagePlugin';
import { TablePlugin } from '../plugins/TablePlugin';
import { EmojiPlugin } from '../plugins/EmojiPlugin';
import { SpecialCharPlugin } from '../plugins/SpecialCharPlugin';
import { HistoryPlugin } from '../plugins/HistoryPlugin';
import { SourcePlugin } from '../plugins/SourcePlugin';
import { FullscreenPlugin } from '../plugins/FullscreenPlugin';
import { FindReplacePlugin } from '../plugins/FindReplacePlugin';
import { WordCountPlugin } from '../plugins/WordCountPlugin';
import { PrintPlugin } from '../plugins/PrintPlugin';
import { FloatingToolbarPlugin } from '../plugins/FloatingToolbarPlugin';
import { AutoLinkPlugin } from '../plugins/AutoLinkPlugin';
import { AutoSavePlugin } from '../plugins/AutoSavePlugin';
import { VideoEmbedPlugin } from '../plugins/VideoEmbedPlugin';
import { ShortcutHelpPlugin } from '../plugins/ShortcutHelpPlugin';
import { SlashCommandPlugin } from '../plugins/SlashCommandPlugin';
import { CodeHighlightPlugin } from '../plugins/CodeHighlightPlugin';
import { DragDropPlugin } from '../plugins/DragDropPlugin';

export function createEditor(options: EditorOptions): Editor {
  const editor = new Editor(options);

  // Core plugins
  const defaultPlugins = [
    HistoryPlugin,
    TextFormattingPlugin,
    ParagraphPlugin,
    AlignmentPlugin,
    ListPlugin,
    FontPlugin,
    ColorPlugin,
    LinkPlugin,
    ImagePlugin,
    TablePlugin,
    EmojiPlugin,
    SpecialCharPlugin,
    SourcePlugin,
    FullscreenPlugin,
    FindReplacePlugin,
    WordCountPlugin,
    PrintPlugin,
    FloatingToolbarPlugin,
    AutoLinkPlugin,
    AutoSavePlugin,
    VideoEmbedPlugin,
    ShortcutHelpPlugin,
    SlashCommandPlugin,
    CodeHighlightPlugin,
    DragDropPlugin,
  ];

  const userPlugins = options.plugins ?? [];
  const allPlugins = [...defaultPlugins, ...userPlugins];

  allPlugins.forEach(PluginClass => {
    const plugin = new (PluginClass as new (e: Editor) => { name: string; init(): void; destroy(): void; getToolbarItems(): unknown[] })(editor);
    (editor as unknown as { _plugins: Map<string, unknown> })['_plugins'].set(plugin.name, plugin);
    plugin.init();
  });

  // Build toolbar after plugins are registered (commands available)
  editor.setToolbar(new Toolbar(editor));

  return editor;
}
