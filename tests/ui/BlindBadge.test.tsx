import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BlindBadge } from '../../src/core/components/Game/BlindBadge';

describe('BlindBadge', () => {
  it('renders SB label when type=small', () => {
    render(<BlindBadge type="small" />);
    expect(screen.getByText('SB')).toBeInTheDocument();
  });

  it('renders BB label when type=big', () => {
    render(<BlindBadge type="big" />);
    expect(screen.getByText('BB')).toBeInTheDocument();
  });

  it('uses orange background for small blind', () => {
    const { container } = render(<BlindBadge type="small" />);
    expect(container.firstChild).toHaveClass('bg-orange-500');
  });

  it('uses red background for big blind', () => {
    const { container } = render(<BlindBadge type="big" />);
    expect(container.firstChild).toHaveClass('bg-red-600');
  });
});
