import client from './client';

// Users API (Admin only)
const usersApi = {
  // Get all users
  getAll: async () => {
    return client.get('/users');
  },

  // Get user by ID
  getById: async (userId) => {
    return client.get(`/users/${userId}`);
  },

  // Create user
  create: async (userData) => {
    return client.post('/users', userData);
  },

  // Update user
  update: async (userId, userData) => {
    return client.put(`/users/${userId}`, userData);
  },

  // Delete user
  delete: async (userId) => {
    return client.delete(`/users/${userId}`);
  },

  // Change user role
  changeRole: async (userId, role) => {
    return client.put(`/users/${userId}/role`, { role });
  },
};

export default usersApi;
