import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, Plus, Users, Settings, FileText, Clock, ChevronRight } from 'lucide-react';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';

function DashboardPage() {
  const navigate = useNavigate();
  const { projects, fetchProjects, isLoading, selectProject } = useProject();
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleProjectClick = (project) => {
    selectProject(project.id);
    navigate(`/project?projectId=${project.id}`);
  };

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      {/* Hero Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                Xin chào, {user?.display_name || user?.username}! 
                <span className="text-2xl">👋</span>
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                Chọn một project để bắt đầu làm việc với tài liệu
              </p>
            </div>

            {isAdmin && (
              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/users')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all"
                >
                  <Users className="w-4 h-4" />
                  Quản lý Users
                </button>
                <button
                  onClick={() => navigate('/projects/new')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 dark:shadow-none transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Tạo Project
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/50 rounded-xl flex items-center justify-center">
              <FolderKanban className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{projects.length}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">Projects</p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/50 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">--</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">Tài liệu</p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950/50 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{new Date().toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">Cập nhật gần đây</p>
            </div>
          </div>
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Danh sách Projects
          </h2>
          <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full text-slate-500 dark:text-slate-400 font-semibold">
            {projects.length} mục
          </span>
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-200 border-t-emerald-600" />
              <p className="text-sm text-slate-500 dark:text-slate-400">Đang tải dữ liệu...</p>
            </div>
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center">
              <FolderKanban className="w-10 h-10 text-slate-400 dark:text-slate-500" />
            </div>
            <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300">
              Chưa có project nào
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm max-w-sm mx-auto">
              {isAdmin 
                ? 'Bắt đầu bằng cách tạo project mới để quản lý tài liệu của bạn' 
                : 'Liên hệ admin để được cấp quyền truy cập vào các projects'}
            </p>
            {isAdmin && (
              <button
                onClick={() => navigate('/projects/new')}
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 dark:shadow-none transition-all"
              >
                <Plus className="w-4 h-4" />
                Tạo Project đầu tiên
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => handleProjectClick(project)}
                className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-600 hover:shadow-lg hover:shadow-emerald-100 dark:hover:shadow-none transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/50 rounded-xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:shadow-lg group-hover:shadow-emerald-200 dark:group-hover:shadow-none transition-all">
                    <FolderKanban className="w-6 h-6 text-emerald-600 dark:text-emerald-400 group-hover:text-white transition-all" />
                  </div>
                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/projects/${project.id}/settings`);
                      }}
                      className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-4 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {project.name}
                </h3>
                
                {project.description && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {project.description}
                  </p>
                )}

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex flex-wrap gap-1.5">
                    {project.user_permissions?.slice(0, 3).map((perm) => (
                      <span
                        key={perm}
                        className="px-2 py-0.5 text-[10px] rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider"
                      >
                        {perm}
                      </span>
                    ))}
                    {project.user_permissions?.length > 3 && (
                      <span className="px-2 py-0.5 text-[10px] rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                        +{project.user_permissions.length - 3}
                      </span>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;
