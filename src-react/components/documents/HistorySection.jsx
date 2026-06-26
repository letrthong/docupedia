import { useState, useEffect, useCallback } from 'react';
import { Clock, User, ArrowRight } from 'lucide-react';
import { useProject } from '../../contexts/ProjectContext';
import { useAuth } from '../../contexts/AuthContext';
import { documentsApi } from '../../api';

function HistorySection() {
  const { currentProject, currentDocument } = useProject();
  const { isAuthenticated } = useAuth();

  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!currentProject || !currentDocument) {
      setHistory([]);
      return;
    }
    setIsLoading(true);
    try {
      const res = await documentsApi.getHistory(currentProject.id, currentDocument.id);
      if (res.success) {
        // Trả về lịch sử theo thứ tự mới nhất lên trước
        const historyData = res.data || [];
        setHistory([...historyData].reverse());
      }
    } catch (err) {
      console.error('Lỗi khi tải lịch sử:', err);
    }
    setIsLoading(false);
  }, [currentProject, currentDocument]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  if (!currentDocument) return null;

  if (!isAuthenticated) {
    return (
      <div className="text-center py-8">
        <Clock className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
        <p className="text-slate-600 dark:text-slate-400 font-medium text-sm">
          Vui lòng đăng nhập để xem lịch sử thay đổi.
        </p>
      </div>
    );
  }

  // Helper render chi tiết thay đổi
  const renderDetails = (details, action) => {
    if (!details) return null;

    if (action === 'create') {
      return (
        <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
          Tạo tài liệu với tiêu đề: <strong className="text-slate-700 dark:text-slate-300">"{details.title}"</strong>
        </span>
      );
    }

    if (action === 'update' && details.changes) {
      const changes = details.changes;
      return (
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 space-y-1 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/40">
          {changes.title && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-slate-650 dark:text-slate-400">Đổi tiêu đề:</span>
              <span className="line-through text-slate-400">{changes.title.old}</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <span className="text-slate-700 dark:text-slate-300 font-medium">{changes.title.new}</span>
            </div>
          )}
          {changes.content && (
            <div className="flex items-center gap-1">
              <span className="font-semibold text-slate-650 dark:text-slate-400">Nội dung:</span>
              <span className="text-slate-700 dark:text-slate-350">{changes.content}</span>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-6">
        <Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-450" />
        Lịch sử thay đổi ({history.length})
      </h3>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-8 text-slate-400 dark:text-slate-600 text-sm">
          Chưa có bản ghi lịch sử nào cho tài liệu này.
        </div>
      ) : (
        <div className="relative pl-6 border-l-2 border-slate-100 dark:border-slate-800 space-y-8 ml-2 py-2">
          {history.map((entry) => {
            const isCreate = entry.action === 'create';
            return (
              <div key={entry.id} className="relative">
                {/* Timeline dot */}
                <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 bg-white dark:bg-slate-950 flex items-center justify-center ${
                  isCreate 
                    ? 'border-emerald-500' 
                    : 'border-blue-500'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${isCreate ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        isCreate
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100/30'
                          : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100/30'
                      }`}>
                        {isCreate ? 'Khởi tạo' : 'Cập nhật'}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-normal">
                        <User className="w-3.5 h-3.5" />
                        {entry.display_name || entry.username || 'System'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(entry.timestamp).toLocaleString('vi-VN')}
                    </span>
                  </div>

                  {/* Render details of changes */}
                  {renderDetails(entry.details, entry.action)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default HistorySection;
