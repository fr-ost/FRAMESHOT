/**
 * Mixes the shared tab/system sound and the microphone into the single audio
 * track MediaRecorder can record. Nothing is routed to the speakers, so there
 * is no echo; the tab keeps playing normally for the user.
 */
export class AudioMixer {
  private readonly destination: MediaStreamAudioDestinationNode;
  private micGain: GainNode | null = null;
  private readonly sources: MediaStreamAudioSourceNode[] = [];

  constructor(private readonly ctx: AudioContext) {
    this.destination = ctx.createMediaStreamDestination();
  }

  get running(): boolean {
    return this.ctx.state === 'running';
  }

  add(track: MediaStreamTrack, kind: 'system' | 'mic'): void {
    const source = this.ctx.createMediaStreamSource(new MediaStream([track]));
    const gain = this.ctx.createGain();
    source.connect(gain);
    gain.connect(this.destination);
    this.sources.push(source);
    if (kind === 'mic') this.micGain = gain;
  }

  get track(): MediaStreamTrack {
    return this.destination.stream.getAudioTracks()[0];
  }

  setMicMuted(muted: boolean): void {
    if (!this.micGain) return;
    // A short ramp avoids a click.
    this.micGain.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.015);
  }

  async close(): Promise<void> {
    for (const s of this.sources) s.disconnect();
    this.track?.stop();
    await this.ctx.close().catch(() => {});
  }
}
