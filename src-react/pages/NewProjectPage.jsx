import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Check, X, Eye, Edit, Trash2 } from 'lucide-react';
import { projectsApi, usersApi } from '../api';
import { useToast } from '../contexts/ToastContext';
import { useProject } from '../contexts/ProjectContext';
import { Button, Input } from '../components/common';

function NewProjectPage() {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const { fetchProjects, selectProject } = useProject();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [allowPublicComments, setAllowPublicComments] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  
  // User permissions state
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState({}); // { [userId]: ['view', 'edit', 'delete'] }

  // Fetch users on mount
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await usersApi.getAll();
        if (response.success) {
          // Filter out admin users - they already have full access
          const regularUsers = response.data.filter(u => u.role !== 'admin');
          setUsers(regularUsers);
        }
      } catch (err) {
        console.error('Failed to load users:', err);
      }
      setLoadingUsers(false);
    };
    loadUsers();
  }, []);

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => {
      if (prev[userId]) {
        // Remove user
        const { [userId]: removed, ...rest } = prev;
        return rest;
      } else {
        // Add user with default 'view' permission
        return { ...prev, [userId]: ['view'] };
      }
    });
  };

  const togglePermission = (userId, permission) => {
    setSelectedUsers(prev => {
      if (!prev[userId]) return prev;
      
      const currentPerms = prev[userId];
      if (currentPerms.includes(permission)) {
        // Remove permission (but keep at least 'view')
        if (permission === 'view') return prev;
        return { ...prev, [userId]: currentPerms.filter(p => p !== permission) };
      } else {
        // Add permission
        return { ...prev, [userId]: [...currentPerms, permission] };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate
    const newErrors = {};
    if (!name.trim()) {
      newErrors.name = 'Tên project là bắt buộc';
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsSubmitting(true);

    try {
      // Create project
      const response = await projectsApi.create({
        name: name.trim(),
        description: description.trim(),
        is_public: isPublic,
        allow_public_comments: allowPublicComments,
      });

      if (response.success) {
        const projectId = response.data.id;
        
        // Add permissions for selected users
        const permissionPromises = Object.entries(selectedUsers).map(([userId, perms]) => 
          projectsApi.addPermission(projectId, userId, perms)
        );
        
        await Promise.all(permissionPromises);
        
        success('Tạo project thành công');
        await fetchProjects();
        selectProject(projectId);
        navigate(`/project?projectId=${projectId}`);
      } else {
        showError(response.error?.message || 'Không thể tạo project');
      }
    } catch (err) {
      showError(err.message || 'Có lỗi xảy ra');
    }

    setIsSubmitting(false);
  };

  const selectedCount = Object.keys(selectedUsers).length;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-6 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Quay lại Dashboard
      </button>

      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
        Tạo Project mới
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
            Thông tin cơ bản
          </h2>
          
          <div className="space-y-4">
            <Input
              label="Tên project"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
              placeholder="Nhập tên project..."
              autoFocus
            />
            
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Mô tả (tùy chọn)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-slate-700 dark:text-white transition-colors"
                rows={3}
                placeholder="Mô tả ngắn về project..."
              />
            </div>
            
            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => {
                    setIsPublic(e.target.checked);
                    if (!e.target.checked) setAllowPublicComments(false);
                  }}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Dự án công khai (Ai cũng có thể xem không cần đăng nhập)
                </span>
              </label>
            </div>
            
            {isPublic && (
              <div className="pt-2 pl-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowPublicComments}
                    onChange={(e) => setAllowPublicComments(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Cho phép công khai bình luận (Public comments - Ai cũng xem được bình luận)
                  </span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* User Permissions */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4" />
              Phân quyền người dùng
            </h2>
            {selectedCount > 0 && (
              <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-full font-semibold">
                {selectedCount} người được chọn
              </span>
            )}
          </div>

          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Chọn người dùng và gán quyền truy cập. Admin luôn có toàn quyền.
          </p>

          {loadingUsers ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-200 border-t-emerald-600" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>Chưa có người dùng nào khác</p>
            </div>
          ) : (
            <div className="space-y-2">
              {users.map(user => {
                const isSelected = !!selectedUsers[user.id];
                const perms = selectedUsers[user.id] || [];
                
                return (
                  <div
                    key={user.id}
                    className={`p-3 rounded-xl border transition-all ${
                      isSelected 
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' 
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => toggleUserSelection(user.id)}
                          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {isSelected && <Check className="w-4 h-4" />}
                        </button>
                        
                        <div>
                          <div className="font-medium text-slate-900 dark:text-white">
                            {user.display_name || user.username}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            @{user.username}
                          </div>
                        </div>
                      </div>
                      
                      {isSelected && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => togglePermission(user.id, 'view')}
                            className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                              perms.includes('view')
                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                            }`}
                            title="Quyền xem"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => togglePermission(user.id, 'edit')}
                            className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                              perms.includes('edit')
                                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                            }`}
                            title="Quyền sửa"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => togglePermission(user.id, 'delete')}
                            className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                              perms.includes('delete')
                                ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                            }`}
                            title="Quyền xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Permission Legend */}
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-emerald-500" />
                <span>Xem tài liệu</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Edit className="w-3.5 h-3.5 text-amber-500" />
                <span>Chỉnh sửa</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Xóa tài liệu</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="secondary" type="button" onClick={() => navigate('/')}>
            Hủy
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Tạo Project
          </Button>
        </div>
      </form>
    </div>
  );
}

export default NewProjectPage;
