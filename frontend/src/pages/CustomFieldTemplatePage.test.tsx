import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/test/test-utils';
import { CustomFieldTemplatePage } from './CustomFieldTemplatePage';

// Mock hooks
const mockUseCustomFieldTemplates = vi.fn();
const mockUseCreateCustomFieldTemplate = vi.fn();
const mockUseDeleteCustomFieldTemplate = vi.fn();
const mockUseActivateCustomFieldTemplate = vi.fn();
const mockUseDeactivateCustomFieldTemplate = vi.fn();

vi.mock('@/hooks/useCustomFieldTemplates', () => ({
  useCustomFieldTemplates: () => mockUseCustomFieldTemplates(),
  useCreateCustomFieldTemplate: () => mockUseCreateCustomFieldTemplate(),
  useDeleteCustomFieldTemplate: () => mockUseDeleteCustomFieldTemplate(),
  useActivateCustomFieldTemplate: () => mockUseActivateCustomFieldTemplate(),
  useDeactivateCustomFieldTemplate: () => mockUseDeactivateCustomFieldTemplate(),
}));

const defaultMutationReturn = { mutate: vi.fn(), isPending: false };

describe('CustomFieldTemplatePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCreateCustomFieldTemplate.mockReturnValue(defaultMutationReturn);
    mockUseDeleteCustomFieldTemplate.mockReturnValue(defaultMutationReturn);
    mockUseActivateCustomFieldTemplate.mockReturnValue(defaultMutationReturn);
    mockUseDeactivateCustomFieldTemplate.mockReturnValue(defaultMutationReturn);
  });

  it('should render loading state', () => {
    mockUseCustomFieldTemplates.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(<CustomFieldTemplatePage />);
    expect(screen.queryByRole('heading', { name: 'カスタムフィールドテンプレート' })).not.toBeInTheDocument();
  });

  it('should render error state', () => {
    mockUseCustomFieldTemplates.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed'),
    });

    render(<CustomFieldTemplatePage />);
    expect(screen.getByText('カスタムフィールドテンプレートの読み込みに失敗しました')).toBeInTheDocument();
  });

  it('should render heading when loaded', () => {
    mockUseCustomFieldTemplates.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    render(<CustomFieldTemplatePage />);
    expect(screen.getByRole('heading', { name: 'カスタムフィールドテンプレート' })).toBeInTheDocument();
  });

  it('should render empty state when no templates', () => {
    mockUseCustomFieldTemplates.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    render(<CustomFieldTemplatePage />);
    expect(screen.getByText('テンプレートがありません')).toBeInTheDocument();
  });
});
