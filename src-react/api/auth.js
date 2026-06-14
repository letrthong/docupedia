import client, { setAuthToken } from './client';

// Auth API
const authApi = {
  // Login
  login: async (username, password) => {
    const response = await client.post('/auth/login', { username, password });
    if (response.success && response.data?.token) {
      setAuthToken(response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response;
  },

  // Logout
  logout: async () => {
    try {
      await client.post('/auth/logout');
    } catch (e) {
      // Ignore errors on logout
    }
    setAuthToken(null);
    localStorage.removeItem('user');
  },

  // Get current user
  getMe: async () => {
    return client.get('/auth/me');
  },

  // Change password
  changePassword: async (oldPassword, newPassword) => {
    return client.put('/auth/password', {
      old_password: oldPassword,
      new_password: newPassword,
    });
  },
};

export default authApi;
