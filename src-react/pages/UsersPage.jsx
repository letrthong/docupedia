import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Shield, UserCog } from 'lucide-react';
import { usersApi } from '../api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { Button, Modal, Input } from '../components/common';

function UsersPage() {
  const { user: currentUser } = useAuth();
  const { success, error: showError } = useToast();
  
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ open: false, user: null });
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    display_name: '',
    email: '',
    role: 'user',
  });
  const [errors, setErrors] = useState({});

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await usersApi.getAll();
      if (response.success) {
        setUsers(response.data || []);
      }
    } catch (err) {
      showError('Không thể tải danh sách người dùng');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      display_name: '',
      email: '',
      role: 'user',
    });
    setErrors({});
    setModalOpen(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      display_name: user.display_name || '',
      email: user.email || '',
      role: user.role,
    });
    setErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.username.trim()) {
      newErrors.username = 'Tên đăng nhập là bắt buộc';
    }
    if (!editingUser && !formData.password) {
      newErrors.password = 'Mật khẩu là bắt buộc';
    }
    if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Mật khẩu tối thiểu 6 ký tự';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      const data = {
        username: formData.username,
        display_name: formData.display_name,
        email: formData.email,
        role: formData.role,
      };

      if (formData.password) {
        data.password = formData.password;
      }

      let response;
      if (editingUser) {
        response = await usersApi.update(editingUser.id, data);
      } else {
        response = await usersApi.create(data);
      }

      if (response.success) {
        success(editingUser ? 'Cập nhật thành công' : 'Tạo người dùng thành công');
        setModalOpen(false);
        fetchUsers();
      } else {
        showError(response.error?.message || 'Có lỗi xảy ra');
      }
    } catch (err) {
      showError(err.message || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async () => {
    const user = deleteModal.user;
    if (!user) return;

    try {
      const response = await usersApi.delete(user.id);
      if (response.success) {
        success('Đã xóa người dùng');
        setDeleteModal({ open: false, user: null });
        fetchUsers();
      } else {
        showError(response.error?.message || 'Không thể xóa');
      }
    } catch (err) {
      showError(err.message || 'Không thể xóa');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const response = await usersApi.changeRole(userId, newRole);
      if (response.success) {
        success('Đã thay đổi role');
        fetchUsers();
      } else {
        showError(response.error?.message || 'Có lỗi');
      }
    } catch (err) {
      showError(err.message);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Quản lý người dùng
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Quản lý tài khoản và quyền truy cập
          </p>
        </div>
        <Button onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
          Thêm người dùng
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                  Người dùng
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                  Trạng thái
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                        {user.display_name?.[0] || user.username[0]}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {user.display_name || user.username}
                        </p>
                        <p className="text-sm text-gray-500">@{user.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {user.email || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      disabled={user.id === currentUser?.id}
                      className="px-2 py-1 text-sm rounded border dark:bg-gray-700 dark:border-gray-600"
                    >
                      <option value="admin">Admin</option>
                      <option value="user">User</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      user.is_active
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {user.is_active ? 'Hoạt động' : 'Vô hiệu'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditModal(user)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      {user.id !== currentUser?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteModal({ open: true, user })}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingUser ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSubmit}>
              {editingUser ? 'Cập nhật' : 'Tạo'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Tên đăng nhập"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            error={errors.username}
            disabled={!!editingUser}
          />
          <Input
            label={editingUser ? 'Mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu'}
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            error={errors.password}
          />
          <Input
            label="Tên hiển thị"
            value={formData.display_name}
            onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Role
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, user: null })}
        title="Xác nhận xóa"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteModal({ open: false, user: null })}>
              Hủy
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Xóa
            </Button>
          </>
        }
      >
        <p className="text-gray-600 dark:text-gray-300">
          Bạn có chắc muốn xóa người dùng "{deleteModal.user?.username}"?
        </p>
      </Modal>
    </div>
  );
}

export default UsersPage;
