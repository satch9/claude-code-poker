import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Button } from '../../src/shared/ui/Button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Hello</Button>);
    expect(screen.getByRole('button', { name: 'Hello' })).toBeInTheDocument();
  });

  it('respects min tap target on size md (44px)', () => {
    render(<Button size="md">Tap</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toMatch(/min-h-tap/);
  });

  it('applies primary variant by default', () => {
    render(<Button>Default</Button>);
    expect(screen.getByRole('button').className).toMatch(/bg-accent/);
  });

  it('applies danger variant', () => {
    render(<Button variant="danger">Fold</Button>);
    expect(screen.getByRole('button').className).toMatch(/bg-sem-danger/);
  });

  it('disables when loading and shows spinner', () => {
    render(<Button loading>Submit</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn.querySelector('svg')).toBeTruthy();
  });

  it('triggers onClick', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Tap</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
