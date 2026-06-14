import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { projectsApi, documentsApi, foldersApi } from '../api';

const ProjectContext = createContext(null);

// localStorage key for persisting selected project
const SELECTED_PROJECT_KEY = 'docupedia_selected_project';

export function ProjectProvider({ children }) {
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [tree, setTree] = useState(null);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const initializedRef = useRef(false);

  // Fetch all projects and restore saved selection
  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await projectsApi.getAll();
      if (response.success) {
        const projectList = response.data || [];
        setProjects(projectList);
        
        // Restore saved project on first load only
        if (!initializedRef.current && projectList.length > 0) {
          initializedRef.current = true;
          const savedProjectId = localStorage.getItem(SELECTED_PROJECT_KEY);
          if (savedProjectId) {
            const projectExists = projectList.some(p => p.id === parseInt(savedProjectId));
            if (projectExists) {
              // Load the saved project
              const [projectRes, treeRes] = await Promise.all([
                projectsApi.getById(parseInt(savedProjectId)),
                projectsApi.getTree(parseInt(savedProjectId)),
              ]);
              if (projectRes.success) {
                setCurrentProject(projectRes.data);
              }
              if (treeRes.success) {
                setTree(treeRes.data);
              }
            } else {
              // Saved project no longer exists
              localStorage.removeItem(SELECTED_PROJECT_KEY);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
    setIsLoading(false);
  }, []);

  // Select project and load tree
  const selectProject = useCallback(async (projectId) => {
    if (!projectId) {
      setCurrentProject(null);
      setTree(null);
      localStorage.removeItem(SELECTED_PROJECT_KEY);
      return;
    }

    // Save to localStorage
    localStorage.setItem(SELECTED_PROJECT_KEY, projectId.toString());

    setIsLoading(true);
    try {
      const [projectRes, treeRes] = await Promise.all([
        projectsApi.getById(projectId),
        projectsApi.getTree(projectId),
      ]);
      
      if (projectRes.success) {
        setCurrentProject(projectRes.data);
      }
      if (treeRes.success) {
        setTree(treeRes.data);
      }
    } catch (error) {
      console.error('Failed to load project:', error);
      // Remove invalid project from localStorage
      localStorage.removeItem(SELECTED_PROJECT_KEY);
    }
    setIsLoading(false);
  }, []);

  // Load document
  const loadDocument = useCallback(async (docId) => {
    if (!currentProject || !docId) {
      setCurrentDocument(null);
      return;
    }

    setIsLoading(true);
    try {
      const response = await documentsApi.getById(currentProject.id, docId);
      if (response.success) {
        setCurrentDocument(response.data);
      }
    } catch (error) {
      console.error('Failed to load document:', error);
    }
    setIsLoading(false);
  }, [currentProject]);

  // Save document
  const saveDocument = useCallback(async (docId, data) => {
    if (!currentProject) return { success: false };

    try {
      const response = await documentsApi.update(currentProject.id, docId, data);
      if (response.success) {
        setCurrentDocument(response.data);
      }
      return response;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [currentProject]);

  // Create document
  const createDocument = useCallback(async (data) => {
    if (!currentProject) return { success: false };

    try {
      const response = await documentsApi.create(currentProject.id, data);
      if (response.success) {
        // Refresh tree
        const treeRes = await projectsApi.getTree(currentProject.id);
        if (treeRes.success) {
          setTree(treeRes.data);
        }
      }
      return response;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [currentProject]);

  // Delete document
  const deleteDocument = useCallback(async (docId) => {
    if (!currentProject) return { success: false };

    try {
      const response = await documentsApi.delete(currentProject.id, docId);
      if (response.success) {
        if (currentDocument?.id === docId) {
          setCurrentDocument(null);
        }
        // Refresh tree
        const treeRes = await projectsApi.getTree(currentProject.id);
        if (treeRes.success) {
          setTree(treeRes.data);
        }
      }
      return response;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [currentProject, currentDocument]);

  // Create folder
  const createFolder = useCallback(async (data) => {
    if (!currentProject) return { success: false };

    try {
      const response = await foldersApi.create(currentProject.id, data);
      if (response.success) {
        // Refresh tree
        const treeRes = await projectsApi.getTree(currentProject.id);
        if (treeRes.success) {
          setTree(treeRes.data);
        }
      }
      return response;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [currentProject]);

  // Delete folder
  const deleteFolder = useCallback(async (folderId) => {
    if (!currentProject) return { success: false };

    try {
      const response = await foldersApi.delete(currentProject.id, folderId);
      if (response.success) {
        // Refresh tree
        const treeRes = await projectsApi.getTree(currentProject.id);
        if (treeRes.success) {
          setTree(treeRes.data);
        }
      }
      return response;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [currentProject]);

  // Check user permission
  const hasPermission = useCallback((permission) => {
    if (!currentProject) return false;
    return currentProject.user_permissions?.includes(permission) || false;
  }, [currentProject]);

  const value = {
    projects,
    currentProject,
    tree,
    currentDocument,
    isLoading,
    fetchProjects,
    selectProject,
    loadDocument,
    saveDocument,
    createDocument,
    deleteDocument,
    createFolder,
    deleteFolder,
    hasPermission,
    setCurrentDocument,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within ProjectProvider');
  }
  return context;
}

export default ProjectContext;
