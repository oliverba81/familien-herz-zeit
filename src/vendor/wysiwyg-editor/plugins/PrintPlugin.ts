import { BasePlugin } from './BasePlugin';

export class PrintPlugin extends BasePlugin {
  readonly name = 'Print';

  init(): void {
    this.registerCommand('print', () => this._print());
  }

  private _print(): void {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8">
      <title>Print</title>
      <style>
        body{font-family:sans-serif;max-width:800px;margin:0 auto;padding:2rem;color:#111;}
        img{max-width:100%;height:auto;}
        table{border-collapse:collapse;width:100%;}
        td,th{border:1px solid #ccc;padding:.5rem;}
        pre{background:#f4f4f4;padding:1rem;overflow:auto;border-radius:4px;}
        blockquote{border-left:4px solid #ccc;margin:0;padding-left:1rem;color:#555;}
        a{color:#1d4ed8;}
        @media print{@page{margin:2cm;}}
      </style>
    </head><body>${this.editor.getHTML()}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
    setTimeout(() => win.close(), 1000);
  }

  destroy(): void {}
}
