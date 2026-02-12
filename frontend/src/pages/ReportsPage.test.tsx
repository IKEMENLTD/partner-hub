import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/test/test-utils';
import { ReportsPage } from './ReportsPage';

// Mock hooks
const mockUseReportConfigs = vi.fn();
const mockUseGeneratedReports = vi.fn();
const mockUseCreateReportConfig = vi.fn();
const mockUseUpdateReportConfig = vi.fn();
const mockUseDeleteReportConfig = vi.fn();
const mockUseGenerateReport = vi.fn();
const mockUseTriggerScheduledReports = vi.fn();

vi.mock('@/hooks', () => ({
  useReportConfigs: (...args: unknown[]) => mockUseReportConfigs(...args),
  useGeneratedReports: (...args: unknown[]) => mockUseGeneratedReports(...args),
  useCreateReportConfig: () => mockUseCreateReportConfig(),
  useUpdateReportConfig: () => mockUseUpdateReportConfig(),
  useDeleteReportConfig: () => mockUseDeleteReportConfig(),
  useGenerateReport: () => mockUseGenerateReport(),
  useTriggerScheduledReports: () => mockUseTriggerScheduledReports(),
  getPeriodLabel: (v: string) => v,
  getStatusLabel: (v: string) => v,
  getStatusColor: () => 'text-gray-500',
  getDayOfWeekLabel: (v: number) => `Day ${v}`,
}));

// Mock common
vi.mock('@/components/common', async () => {
  const actual = await vi.importActual('@/components/common');
  return {
    ...actual,
    useToast: () => ({ addToast: vi.fn() }),
  };
});

// Mock report components
vi.mock('@/components/reports', () => ({
  ReportConfigForm: () => <div data-testid="report-config-form">ReportConfigForm</div>,
  ReportViewer: () => <div data-testid="report-viewer">ReportViewer</div>,
}));

const defaultMutationReturn = { mutate: vi.fn(), isPending: false };

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCreateReportConfig.mockReturnValue(defaultMutationReturn);
    mockUseUpdateReportConfig.mockReturnValue(defaultMutationReturn);
    mockUseDeleteReportConfig.mockReturnValue(defaultMutationReturn);
    mockUseGenerateReport.mockReturnValue(defaultMutationReturn);
    mockUseTriggerScheduledReports.mockReturnValue(defaultMutationReturn);
  });

  it('should render reports heading', () => {
    mockUseReportConfigs.mockReturnValue({
      data: { data: [], totalPages: 1, total: 0 },
      isLoading: false,
    });
    mockUseGeneratedReports.mockReturnValue({
      data: { data: [], totalPages: 1, total: 0 },
      isLoading: false,
    });

    render(<ReportsPage />);
    expect(screen.getByRole('heading', { name: '自動レポート' })).toBeInTheDocument();
  });

  it('should render tab navigation', () => {
    mockUseReportConfigs.mockReturnValue({
      data: { data: [], totalPages: 1, total: 0 },
      isLoading: false,
    });
    mockUseGeneratedReports.mockReturnValue({
      data: { data: [], totalPages: 1, total: 0 },
      isLoading: false,
    });

    render(<ReportsPage />);
    // '生成されたレポート' appears both in the tab and as an h2 heading
    expect(screen.getAllByText('生成されたレポート').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('レポート設定')).toBeInTheDocument();
  });
});
