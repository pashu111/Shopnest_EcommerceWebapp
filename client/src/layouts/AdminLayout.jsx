import React from 'react';
import Sidebar from '../components/admin/Sidebar';

const AdminLayout = ({ children }) => {
  return (
    <div className="flex bg-gray-50 min-h-screen">
      {/* Sidebar - Positioned fixed/absolute within the component */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 lg:ml-64 transition-all duration-300 pt-16 lg:pt-0">
        
        {/* Top Header Bar - Sticky for easier navigation on mobile */}
        <div className="sticky top-0 z-30 lg:static bg-gray-50/80 backdrop-blur-md lg:bg-transparent p-4 md:p-8 pb-0 lg:pb-0">
          <header className="flex justify-between items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h1 className="text-base md:text-xl font-bold text-gray-800 truncate">
              ShopNest <span className="hidden xs:inline">Admin</span>
            </h1>
            
            <div className="flex items-center gap-2 md:gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-gray-900 leading-none">Admin User</p>
                <p className="text-[10px] text-gray-500 mt-1">Super Admin</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-red-600 flex items-center justify-center text-white text-sm font-black shadow-md shadow-red-200">
                JD
              </div>
            </div>
          </header>
        </div>

        {/* Page Content Body */}
        <div className="p-4 md:p-8 pt-4 md:pt-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
