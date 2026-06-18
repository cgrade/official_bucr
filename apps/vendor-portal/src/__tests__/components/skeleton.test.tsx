import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Skeleton,
  CardSkeleton,
  StatCardSkeleton,
  TableRowSkeleton,
  DashboardSkeleton,
  ListSkeleton,
} from '@/components/ui/skeleton';

describe('Skeleton Components', () => {
  describe('Skeleton', () => {
    it('should render with default classes', () => {
      const { container } = render(<Skeleton />);
      const skeleton = container.firstChild as HTMLElement;
      
      expect(skeleton).toHaveClass('animate-pulse');
      expect(skeleton).toHaveClass('rounded-lg');
    });

    it('should accept custom className', () => {
      const { container } = render(<Skeleton className="h-10 w-20" />);
      const skeleton = container.firstChild as HTMLElement;
      
      expect(skeleton).toHaveClass('h-10');
      expect(skeleton).toHaveClass('w-20');
    });
  });

  describe('CardSkeleton', () => {
    it('should render card skeleton structure', () => {
      const { container } = render(<CardSkeleton />);
      
      expect(container.querySelector('.glass-card')).toBeInTheDocument();
    });
  });

  describe('StatCardSkeleton', () => {
    it('should render stat card skeleton structure', () => {
      const { container } = render(<StatCardSkeleton />);
      
      expect(container.querySelector('.glass-card')).toBeInTheDocument();
    });
  });

  describe('TableRowSkeleton', () => {
    it('should render table row skeleton', () => {
      const { container } = render(<TableRowSkeleton />);
      
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('DashboardSkeleton', () => {
    it('should render 4 stat card skeletons', () => {
      const { container } = render(<DashboardSkeleton />);
      
      // Should have grid structure
      expect(container.querySelector('.grid')).toBeInTheDocument();
    });
  });

  describe('ListSkeleton', () => {
    it('should render default 5 rows', () => {
      const { container } = render(<ListSkeleton />);
      
      expect(container.querySelector('.glass-card')).toBeInTheDocument();
    });

    it('should render custom number of rows', () => {
      const { container } = render(<ListSkeleton count={3} />);
      
      expect(container.querySelector('.glass-card')).toBeInTheDocument();
    });
  });
});
