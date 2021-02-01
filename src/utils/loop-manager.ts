type UpdateCallback = (deltaTime: number, time: number) => void;

export class LoopManager {
  private _handle?: number;
  private _lastTime = 0;

  get enabled() { return this._enabled; }
  set enabled(value: boolean) {
    if (value) this.start();
    else this.stop();
  }

  constructor(updateCallback: UpdateCallback, start?: boolean);
  constructor(
    protected _cb: UpdateCallback,
    private _enabled = false,
  ) {
    this._tick = this._tick.bind(this);
    if (_enabled) this.start();
  }

  start() {
    this._enabled = true;
    if (this._handle != null) return;
    this._handle = requestAnimationFrame(this._tick);
  }

  stop() {
    this._enabled = false;
    if (this._handle == null) return;
    cancelAnimationFrame(this._handle);
    delete this._handle;
  }

  private _tick(time: number) {
    if (!this._enabled) return delete this._handle;
    this._handle = requestAnimationFrame(this._tick);
    const lastTime = this._lastTime;
    this._lastTime = time;
    this._cb.call(undefined, time - lastTime, time);
  }
}