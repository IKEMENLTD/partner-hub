import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/test/test-utils';
import { ProjectCreatePage } from './ProjectCreatePage';

// Mock hooks
const mockUseCreateProject = vi.fn();
const mockUseUpdateProject = vi.fn();
const mockUseProject = vi.fn();
const mockUsePartners = vi.fn();
const mockUseProjectStakeholders = vi.fn();
const mockUseIncrementTemplateUsage = vi.fn();
const mockUseProjectTemplates = vi.fn();

vi.mock('@/hooks', () => ({
  useCreateProject: () => mockUseCreateProject(),
  useUpdateProject: () => mockUseUpdateProject(),
  useProject: (...args: unknown[]) => mockUseProject(...args),
  usePartners: (...args: unknown[]) => mockUsePartners(...args),
  useProjectStakeholders: (...args: unknown[]) => mockUseProjectStakeholders(...args),
  useIncrementTemplateUsage: () => mockUseIncrementTemplateUsage(),
  useProjectTemplates: () => mockUseProjectTemplates(),
}));

// Mock custom-fields components
vi.mock('@/components/custom-fields', () => ({
  CustomFieldBuilder: () => <div data-testid="custom-field-builder">CustomFieldBuilder</div>,
  CustomFieldRenderer: () => <div data-testid="custom-field-renderer">CustomFieldRenderer</div>,
  CustomFieldTemplateSelect: () => <div data-testid="custom-field-template-select">CustomFieldTemplateSelect</div>,
  SaveTemplateModal: () => null,
  validateCustomFields: () => ({}),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({}), // No id = create mode
  };
});

const defaultMutationReturn = { mutate: vi.fn(), isPending: false, error: null };

describe('ProjectCreatePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCreateProject.mockReturnValue(defaultMutationReturn);
    mockUseUpdateProject.mockReturnValue(defaultMutationReturn);
    mockUseProject.mockReturnValue({ data: undefined, isLoading: false });
    mockUsePartners.mockReturnValue({ data: { data: [] } });
    mockUseProjectStakeholders.mockReturnValue({ data: [] });
    mockUseIncrementTemplateUsage.mockReturnValue({ mutate: vi.fn() });
    mockUseProjectTemplates.mockReturnValue({ data: [], isLoading: false });
  });

  it('should render create mode heading', () => {
    render(<ProjectCreatePage />);
    expect(screen.getByRole('heading', { name: '新規案件作成' })).toBeInTheDocument();
  });

  it('should render form fields', () => {
    render(<ProjectCreatePage />);
    expect(screen.getByText('案件名')).toBeInTheDocument();
    expect(screen.getByText('説明')).toBeInTheDocument();
    expect(screen.getByText('基本情報')).toBeInTheDocument();
  });

  it('should render submit button with create label', () => {
    render(<ProjectCreatePage />);
    expect(screen.getByRole('button', { name: /作成/ })).toBeInTheDocument();
  });

  it('should render cancel button', () => {
    render(<ProjectCreatePage />);
    expect(screen.getByRole('button', { name: 'キャンセル' })).toBeInTheDocument();
  });
});
