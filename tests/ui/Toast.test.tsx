import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ToastProvider, useToast } from '../../src/shared/ui/Toast';

const Trigger: React.FC<{ kind: 'success' | 'error' | 'info'; msg: string }> = ({ kind, msg }) => {
  const toast = useToast();
  return (
    <button type="button" onClick={() => toast[kind](msg)}>
      fire
    </button>
  );
};

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('Toast', () => {
  it('throws when used outside ToastProvider', () => {
    const Boom = () => {
      useToast();
      return null;
    };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Boom />)).toThrow();
    spy.mockRestore();
  });

  it('shows success toast when toast.success is called', () => {
    render(
      <ToastProvider>
        <Trigger kind="success" msg="ok done" />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'fire' }));
    expect(screen.getByText('ok done')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows error toast with role=alert', () => {
    render(
      <ToastProvider>
        <Trigger kind="error" msg="boom" />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'fire' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('boom')).toBeInTheDocument();
  });

  it('auto-dismisses after the default duration', () => {
    render(
      <ToastProvider>
        <Trigger kind="info" msg="bye" />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'fire' }));
    expect(screen.getByText('bye')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.queryByText('bye')).toBeNull();
  });

  it('can be dismissed manually via close button', () => {
    render(
      <ToastProvider>
        <Trigger kind="info" msg="dismiss me" />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'fire' }));
    expect(screen.getByText('dismiss me')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /fermer/i }));
    expect(screen.queryByText('dismiss me')).toBeNull();
  });

  it('queues multiple toasts simultaneously', () => {
    const Multi = () => {
      const toast = useToast();
      return (
        <button
          type="button"
          onClick={() => {
            toast.info('first');
            toast.info('second');
          }}
        >
          two
        </button>
      );
    };
    render(
      <ToastProvider>
        <Multi />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'two' }));
    expect(screen.getByText('first')).toBeInTheDocument();
    expect(screen.getByText('second')).toBeInTheDocument();
  });
});
