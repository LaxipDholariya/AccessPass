import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { Menu, Bell, Shield, LogOut } from 'lucide-react';
import SEOHead from './SEOHead';

export default function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 font-sans antialiased">
      <SEOHead
        title="Staff Portal — AccessPass"
        description="AccessPass internal staff and administrative management portal."
        noIndex={true}
      />
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center space-x-3">
            {/* Mobile menu trigger */}
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 hidden sm:inline">
              AccessPass System
            </span>
          </div>

          {/* User profile pill and quick logout */}
          <div className="flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <span className="block text-sm font-semibold text-slate-900 leading-tight">
                {user?.fullName}
              </span>
              <span className="block text-xs text-blue-600 font-medium capitalize">
                {user?.role} • {user?.buildingName || 'Campus'}
              </span>
            </div>

            <button
              type="button"
              onClick={logout}
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
