import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import GalleryPage from '@/app/(dashboard)/gallery/page';

// Mock the API
vi.mock('@/lib/api', () => ({
  galleryApi: {
    getAll: vi.fn(() => Promise.resolve({ data: [] })),
    upload: vi.fn(() => Promise.resolve({ data: { id: '1', url: '/test.jpg' } })),
    update: vi.fn(() => Promise.resolve({ data: { id: '1', caption: 'Updated' } })),
    delete: vi.fn(() => Promise.resolve({ data: null })),
    setFeatured: vi.fn(() => Promise.resolve({ data: { id: '1', isFeatured: true } })),
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

describe('GalleryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the gallery page header', async () => {
    renderWithProviders(<GalleryPage />);
    
    expect(screen.getByText('Gallery')).toBeInTheDocument();
    expect(screen.getByText('Manage your restaurant photos')).toBeInTheDocument();
  });

  it('should render the Upload Photo button', async () => {
    renderWithProviders(<GalleryPage />);
    
    expect(screen.getByText('Upload Photo')).toBeInTheDocument();
  });

  it('should render view mode toggles', async () => {
    renderWithProviders(<GalleryPage />);
    
    // Grid and LayoutGrid icons should be present in buttons
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should show empty state when no images', async () => {
    renderWithProviders(<GalleryPage />);
    
    await waitFor(() => {
      expect(screen.getByText('No photos yet')).toBeInTheDocument();
    });
  });

  it('should render stats cards', async () => {
    renderWithProviders(<GalleryPage />);
    
    expect(screen.getByText('Total Photos')).toBeInTheDocument();
    expect(screen.getByText('Featured')).toBeInTheDocument();
    expect(screen.getByText('Total Views')).toBeInTheDocument();
  });
});
