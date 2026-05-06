import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { BottomSheet } from '../../src/shared/ui/BottomSheet';

describe('BottomSheet', () => {
  it('does not render content when closed', () => {
    render(
      <BottomSheet isOpen={false} onClose={() => {}} title="t">
        <div>hidden</div>
      </BottomSheet>,
    );
    expect(screen.queryByText('hidden')).toBeNull();
  });

  it('renders content when open', () => {
    render(
      <BottomSheet isOpen={true} onClose={() => {}} title="My Sheet">
        <div>visible</div>
      </BottomSheet>,
    );
    expect(screen.getByText('visible')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'My Sheet' })).toBeInTheDocument();
  });

  it('calls onClose when backdrop clicked', async () => {
    const onClose = vi.fn();
    render(
      <BottomSheet isOpen={true} onClose={onClose} title="t">
        <div>x</div>
      </BottomSheet>,
    );
    await userEvent.click(screen.getByTestId('bottomsheet-backdrop'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose on Escape key', async () => {
    const onClose = vi.fn();
    render(
      <BottomSheet isOpen={true} onClose={onClose} title="t">
        <div>x</div>
      </BottomSheet>,
    );
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('locks body scroll when open', () => {
    const { rerender } = render(
      <BottomSheet isOpen={false} onClose={() => {}} title="t">
        <div>x</div>
      </BottomSheet>,
    );
    expect(document.body.style.overflow).not.toBe('hidden');
    rerender(
      <BottomSheet isOpen={true} onClose={() => {}} title="t">
        <div>x</div>
      </BottomSheet>,
    );
    expect(document.body.style.overflow).toBe('hidden');
  });
});
