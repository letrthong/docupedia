import { X, FolderKanban, Plus, ChevronDown, FileText, Folder, Search, Globe, Sun, Moon, User, LogOut, Settings } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useProject } from '../../contexts/ProjectContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import TreeView from '../documents/TreeView';

function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAdmin, isAuthenticated } = useAuth();
  const { projects, fetchProjects, currentProject, selectProject, isLoading, tree } = useProject();
  const { isDark, toggleTheme } = useTheme();
  const [showProjectList, setShowProjectList] = useState(false);
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Xóa từ khóa tìm kiếm khi đóng dropdown
  useEffect(() => {
    if (!showProjectList) {
      setProjectSearchTerm('');
    }
  }, [showProjectList]);

  useEffect(() => {
    // Chỉ fetch danh sách dự án (hiển thị dropdown Sidebar) nếu đã đăng nhập
    if (isAuthenticated) {
      fetchProjects();
    }
  }, [fetchProjects, isAuthenticated]);

  const handleSelectProject = (project) => {
    selectProject(project.id);
    setShowProjectList(false);
    navigate(`/project/${project.id}`);
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  // Count nodes in tree
  const nodeCount = tree?.nodes ? Object.keys(tree.nodes).length : 0;

  // Lọc danh sách dự án dựa trên từ khóa
  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(projectSearchTerm.toLowerCase())
  );

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300 lg:translate-x-0 lg:static lg:h-screen ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo & Close */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-3 hover:opacity-80 transition"
            >
              <div className="bg-emerald-600 text-white p-2 rounded-lg flex items-center justify-center shadow-md shadow-emerald-200 dark:shadow-none">
                <FileText className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Docupedia
                </span>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">Document Manager</p>
              </div>
            </button>
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Project Header */}
          {isAuthenticated ? (
            <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800">
              <div className="relative">
                <button
                  onClick={() => setShowProjectList(!showProjectList)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-emerald-300 dark:hover:border-emerald-600 transition-all"
                >
                  <span className="truncate font-medium text-slate-900 dark:text-white">
                    {currentProject?.name || 'Chọn Project...'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showProjectList ? 'rotate-180' : ''}`} />
                </button>

                {showProjectList && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-h-80 flex flex-col z-10">
                    {/* Thanh tìm kiếm */}
                    <div className="p-2 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Tìm dự án..."
                          value={projectSearchTerm}
                          onChange={(e) => setProjectSearchTerm(e.target.value)}
                          className="w-full pl-8 pr-8 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          autoFocus
                        />
                        {projectSearchTerm && (
                          <button
                            onClick={() => setProjectSearchTerm('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Danh sách lọc */}
                    <div className="overflow-y-auto flex-1">
                      {isLoading ? (
                        <div className="px-4 py-3 text-sm text-slate-500 flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-200 border-t-emerald-600" />
                          Đang tải...
                        </div>
                      ) : filteredProjects.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-slate-500">
                          Không tìm thấy project
                        </div>
                      ) : (
                        filteredProjects.map((project) => (
                          <button
                            key={project.id}
                            onClick={() => handleSelectProject(project)}
                            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition ${
                              currentProject?.id === project.id
                                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-medium'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <FolderKanban className="w-4 h-4 text-slate-400" />
                              <span className="truncate">{project.name}</span>
                              {project.is_public && (
                                <Globe className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" title="Dự án công khai" />
                              )}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                    
                    {isAdmin && (
                      <>
                        <div className="border-t border-slate-100 dark:border-slate-800" />
                        <button
                          onClick={() => {
                            setShowProjectList(false);
                            navigate('/projects/new');
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-medium transition"
                        >
                          <Plus className="w-4 h-4" />
                          Tạo Project mới
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : currentProject ? (
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50">
              <FolderKanban className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span className="font-semibold text-slate-900 dark:text-white truncate">
                {currentProject.name}
              </span>
            </div>
          ) : null}

          {/* Tree View - Maximum Height */}
          <div className="flex-1 overflow-y-auto px-2 py-2" style={{ minHeight: 0 }}>
            {currentProject ? (
              <TreeView />
            ) : (
              <div className="text-center py-8">
                <Folder className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-400 dark:text-slate-500">Chọn project để xem</p>
              </div>
            )}
          </div>

          {/* Compact Footer */}
          <div className="flex-shrink-0 px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-3 bg-slate-50/50 dark:bg-slate-900/50">
            {/* Control Row: Theme toggle & User Menu */}
            <div className="flex items-center justify-between">
              {/* Theme Toggle */}
              <button 
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-all duration-200 active:scale-95"
                title="Chuyển chế độ Sáng/Tối"
              >
                {isDark ? (
                  <Sun className="w-4 h-4 text-amber-500 animate-pulse" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </button>

              {/* User Menu or Login */}
              {isAuthenticated ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className={`flex items-center gap-2 p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-all duration-200 active:scale-95 ${
                      showDropdown ? 'bg-slate-200 dark:bg-slate-800' : ''
                    }`}
                  >
                    <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center text-white text-xs font-semibold shadow-md shadow-emerald-200 dark:shadow-none">
                      {user?.display_name?.[0] || user?.username?.[0] || 'U'}
                    </div>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 max-w-[120px] truncate">
                      {user?.display_name || user?.username}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu popped up above the footer button */}
                  {showDropdown && (
                    <div className="absolute bottom-full right-0 mb-2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50">
                      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {user?.display_name || user?.username}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          {user?.email || (isAdmin ? 'Administrator' : 'User')}
                        </p>
                        {isAdmin && (
                          <span className="inline-block mt-1.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                            Admin
                          </span>
                        )}
                      </div>
                      
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => {
                              setShowDropdown(false);
                              navigate('/users');
                            }}
                            className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                          >
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            Quản lý người dùng
                          </button>
                          <button
                            onClick={() => {
                              setShowDropdown(false);
                              navigate('/projects/manage');
                            }}
                            className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                          >
                            <FolderKanban className="w-3.5 h-3.5 text-slate-400" />
                            Quản lý dự án
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => {
                          setShowDropdown(false);
                          navigate('/settings');
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Settings className="w-3.5 h-3.5 text-slate-400" />
                        Cài đặt
                      </button>

                      <div className="border-t border-slate-100 dark:border-slate-800">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          Đăng xuất
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => navigate('/login')}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all duration-200 active:scale-95"
                >
                  <User className="w-4 h-4" />
                  Đăng nhập
                </button>
              )}
            </div>

            {/* Copyright and stats */}
            <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 px-1">
              {currentProject ? (
                <span className="font-semibold text-slate-500 dark:text-slate-400">
                  {nodeCount} tài liệu
                </span>
              ) : (
                <span>Docupedia</span>
              )}
              <span>
                Copyright © 2026{' '}
                <span className="group relative inline-block">
                  <a href="https://telua.vn/" target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-500 hover:text-emerald-400 hover:underline transition-colors">Telua</a>
                  
                  {/* Custom Tooltip */}
                  <div className="absolute bottom-full right-0 mb-1.5 px-2.5 py-1 bg-slate-800 dark:bg-slate-700 text-white text-xs font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-xl pointer-events-none">
                    Đơn vị phát triển phần mềm
                    {/* Tooltip Arrow */}
                    <div className="absolute top-full right-4 border-[5px] border-transparent border-t-slate-800 dark:border-t-slate-700"></div>
                  </div>
                </span>
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
