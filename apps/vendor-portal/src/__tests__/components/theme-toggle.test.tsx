import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeToggle } from '@/components/ui/theme-toggle';

// Mock next-themes with a controllable setTheme
const mockSetTheme = vi.fn();
vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'dark',
    setTheme: mockSetTheme,
    resolvedTheme: 'dark',
  }),
}));

describe('ThemeToggle', () => {
  beforeEach(() => {
    mockSetTheme.mockClear();
  });

  it('should render three theme buttons', () => {
    render(<ThemeToggle />);
    
    expect(screen.getByTitle('Light mode')).toBeInTheDocument();
    expect(screen.getByTitle('Dark mode')).toBeInTheDocument();
    expect(screen.getByTitle('System theme')).toBeInTheDocument();
  });

  it('should have proper aria labels for accessibility', () => {
    render(<ThemeToggle />);
    
    expect(screen.getByLabelText('Switch to light mode')).toBeInTheDocument();
    expect(screen.getByLabelText('Switch to dark mode')).toBeInTheDocument();
    expect(screen.getByLabelText('Use system theme')).toBeInTheDocument();
  });

  it('should call setTheme with "light" when light button is clicked', () => {
    render(<ThemeToggle />);
    
    fireEvent.click(screen.getByTitle('Light mode'));
    expect(mockSetTheme).toHaveBeenCalledWith('light');
  });

  it('should call setTheme with "dark" when dark button is clicked', () => {
    render(<ThemeToggle />);
    
    fireEvent.click(screen.getByTitle('Dark mode'));
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  it('should call setTheme with "system" when system button is clicked', () => {
    render(<ThemeToggle />);
    
    fireEvent.click(screen.getByTitle('System theme'));
    expect(mockSetTheme).toHaveBeenCalledWith('system');
  });

  it('should have type="button" on all buttons to prevent form submission', () => {
    render(<ThemeToggle />);
    
    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button).toHaveAttribute('type', 'button');
    });
  });
});
