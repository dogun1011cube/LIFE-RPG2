import { Component, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

/** Shows a readable message instead of a blank screen if WebGL or rendering fails. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="fatal">
          <h2>3D 화면을 표시할 수 없습니다</h2>
          <p>브라우저가 WebGL을 지원하는지, 하드웨어 가속이 켜져 있는지 확인하세요.</p>
          <code>{this.state.error.message}</code>
          <button className="btn" onClick={() => location.reload()}>
            새로고침
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
