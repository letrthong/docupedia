import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { ToastContainer } from '../common';

function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200 overflow-hidden">
      <div className="flex h-full">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <Header
            onMenuClick={() => setSidebarOpen(true)}
          />
          
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>

      <ToastContainer />
    </div>
  );
}

export default MainLayout;
