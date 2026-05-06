import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Input } from '../../src/shared/ui/Input';

describe('Input', () => {
  it('renders with label', () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('shows error message and aria-invalid', () => {
    render(<Input label="Email" error="Required" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('has min tap height', () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText('Email').className).toMatch(/min-h-tap/);
  });

  it('forwards onChange', async () => {
    const onChange = vi.fn();
    render(<Input label="Email" onChange={onChange} />);
    await userEvent.type(screen.getByLabelText('Email'), 'a');
    expect(onChange).toHaveBeenCalled();
  });
});
