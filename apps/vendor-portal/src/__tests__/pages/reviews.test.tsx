import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ReviewsPage from '@/app/(dashboard)/reviews/page';

// Mock the API
vi.mock('@/lib/api', () => ({
  reviewsApi: {
    getAll: vi.fn(() => Promise.resolve({ data: [] })),
    getStats: vi.fn(() => Promise.resolve({ 
      data: { average: 4.5, total: 100, fiveStar: 50, fourStar: 30, threeStar: 15, twoStar: 4, oneStar: 1 } 
    })),
    respond: vi.fn(() => Promise.resolve({ data: { id: '1' } })),
    report: vi.fn(() => Promise.resolve({ data: null })),
  },
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('ReviewsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the reviews page header', async () => {
    renderWithProviders(<ReviewsPage />);
    
    expect(screen.getByText('Reviews')).toBeInTheDocument();
    expect(screen.getByText('Manage customer feedback & ratings')).toBeInTheDocument();
  });

  it('should render the Filter button', async () => {
    renderWithProviders(<ReviewsPage />);
    
    expect(screen.getByText('Filter')).toBeInTheDocument();
  });

  it('should render stats section', async () => {
    renderWithProviders(<ReviewsPage />);
    
    expect(screen.getByText('Review Insights')).toBeInTheDocument();
    expect(screen.getByText('Total Reviews')).toBeInTheDocument();
  });

  it('should render recent reviews section', async () => {
    renderWithProviders(<ReviewsPage />);
    
    expect(screen.getByText('Recent Reviews')).toBeInTheDocument();
  });

  it('should show empty state when no reviews', async () => {
    renderWithProviders(<ReviewsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('No reviews yet')).toBeInTheDocument();
    });
  });
});
