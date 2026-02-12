import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/test/test-utils';
import { EscalationRulesPage } from './EscalationRulesPage';

// Mock hooks
const mockUseEscalationRules = vi.fn();
const mockUseCreateEscalationRule = vi.fn();
const mockUseUpdateEscalationRule = vi.fn();
const mockUseDeleteEscalationRule = vi.fn();
const mockUseEscalationLogs = vi.fn();

vi.mock('@/hooks/useEscalations', () => ({
  useEscalationRules: () => mockUseEscalationRules(),
  useCreateEscalationRule: () => mockUseCreateEscalationRule(),
  useUpdateEscalationRule: () => mockUseUpdateEscalationRule(),
  useDeleteEscalationRule: () => mockUseDeleteEscalationRule(),
  useEscalationLogs: (...args: unknown[]) => mockUseEscalationLogs(...args),
}));

const defaultMutationReturn = { mutate: vi.fn(), isPending: false };

describe('EscalationRulesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCreateEscalationRule.mockReturnValue(defaultMutationReturn);
    mockUseUpdateEscalationRule.mockReturnValue(defaultMutationReturn);
    mockUseDeleteEscalationRule.mockReturnValue(defaultMutationReturn);
    mockUseEscalationLogs.mockReturnValue({ data: [], isLoading: false });
  });

  it('should render loading state', () => {
    mockUseEscalationRules.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(<EscalationRulesPage />);
    expect(screen.queryByRole('heading', { name: 'エスカレーション設定' })).not.toBeInTheDocument();
  });

  it('should render escalation heading', () => {
    mockUseEscalationRules.mockReturnValue({
      data: [],
      isLoading: false,
    });

    render(<EscalationRulesPage />);
    expect(screen.getByRole('heading', { name: 'エスカレーション設定' })).toBeInTheDocument();
  });

  it('should render empty state when no rules', () => {
    mockUseEscalationRules.mockReturnValue({
      data: [],
      isLoading: false,
    });

    render(<EscalationRulesPage />);
    expect(screen.getByText('ルールが設定されていません')).toBeInTheDocument();
  });
});
