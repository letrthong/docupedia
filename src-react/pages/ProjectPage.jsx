import { useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import { Editor } from '../components/documents';
import { FolderX } from 'lucide-react';

function ProjectPage() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { selectProject, currentProject, isLoading, loadDocument, currentDocument } = useProject();

  const projectId = searchParams.get('projectId') || params.projectId;
  const documentId = searchParams.get('docId') || searchParams.get('documentId') || params.documentId;

  // Load project
  useEffect(() => {
    if (projectId) {
      selectProject(projectId);
    }
  }, [projectId, selectProject]);

  // Load document from URL if specified
  useEffect(() => {
    if (documentId && currentProject) {
      loadDocument(documentId);
    }
  }, [documentId, currentProject, loadDocument]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-200 border-t-emerald-600" />
      </div>
    );
  }

  if (!currentProject && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
          <FolderX className="w-8 h-8 text-slate-400 dark:text-slate-500" />
        </div>
        <p className="text-slate-600 dark:text-slate-400 font-medium">
          Project không tồn tại hoặc bạn không có quyền truy cập
        </p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
        >
          Quay về Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="h-full">
      <Editor />
    </div>
  );
}

export default ProjectPage;
