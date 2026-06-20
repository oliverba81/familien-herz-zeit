type EventMap = Record<string, unknown[]>;

export class EventEmitter<Events extends EventMap> {
  private _listeners = new Map<string, Set<(...args: unknown[]) => void>>();

  on<K extends keyof Events>(
    event: K,
    handler: (...args: Events[K]) => void
  ): () => void {
    const key = event as string;
    if (!this._listeners.has(key)) this._listeners.set(key, new Set());
    this._listeners.get(key)!.add(handler as (...args: unknown[]) => void);
    return () => this.off(event, handler);
  }

  off<K extends keyof Events>(
    event: K,
    handler: (...args: Events[K]) => void
  ): void {
    this._listeners.get(event as string)?.delete(handler as (...args: unknown[]) => void);
  }

  emit<K extends keyof Events>(event: K, ...args: Events[K]): void {
    this._listeners.get(event as string)?.forEach(h => h(...args));
  }

  removeAllListeners(): void {
    this._listeners.clear();
  }
}
