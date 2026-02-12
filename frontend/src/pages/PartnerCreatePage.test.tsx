import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/test/test-utils';
import { PartnerCreatePage } from './PartnerCreatePage';

// Mock hooks
const mockUsePartner = vi.fn();
const mockUseCreatePartner = vi.fn();
const mockUseUpdatePartner = vi.fn();

vi.mock('@/hooks', () => ({
  usePartner: (...args: unknown[]) => mockUsePartner(...args),
  useCreatePartner: () => mockUseCreatePartner(),
  useUpdatePartner: () => mockUseUpdatePartner(),
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

describe('PartnerCreatePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePartner.mockReturnValue({ data: undefined, isLoading: false });
    mockUseCreatePartner.mockReturnValue(defaultMutationReturn);
    mockUseUpdatePartner.mockReturnValue(defaultMutationReturn);
  });

  it('should render create mode heading', () => {
    render(<PartnerCreatePage />);
    expect(screen.getByRole('heading', { name: '新規パートナー登録' })).toBeInTheDocument();
  });

  it('should render form fields', () => {
    render(<PartnerCreatePage />);
    expect(screen.getByText('パートナー名')).toBeInTheDocument();
    expect(screen.getByText('メールアドレス')).toBeInTheDocument();
    expect(screen.getByText('基本情報')).toBeInTheDocument();
  });

  it('should render submit button with register label', () => {
    render(<PartnerCreatePage />);
    expect(screen.getByRole('button', { name: /登録/ })).toBeInTheDocument();
  });

  it('should render cancel button', () => {
    render(<PartnerCreatePage />);
    expect(screen.getByRole('button', { name: 'キャンセル' })).toBeInTheDocument();
  });
});
