import { Menu, FileText } from 'lucide-react';

function Header({ onMenuClick, title }) {
  return (
    <header className="lg:hidden sticky top-0 z-40 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 transition-colors duration-200">
      <div className="flex items-center justify-between h-full">
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 text-white p-2 rounded-lg flex items-center justify-center shadow-md shadow-emerald-200 dark:shadow-none">
              <FileText className="w-5 h-5" />
            </div>
            {title && (
              <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                {title}
              </h1>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
