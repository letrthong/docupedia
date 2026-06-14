import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

function Toast({ toast }) {
  const { removeToast } = useToast();

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    error: <XCircle className="w-5 h-5 text-rose-500" />,
    warning: <AlertCircle className="w-5 h-5 text-amber-500" />,
    info: <Info className="w-5 h-5 text-emerald-500" />,
  };

  const styles = {
    success: 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900',
    error: 'border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-900',
    warning: 'border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900',
    info: 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900',
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl ${styles[toast.type]} animate-slide-in backdrop-blur-sm`}
    >
      {icons[toast.type]}
      <p className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200">
        {toast.message}
      </p>
      <button
        onClick={() => removeToast(toast.id)}
        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function ToastContainer() {
  const { toasts } = useToast();

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

export default ToastContainer;
