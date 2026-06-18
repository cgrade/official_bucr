import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MenuPage from '@/app/(dashboard)/menu/page';

// Mock the API
vi.mock('@/lib/api', () => ({
  menuApi: {
    getItems: vi.fn(() => Promise.resolve({ data: [] })),
    createItem: vi.fn(() => Promise.resolve({ data: { id: '1', name: 'Test Item' } })),
    updateItem: vi.fn(() => Promise.resolve({ data: { id: '1', name: 'Updated Item' } })),
    deleteItem: vi.fn(() => Promise.resolve({ data: null })),
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

describe('MenuPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the menu page header', async () => {
    renderWithProviders(<MenuPage />);
    
    expect(screen.getByText('Menu Management')).toBeInTheDocument();
    expect(screen.getByText('Manage your restaurant menu items')).toBeInTheDocument();
  });

  it('should render the Add Item button', async () => {
    renderWithProviders(<MenuPage />);
    
    expect(screen.getByText('Add Item')).toBeInTheDocument();
  });

  it('should render category tabs', async () => {
    renderWithProviders(<MenuPage />);
    
    expect(screen.getByText('All Items')).toBeInTheDocument();
  });

  it('should render search input', async () => {
    renderWithProviders(<MenuPage />);
    
    expect(screen.getByPlaceholderText('Search menu...')).toBeInTheDocument();
  });

  it('should show empty state when no items', async () => {
    renderWithProviders(<MenuPage />);
    
    await waitFor(() => {
      expect(screen.getByText('No menu items found')).toBeInTheDocument();
    });
  });

  it('should open create modal when Add Item is clicked', async () => {
    renderWithProviders(<MenuPage />);
    
    const addButton = screen.getByText('Add Item');
    fireEvent.click(addButton);
    
    await waitFor(() => {
      expect(screen.getByText('Add Menu Item')).toBeInTheDocument();
    });
  });

  it('should filter items by search', async () => {
    renderWithProviders(<MenuPage />);
    
    const searchInput = screen.getByPlaceholderText('Search menu...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    expect(searchInput).toHaveValue('test');
  });
});
