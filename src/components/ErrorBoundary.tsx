import {Component, type ErrorInfo, type ReactNode} from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    errorMessage: '',
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อระบบ',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Application ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="jp-pattern min-h-screen flex items-center justify-center p-4 text-[#4A3531]">
          <div className="kawaii-card max-w-md w-full p-6 text-center bg-white space-y-4">
            <div className="text-4xl" aria-hidden="true">😿</div>
            <h2 className="font-cute font-bold text-xl text-[#D9385A]">
              อุ๊ย! เกิดข้อผิดพลาดในการเชื่อมต่อ
            </h2>
            <p className="text-xs text-[#7D5A50] break-words bg-[#FFF8FA] border-2 border-[#FFD6E0] rounded-2xl p-3">
              {this.state.errorMessage}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="kawaii-btn bg-[#FF758F] hover:bg-[#FF5C7C] text-white font-cute font-bold py-2.5 px-6 rounded-2xl cursor-pointer"
            >
              โหลดหน้าเว็บใหม่
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
