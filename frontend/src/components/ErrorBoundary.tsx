import React, { Component, ErrorInfo, ReactNode } from 'react';
import toast from 'react-hot-toast';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // 更新 state，下次渲染將顯示 fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // 只在開發環境顯示詳細錯誤
    if (import.meta.env.DEV) {
      toast.error(`應用錯誤: ${error.message}`);
    } else {
      // 生產環境只顯示通用錯誤
      toast.error('應用遇到錯誤，正在嘗試恢復...');
    }
  }

  render() {
    if (this.state.hasError) {
      // 可以渲染自定義的錯誤 UI
      return this.props.fallback || (
        <div className="flex items-center justify-center h-screen bg-gray-100">
          <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">出現錯誤</h2>
            <p className="text-gray-600 mb-6">
              應用遇到了一個錯誤。請重新整理頁面以繼續使用。
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              重新整理頁面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
} 