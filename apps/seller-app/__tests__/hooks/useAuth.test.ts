import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';

// Mock fetch
global.fetch = jest.fn();

describe('useAuth Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('should initialize with no user', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('should login successfully', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      storeName: 'Test Store',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: mockUser, token: 'test-token' }),
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('test@example.com', 'password123');
    });

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(localStorage.getItem('token')).toBe('test-token');
    });
  });

  it('should handle login failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Invalid credentials' }),
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      try {
        await result.current.login('test@example.com', 'wrongpassword');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should logout successfully', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      storeName: 'Test Store',
    };

    // Setup logged in state
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('user', JSON.stringify(mockUser));

    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('should register new user successfully', async () => {
    const mockUser = {
      id: 1,
      email: 'newuser@example.com',
      storeName: 'New Store',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: mockUser, token: 'new-token' }),
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.register('newuser@example.com', 'password123', 'New Store');
    });

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  it('should handle registration failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Email already exists' }),
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      try {
        await result.current.register('existing@example.com', 'password123', 'Store');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    expect(result.current.user).toBeNull();
  });

  it('should restore session from localStorage', () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      storeName: 'Test Store',
    };

    localStorage.setItem('token', 'test-token');
    localStorage.setItem('user', JSON.stringify(mockUser));

    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should update user profile', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      storeName: 'Test Store',
    };

    const updatedUser = {
      ...mockUser,
      storeName: 'Updated Store',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: updatedUser }),
    });

    const { result } = renderHook(() => useAuth());

    // Set initial user
    act(() => {
      result.current.setUser(mockUser);
    });

    await act(async () => {
      await result.current.updateProfile({ storeName: 'Updated Store' });
    });

    await waitFor(() => {
      expect(result.current.user?.storeName).toBe('Updated Store');
    });
  });

  it('should check if token is expired', () => {
    const { result } = renderHook(() => useAuth());

    // Mock expired token
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MTYyMzkwMjJ9.test';
    localStorage.setItem('token', expiredToken);

    const isExpired = result.current.isTokenExpired();
    expect(isExpired).toBe(true);
  });
});
