import { useQuery } from 'react-query';
import { useAppStore } from './useAppStore';
import { hazardApi, reportApi, riskApi } from '../services/api';
import { useEffect } from 'react';
import { mockHazardData } from '../mockData/hazardData';

export function useDataFetch() {
  const setHazards = useAppStore((state) => state.setHazards);
  const setUserReports = useAppStore((state) => state.setUserReports);
  const setRiskAssessment = useAppStore((state) => state.setRiskAssessment);
  const setIsLoading = useAppStore((state) => state.setIsLoading);

  // 擷取災害資料
  const hazardsQuery = useQuery(
    'hazards',
    hazardApi.getAll,
    {
      refetchInterval: 5 * 60 * 1000, // 每 5 分鐘自動更新
      onSuccess: (data) => {
        setHazards(data);
      },
      onError: (error) => {
        console.error('Failed to fetch hazards, using mock data:', error);
        // 如果 API 失敗，使用模擬資料
        setHazards(mockHazardData);
      },
      retry: 1, // 只重試一次
    }
  );

  // 初始化時如果沒有資料，使用模擬資料
  useEffect(() => {
    const currentHazards = useAppStore.getState().hazards;
    if (currentHazards.length === 0 && !hazardsQuery.isLoading) {
      setHazards(mockHazardData);
    }
  }, [hazardsQuery.isLoading, setHazards]);

  // 擷取使用者上報
  const reportsQuery = useQuery(
    'reports',
    () => reportApi.getAll(),
    {
      refetchInterval: 2 * 60 * 1000, // 每 2 分鐘自動更新
      onSuccess: (data) => {
        setUserReports(data);
      },
      retry: 1,
    }
  );

  // 擷取風險評估
  const riskQuery = useQuery(
    'risk-assessment',
    () => riskApi.generateAssessment(),
    {
      refetchInterval: 10 * 60 * 1000, // 每 10 分鐘自動更新
      onSuccess: (data) => {
        setRiskAssessment(data);
      },
      retry: 1,
    }
  );

  // 更新載入狀態
  useEffect(() => {
    const isLoading = hazardsQuery.isLoading || reportsQuery.isLoading || riskQuery.isLoading;
    setIsLoading(isLoading);
  }, [hazardsQuery.isLoading, reportsQuery.isLoading, riskQuery.isLoading, setIsLoading]);

  // 手動重新整理所有資料
  const refetch = async () => {
    await Promise.all([
      hazardsQuery.refetch(),
      reportsQuery.refetch(),
      riskQuery.refetch(),
    ]);
  };

  return {
    isLoading: hazardsQuery.isLoading || reportsQuery.isLoading || riskQuery.isLoading,
    isError: hazardsQuery.isError || reportsQuery.isError || riskQuery.isError,
    isRefetching: hazardsQuery.isRefetching || reportsQuery.isRefetching || riskQuery.isRefetching,
    refetch,
  };
} 