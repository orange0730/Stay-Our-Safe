import React from 'react';

export function LoadingOverlay() {
  return (
    <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 flex flex-col items-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-pulse"></div>
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-500 rounded-full animate-spin border-t-transparent"></div>
        </div>
        <p className="mt-4 text-gray-700 font-medium">載入中...</p>
        <p className="mt-1 text-sm text-gray-500">正在取得最新災害資訊</p>
      </div>
    </div>
  );
} 