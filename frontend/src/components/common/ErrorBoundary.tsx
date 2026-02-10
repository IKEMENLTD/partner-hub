import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-slate-900">
          <div className="text-center max-w-md p-8 bg-white dark:bg-slate-800 rounded-lg shadow-lg">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
              予期しないエラーが発生しました
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              画面の表示中に問題が発生しました。再読み込みをお試しください。
            </p>
            {this.state.error && import.meta.env.DEV && (
              <details className="text-left bg-gray-100 dark:bg-slate-700 p-3 rounded text-xs font-mono text-gray-600 dark:text-gray-400 mb-4">
                <summary className="cursor-pointer text-sm">エラー詳細</summary>
                <pre className="mt-2 whitespace-pre-wrap break-words">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                再試行
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
              >
                トップに戻る
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
