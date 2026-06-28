import { useState, useEffect } from 'react';
import { Lock, User, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Button, Input } from '../components/common';
import { settingsApi } from '../api';

function SettingsPage() {
  const { user, changePassword } = useAuth();
  const { success, error: showError } = useToast();
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [enableAutoSave, setEnableAutoSave] = useState(localStorage.getItem('enableAutoSave') === 'true');
  const [autoSaveInterval, setAutoSaveInterval] = useState(parseInt(localStorage.getItem('autoSaveInterval')) || 3);
  const [maxSessionDuration, setMaxSessionDuration] = useState(30);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  
  const isAdmin = user?.role === 'admin';

  // Fetch settings on mount if admin
  useEffect(() => {
    if (isAdmin) {
      const fetchSettings = async () => {
        try {
          const res = await settingsApi.get();
          if (res.success && res.data) {
            setMaxSessionDuration(res.data.max_session_duration_minutes || 30);
          }
        } catch (e) {
          console.error('Failed to fetch system settings:', e);
        }
      };
      fetchSettings();
    }
  }, [isAdmin]);

  const handleMaxSessionDurationChange = (e) => {
    setMaxSessionDuration(parseInt(e.target.value));
  };

  const handleSaveSystemSettings = async () => {
    setIsSavingSettings(true);
    try {
      const res = await settingsApi.update({ max_session_duration_minutes: maxSessionDuration });
      if (res.success) {
        success('Đã lưu cấu hình hệ thống thành công');
      } else {
        showError(res.error || 'Không thể lưu cấu hình');
      }
    } catch (e) {
      showError(e.message || 'Có lỗi xảy ra khi lưu cấu hình');
    }
    setIsSavingSettings(false);
  };

  const handleToggleAutoSave = (e) => {
    const checked = e.target.checked;
    setEnableAutoSave(checked);
    localStorage.setItem('enableAutoSave', checked);
    if (checked) {
      success('Đã bật Tự động lưu');
    } else {
      success('Đã tắt Tự động lưu');
    }
  };

  const handleIntervalChange = (e) => {
    const value = parseInt(e.target.value);
    setAutoSaveInterval(value);
    localStorage.setItem('autoSaveInterval', value);
    success(`Đã cập nhật chu kỳ lưu thành ${value} giây`);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    // Validate
    const newErrors = {};
    if (!oldPassword) {
      newErrors.oldPassword = 'Vui lòng nhập mật khẩu cũ';
    }
    if (!newPassword) {
      newErrors.newPassword = 'Vui lòng nhập mật khẩu mới';
    } else if (newPassword.length < 6) {
      newErrors.newPassword = 'Mật khẩu tối thiểu 6 ký tự';
    }
    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }
    
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsSubmitting(true);

    const result = await changePassword(oldPassword, newPassword);

    if (result.success) {
      success('Đổi mật khẩu thành công');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      showError(result.error || 'Không thể đổi mật khẩu');
    }

    setIsSubmitting(false);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Cài đặt
      </h1>

      {/* Profile Info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <User className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Thông tin tài khoản
          </h2>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center">
            <span className="w-32 text-sm text-gray-500 dark:text-gray-400">
              Tên đăng nhập:
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {user?.username}
            </span>
          </div>
          <div className="flex items-center">
            <span className="w-32 text-sm text-gray-500 dark:text-gray-400">
              Tên hiển thị:
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {user?.display_name || user?.username}
            </span>
          </div>
          <div className="flex items-center">
            <span className="w-32 text-sm text-gray-500 dark:text-gray-400">
              Email:
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {user?.email || '-'}
            </span>
          </div>
          <div className="flex items-center">
            <span className="w-32 text-sm text-gray-500 dark:text-gray-400">
              Role:
            </span>
            <span className={`px-2 py-1 text-xs rounded-full ${
              user?.role === 'admin'
                ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
            }`}>
              {user?.role === 'admin' ? 'Administrator' : 'User'}
            </span>
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Settings className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Tùy chọn hệ thống
          </h2>
        </div>
        
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={enableAutoSave}
              onChange={handleToggleAutoSave}
              className="w-5 h-5 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
            />
            <div>
              <span className="block text-sm font-medium text-gray-900 dark:text-white">
                Bật tự động lưu (Auto-save)
              </span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                Tự động lưu tài liệu sau mỗi {autoSaveInterval} giây khi đang ở chế độ chỉnh sửa
              </span>
            </div>
          </label>

          {enableAutoSave && (
            <div className="pl-8 flex items-center gap-3">
              <label className="text-sm text-gray-700 dark:text-gray-300">Chu kỳ lưu:</label>
              <select
                value={autoSaveInterval}
                onChange={handleIntervalChange}
                className="px-3 py-1.5 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value={3}>3 giây</option>
                <option value={15}>15 giây</option>
                <option value={30}>30 giây</option>
                <option value={60}>60 giây</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Cấu hình hệ thống (Admin only) */}
      {isAdmin && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Settings className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Cấu hình hệ thống (Admin)
            </h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-900 dark:text-white">
                Thời gian chỉnh sửa tối đa cho mỗi phiên:
              </label>
              <select
                value={maxSessionDuration}
                onChange={handleMaxSessionDurationChange}
                disabled={isSavingSettings}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value={15}>15 phút</option>
                <option value={30}>30 phút</option>
                <option value={60}>60 phút</option>
              </select>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Sau thời gian này, khóa chỉnh sửa tài liệu sẽ tự động giải phóng để người khác có thể sửa.
              </span>
            </div>

            <Button
              onClick={handleSaveSystemSettings}
              isLoading={isSavingSettings}
            >
              Lưu cấu hình hệ thống
            </Button>
          </div>
        </div>
      )}

      {/* Change Password */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Lock className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Đổi mật khẩu
          </h2>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <Input
            label="Mật khẩu hiện tại"
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            error={errors.oldPassword}
          />
          <Input
            label="Mật khẩu mới"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            error={errors.newPassword}
          />
          <Input
            label="Xác nhận mật khẩu mới"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={errors.confirmPassword}
          />
          
          <Button type="submit" isLoading={isSubmitting}>
            Đổi mật khẩu
          </Button>
        </form>
      </div>
    </div>
  );
}

export default SettingsPage;
