import React, { useState } from 'react';
import { Coordinates, HazardType } from '../types';
import { reportApi } from '../services/api';
import { FiX, FiAlertTriangle } from 'react-icons/fi';
import toast from 'react-hot-toast';

interface ReportModalProps {
  location: Coordinates;
  onClose: () => void;
  onSubmit: () => void;
}

export function ReportModal({ location, onClose, onSubmit }: ReportModalProps) {
  const [selectedType, setSelectedType] = useState<HazardType>(HazardType.OTHER);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hazardTypeOptions = [
    { value: HazardType.FLOOD, label: '積水', icon: '💧' },
    { value: HazardType.ROADBLOCK, label: '道路封閉', icon: '🚧' },
    { value: HazardType.COLLAPSE, label: '建築倒塌', icon: '🏚️' },
    { value: HazardType.FIRE, label: '火災', icon: '🔥' },
    { value: HazardType.LANDSLIDE, label: '土石流', icon: '⛰️' },
    { value: HazardType.OTHER, label: '其他', icon: '⚠️' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      toast.error('請輸入災害描述');
      return;
    }

    setIsSubmitting(true);

    try {
      await reportApi.submit({
        type: selectedType,
        location,
        description: description.trim(),
        reporterId: `user_${Date.now()}`, // 暫時使用時間戳作為使用者 ID
      });

      toast.success('上報成功！感謝您的貢獻');
      onSubmit();
    } catch (error) {
      toast.error('上報失敗，請稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* 標題列 */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <FiAlertTriangle className="mr-2 text-red-500" />
            回報災害
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 位置資訊 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              災害位置
            </label>
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
              <p>緯度：{location.lat.toFixed(6)}</p>
              <p>經度：{location.lng.toFixed(6)}</p>
            </div>
          </div>

          {/* 災害類型選擇 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              災害類型
            </label>
            <div className="grid grid-cols-3 gap-3">
              {hazardTypeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedType(option.value)}
                  className={`
                    flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all
                    ${selectedType === option.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }
                  `}
                >
                  <span className="text-2xl mb-1">{option.icon}</span>
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 描述輸入 */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              災害描述
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              placeholder="請詳細描述災害情況，例如：積水深度、影響範圍等..."
              required
            />
          </div>

          {/* 提交按鈕 */}
          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-blue-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '提交中...' : '提交上報'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 