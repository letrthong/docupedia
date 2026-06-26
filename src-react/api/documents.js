import client from './client';

// Documents API
const documentsApi = {
  // Get all documents in project
  getAll: async (projectId) => {
    return client.get(`/projects/${projectId}/documents`);
  },

  // Get document by ID
  getById: async (projectId, docId) => {
    return client.get(`/projects/${projectId}/documents/${docId}`);
  },

  // Create document
  create: async (projectId, documentData) => {
    return client.post(`/projects/${projectId}/documents`, documentData);
  },

  // Update document
  update: async (projectId, docId, documentData) => {
    return client.put(`/projects/${projectId}/documents/${docId}`, documentData);
  },

  // Delete document
  delete: async (projectId, docId) => {
    return client.delete(`/projects/${projectId}/documents/${docId}`);
  },

  // Move document
  move: async (projectId, docId, newParentId) => {
    return client.patch(`/projects/${projectId}/documents/${docId}/move`, {
      parent_id: newParentId,
    });
  },

  // Export document
  export: async (projectId, docId, format = 'html') => {
    return client.get(`/projects/${projectId}/documents/${docId}/export`, {
      params: { format },
    });
  },

  // Get comments
  getComments: async (projectId, docId) => {
    return client.get(`/projects/${projectId}/documents/${docId}/comments`);
  },

  // Add comment
  addComment: async (projectId, docId, content, parentId = null) => {
    return client.post(`/projects/${projectId}/documents/${docId}/comments`, { content, parent_id: parentId });
  },

  // Update comment
  updateComment: async (projectId, docId, commentId, content) => {
    return client.put(`/projects/${projectId}/documents/${docId}/comments/${commentId}`, { content });
  },

  // Delete comment
  deleteComment: async (projectId, docId, commentId) => {
    return client.delete(`/projects/${projectId}/documents/${docId}/comments/${commentId}`);
  },

  // Get edit history
  getHistory: async (projectId, docId) => {
    return client.get(`/projects/${projectId}/documents/${docId}/history`);
  },
};

export default documentsApi;

// Folders API
export const foldersApi = {
  // Get all folders in project
  getAll: async (projectId) => {
    return client.get(`/projects/${projectId}/folders`);
  },

  // Get folder by ID
  getById: async (projectId, folderId) => {
    return client.get(`/projects/${projectId}/folders/${folderId}`);
  },

  // Create folder
  create: async (projectId, folderData) => {
    return client.post(`/projects/${projectId}/folders`, folderData);
  },

  // Update folder
  update: async (projectId, folderId, folderData) => {
    return client.put(`/projects/${projectId}/folders/${folderId}`, folderData);
  },

  // Delete folder
  delete: async (projectId, folderId) => {
    return client.delete(`/projects/${projectId}/folders/${folderId}`);
  },
};
