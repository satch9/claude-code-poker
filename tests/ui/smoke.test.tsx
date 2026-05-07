import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('UI test setup', () => {
  it('renders a React element with jsdom + jest-dom matchers', () => {
    render(<button type="button">click</button>);
    expect(screen.getByRole('button', { name: 'click' })).toBeInTheDocument();
  });
});
