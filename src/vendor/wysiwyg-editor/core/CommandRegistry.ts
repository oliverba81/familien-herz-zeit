type CommandHandler = (args?: unknown) => void;

export class CommandRegistry {
  private _commands = new Map<string, CommandHandler>();

  register(name: string, handler: CommandHandler): void {
    this._commands.set(name, handler);
  }

  exec(name: string, args?: unknown): void {
    const handler = this._commands.get(name);
    if (!handler) throw new Error(`Unknown command: ${name}`);
    handler(args);
  }

  has(name: string): boolean {
    return this._commands.has(name);
  }

  unregister(name: string): void {
    this._commands.delete(name);
  }
}
