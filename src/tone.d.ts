declare module 'tone' {
  export function start(): Promise<void>;
  
  export class Synth {
    connect(destination: any): this;
    triggerAttackRelease(note: string, duration: number, time?: number): this;
    toDestination(): this;
    set(options: any): this;
    dispose(): this;
  }
  
  export class PolySynth {
    constructor(synth: typeof Synth);
    connect(destination: any): this;
    triggerAttackRelease(note: string, duration: number, time?: number): this;
    toDestination(): this;
    set(options: any): this;
    dispose(): this;
  }
}
