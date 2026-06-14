import client from './client';

// Projects API
const projectsApi = {
  // Get all accessible projects
  getAll: async () => {
    return client.get('/projects');
  },

  // Get project by ID
  getById: async (projectId) => {
    return client.get(`/projects/${projectId}`);
  },

  // Create project (Admin only)
  create: async (projectData) => {
    return client.post('/projects', projectData);
  },

  // Update project
  update: async (projectId, projectData) => {
    return client.put(`/projects/${projectId}`, projectData);
  },

  // Delete project (Admin only)
  delete: async (projectId) => {
    return client.delete(`/projects/${projectId}`);
  },

  // ===== Permissions =====
  
  // Get project permissions
  getPermissions: async (projectId) => {
    return client.get(`/projects/${projectId}/permissions`);
  },

  // Add permission
  addPermission: async (projectId, userId, permissions) => {
    return client.post(`/projects/${projectId}/permissions`, {
      user_id: userId,
      permissions,
    });
  },

  // Update permission
  updatePermission: async (projectId, userId, permissions) => {
    return client.put(`/projects/${projectId}/permissions/${userId}`, {
      permissions,
    });
  },

  // Remove permission
  removePermission: async (projectId, userId) => {
    return client.delete(`/projects/${projectId}/permissions/${userId}`);
  },

  // ===== Tree =====
  
  // Get tree structure
  getTree: async (projectId) => {
    return client.get(`/projects/${projectId}/tree`);
  },

  // Update tree structure
  updateTree: async (projectId, tree) => {
    return client.put(`/projects/${projectId}/tree`, tree);
  },
};

export default projectsApi;
