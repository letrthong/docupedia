import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, FolderKanban, Users, Eye, FileEdit, X, Check, Search, Globe } from 'lucide-react';
import { projectsApi, usersApi } from '../api';
import { useToast } from '../contexts/ToastContext';
import { Button, Modal, Input } from '../components/common';

function ProjectsManagePage() {
  const { success, error: showError } = useToast();

  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editModal, setEditModal] = useState({ open: false, project: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, project: null });
  const [permModal, setPermModal] = useState({ open: false, project: null });
  const [searchTerm, setSearchTerm] = useState('');

  // Form data for edit
  const [editForm, setEditForm] = useState({ name: '', description: '', is_public: false, allow_public_comments: false });

  // Permission modal state
  const [projectPermissions, setProjectPermissions] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [newPermissions, setNewPermissions] = useState({ view: true, edit: false, delete: false });

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const response = await projectsApi.getAll();
      if (response.success) {
        setProjects(response.data || []);
      }
    } catch (err) {
      showError('Không thể tải danh sách dự án');
    }
    setIsLoading(false);
  };

  const fetchUsers = async () => {
    try {
      const response = await usersApi.getAll();
      if (response.success) {
        setUsers(response.data || []);
      }
    } catch (err) {
      console.error('Cannot load users:', err);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchUsers();
  }, []);

  // Edit project
  const openEditModal = (project) => {
    setEditForm({ 
      name: project.name, 
      description: project.description || '',
      is_public: project.is_public || false,
      allow_public_comments: project.allow_public_comments || false
    });
    setEditModal({ open: true, project });
  };

  const handleEditSave = async () => {
    if (!editForm.name.trim()) {
      showError('Tên dự án không được để trống');
      return;
    }
    try {
      const response = await projectsApi.update(editModal.project.id, editForm);
      if (response.success) {
        success('Cập nhật dự án thành công');
        setEditModal({ open: false, project: null });
        fetchProjects();
      } else {
        showError(response.error?.message || 'Có lỗi xảy ra');
      }
    } catch (err) {
      showError(err.message || 'Có lỗi xảy ra');
    }
  };

  // Delete project
  const handleDelete = async () => {
    if (!deleteModal.project) return;
    try {
      const response = await projectsApi.delete(deleteModal.project.id);
      if (response.success) {
        success('Đã xóa dự án');
        setDeleteModal({ open: false, project: null });
        fetchProjects();
      } else {
        showError(response.error?.message || 'Không thể xóa');
      }
    } catch (err) {
      showError(err.message || 'Không thể xóa');
    }
  };

  // Permission management
  const openPermModal = async (project) => {
    setPermModal({ open: true, project });
    setSelectedUser('');
    setNewPermissions({ view: true, edit: false, delete: false });
    
    try {
      const response = await projectsApi.getPermissions(project.id);
      if (response.success) {
        setProjectPermissions(response.data || []);
      }
    } catch (err) {
      showError('Không thể tải danh sách quyền');
      setProjectPermissions([]);
    }
  };

  const handleAddPermission = async () => {
    if (!selectedUser) {
      showError('Vui lòng chọn người dùng');
      return;
    }

    try {
      const response = await projectsApi.addPermission(
        permModal.project.id,
        parseInt(selectedUser),
        newPermissions
      );
      if (response.success) {
        success('Đã thêm quyền cho người dùng');
        // Refresh permissions
        const permResponse = await projectsApi.getPermissions(permModal.project.id);
        if (permResponse.success) {
          setProjectPermissions(permResponse.data || []);
        }
        setSelectedUser('');
        setNewPermissions({ view: true, edit: false, delete: false });
      } else {
        showError(response.error?.message || 'Không thể thêm quyền');
      }
    } catch (err) {
      showError(err.message || 'Không thể thêm quyền');
    }
  };

  const handleUpdatePermission = async (userId, permissions) => {
    try {
      const response = await projectsApi.updatePermission(
        permModal.project.id,
        userId,
        permissions
      );
      if (response.success) {
        success('Đã cập nhật quyền');
        const permResponse = await projectsApi.getPermissions(permModal.project.id);
        if (permResponse.success) {
          setProjectPermissions(permResponse.data || []);
        }
      } else {
        showError(response.error?.message || 'Không thể cập nhật');
      }
    } catch (err) {
      showError(err.message || 'Không thể cập nhật');
    }
  };

  const handleRemovePermission = async (userId) => {
    try {
      const response = await projectsApi.removePermission(permModal.project.id, userId);
      if (response.success) {
        success('Đã xóa quyền');
        const permResponse = await projectsApi.getPermissions(permModal.project.id);
        if (permResponse.success) {
          setProjectPermissions(permResponse.data || []);
        }
      } else {
        showError(response.error?.message || 'Không thể xóa quyền');
      }
    } catch (err) {
      showError(err.message || 'Không thể xóa quyền');
    }
  };

  // Get users not in project
  const availableUsers = users.filter(
    (u) => !projectPermissions.some((p) => p.user_id === u.id)
  );

  // Filter projects
  const filteredProjects = projects.filter(
    (p) => p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/50 rounded-xl">
            <FolderKanban className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Quản lý dự án
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Quản lý dự án và phân quyền người dùng
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm dự án..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto" />
            <p className="mt-3 text-slate-500">Đang tải...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="p-8 text-center">
            <FolderKanban className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400">
              {searchTerm ? 'Không tìm thấy dự án' : 'Chưa có dự án nào'}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  Dự án
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  Mô tả
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  Tạo bởi
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredProjects.map((project) => (
                <tr
                  key={project.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                        <FolderKanban className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 dark:text-white">
                        {project.name}
                      </span>
                      {project.is_public && (
                        <Globe className="w-4 h-4 text-emerald-500" title="Dự án công khai" />
                      )}
                    </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1">
                      {project.description || '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {project.created_by_name || 'Admin'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openPermModal(project)}
                        className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition"
                        title="Quản lý quyền"
                      >
                        <Users className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(project)}
                        className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg transition"
                        title="Chỉnh sửa"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteModal({ open: true, project })}
                        className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={editModal.open}
        onClose={() => setEditModal({ open: false, project: null })}
        title="Chỉnh sửa dự án"
      >
        <div className="space-y-4">
          <Input
            label="Tên dự án"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            placeholder="Nhập tên dự án"
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Mô tả
            </label>
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              placeholder="Mô tả dự án (tùy chọn)"
              rows={3}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editForm.is_public}
                onChange={(e) => {
                  const isChecked = e.target.checked;
                  setEditForm({
                    ...editForm,
                    is_public: isChecked,
                    allow_public_comments: isChecked ? editForm.allow_public_comments : false
                  });
                }}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Dự án công khai (Ai cũng có thể xem không cần đăng nhập)
              </span>
            </label>
          </div>
          {editForm.is_public && (
            <div className="pt-2 pl-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.allow_public_comments}
                  onChange={(e) => setEditForm({ ...editForm, allow_public_comments: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Cho phép công khai bình luận (Public comments - Ai cũng xem được bình luận)
                </span>
              </label>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => setEditModal({ open: false, project: null })}
            >
              Hủy
            </Button>
            <Button variant="primary" onClick={handleEditSave}>
              Lưu thay đổi
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, project: null })}
        title="Xác nhận xóa"
      >
        <div className="space-y-4">
          <p className="text-slate-600 dark:text-slate-400">
            Bạn có chắc muốn xóa dự án{' '}
            <strong className="text-slate-900 dark:text-white">
              {deleteModal.project?.name}
            </strong>
            ? Tất cả tài liệu trong dự án sẽ bị xóa vĩnh viễn.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => setDeleteModal({ open: false, project: null })}
            >
              Hủy
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Xóa dự án
            </Button>
          </div>
        </div>
      </Modal>

      {/* Permission Modal */}
      <Modal
        isOpen={permModal.open}
        onClose={() => setPermModal({ open: false, project: null })}
        title={`Quản lý quyền - ${permModal.project?.name || ''}`}
        size="lg"
      >
        <div className="space-y-6">
          {/* Add new user */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
              Thêm người dùng
            </h4>
            <div className="flex gap-3">
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Chọn người dùng...</option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.display_name || u.username}
                  </option>
                ))}
              </select>
              <Button variant="primary" onClick={handleAddPermission}>
                <Plus className="w-4 h-4 mr-1" />
                Thêm
              </Button>
            </div>

            {/* Permission toggles for new user */}
            {selectedUser && (
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPermissions.view}
                    onChange={(e) =>
                      setNewPermissions({ ...newPermissions, view: e.target.checked })
                    }
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <Eye className="w-4 h-4 text-slate-500" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Xem</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPermissions.edit}
                    onChange={(e) =>
                      setNewPermissions({ ...newPermissions, edit: e.target.checked })
                    }
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <FileEdit className="w-4 h-4 text-slate-500" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Sửa</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPermissions.delete}
                    onChange={(e) =>
                      setNewPermissions({ ...newPermissions, delete: e.target.checked })
                    }
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <Trash2 className="w-4 h-4 text-slate-500" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Xóa</span>
                </label>
              </div>
            )}
          </div>

          {/* Current permissions list */}
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
              Người dùng có quyền ({projectPermissions.length})
            </h4>
            {projectPermissions.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                Chưa có người dùng nào được phân quyền
              </p>
            ) : (
              <div className="space-y-2">
                {projectPermissions.map((perm) => (
                  <div
                    key={perm.user_id}
                    className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-950/50 rounded-lg flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
                        {(perm.display_name || perm.username || 'U')[0].toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-900 dark:text-white">
                        {perm.display_name || perm.username}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={perm.view}
                          onChange={(e) =>
                            handleUpdatePermission(perm.user_id, {
                              ...perm,
                              view: e.target.checked,
                            })
                          }
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                        />
                        <span className="text-xs text-slate-500">Xem</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={perm.edit}
                          onChange={(e) =>
                            handleUpdatePermission(perm.user_id, {
                              ...perm,
                              edit: e.target.checked,
                            })
                          }
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                        />
                        <span className="text-xs text-slate-500">Sửa</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={perm.delete}
                          onChange={(e) =>
                            handleUpdatePermission(perm.user_id, {
                              ...perm,
                              delete: e.target.checked,
                            })
                          }
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                        />
                        <span className="text-xs text-slate-500">Xóa</span>
                      </label>
                      <button
                        onClick={() => handleRemovePermission(perm.user_id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition"
                        title="Xóa quyền"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button
              variant="ghost"
              onClick={() => setPermModal({ open: false, project: null })}
            >
              Đóng
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default ProjectsManagePage;
