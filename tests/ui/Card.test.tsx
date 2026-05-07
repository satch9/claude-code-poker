import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Card } from '../../src/shared/ui/Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>content</Card>);
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('applies default surface background', () => {
    const { container } = render(<Card>x</Card>);
    expect(container.firstChild).toHaveClass('bg-bg-surface');
  });

  it('supports elevated variant', () => {
    const { container } = render(<Card variant="elevated">x</Card>);
    expect(container.firstChild).toHaveClass('bg-bg-elevated');
  });

  it('forwards className', () => {
    const { container } = render(<Card className="custom">x</Card>);
    expect(container.firstChild).toHaveClass('custom');
  });
});
