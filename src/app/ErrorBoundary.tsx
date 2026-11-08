/** Keeps one broken screen from blanking the whole Studio. */
import { AlertTriangle, ArrowLeft, RotateCcw } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode; resetKey: string }, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Kept local: FrameShot sends nothing anywhere.
    console.error('FrameShot screen error', error, info.componentStack);
  }

  override componentDidUpdate(prev: { resetKey: string }): void {
    // Navigating to another screen clears the error.
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  override render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const chunk = /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(error.message);
    return (
      <div role="alert" className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-danger-soft text-danger">
          <AlertTriangle size={26} />
        </span>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{chunk ? 'FrameShot was updated' : 'Something went wrong on this screen'}</h1>
          <p className="mt-1 max-w-md text-sm text-fg-subtle">
            {chunk ? 'Reload to finish loading the new version. Your library is safe.' : 'Your screenshots and recordings are safe. Go back to the library, or reload FrameShot.'}
          </p>
          {!chunk && <p className="mt-2 max-w-md truncate text-[12px] text-fg-subtle">{error.message}</p>}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="fr-press inline-flex h-9 items-center gap-2 rounded-[11px] border border-border bg-surface-solid px-3.5 text-sm font-medium"
            onClick={() => {
              this.setState({ error: null });
              location.hash = '#/';
            }}
          >
            <ArrowLeft size={15} /> Back to library
          </button>
          <button type="button" className="fr-btn-primary fr-press inline-flex h-9 items-center gap-2 rounded-[11px] px-3.5 text-sm font-medium" onClick={() => location.reload()}>
            <RotateCcw size={15} /> Reload
          </button>
        </div>
      </div>
    );
  }
}
