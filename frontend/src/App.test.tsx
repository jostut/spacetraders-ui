import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App shell (scaffold)', () => {
  it('mounts and renders the app heading', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { name: 'SpaceTraders' }),
    ).toBeInTheDocument();
  });
});
