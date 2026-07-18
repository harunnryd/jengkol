import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { vi, describe, it, expect } from 'vitest';
import LoginPage from './LoginPage';
import { login } from '@/api/http';

vi.mock('@/api/http', () => ({
  login: vi.fn().mockResolvedValue(undefined),
  register: vi.fn(),
}));

describe('LoginPage', () => {
  it('submits credentials and redirects to the dashboard on success', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<div>Dashboard Home</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@test.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(screen.getByText('Dashboard Home')).toBeInTheDocument());
    expect(login).toHaveBeenCalledWith('a@test.com', 'password123');
  });
});
