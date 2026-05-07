import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUseQuery = vi.fn();
vi.mock('convex/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

import { JoinByCodeForm } from '../../src/core/components/Lobby/JoinByCodeForm';

beforeEach(() => {
  vi.restoreAllMocks();
  mockUseQuery.mockReturnValue(undefined);
});

describe('JoinByCodeForm', () => {
  it('renders the input and submit button', () => {
    render(<JoinByCodeForm onJoinTable={() => {}} />);
    expect(screen.getByLabelText(/code/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /rejoindre/i })).toBeInTheDocument();
  });

  it('disables submit until 6 alphanum characters are entered', async () => {
    render(<JoinByCodeForm onJoinTable={() => {}} />);
    const button = screen.getByRole('button', { name: /rejoindre/i });
    expect(button).toBeDisabled();
    const input = screen.getByLabelText(/code/i);
    await userEvent.type(input, 'abc12');
    expect(button).toBeDisabled();
    await userEvent.type(input, '3');
    expect(button).not.toBeDisabled();
  });

  it('uppercases and strips non-alphanum characters from input', async () => {
    render(<JoinByCodeForm onJoinTable={() => {}} />);
    const input = screen.getByLabelText(/code/i) as HTMLInputElement;
    await userEvent.type(input, 'ab-12-cd');
    expect(input.value).toBe('AB12CD');
  });

  it('shows "code invalide" when query returns null', async () => {
    mockUseQuery.mockReturnValue(null);
    render(<JoinByCodeForm onJoinTable={() => {}} />);
    const input = screen.getByLabelText(/code/i);
    await userEvent.type(input, 'ABC123');
    await userEvent.click(screen.getByRole('button', { name: /rejoindre/i }));
    await waitFor(() => {
      expect(screen.getByText(/invalide|introuvable/i)).toBeInTheDocument();
    });
  });
});
