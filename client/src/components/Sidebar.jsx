import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  LayoutDashboard,
  Users,
  Building2,
  Ban,
  FileSpreadsheet,
  Inbox,
  QrCode,
  LogOut,
  Building,
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();

  if (!user) return null;

  const role = user.role;

  // Define navigation items per role
  const adminNav = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/users', label: 'User Directory', icon: Users },
    { to: '/admin/buildings', label: 'Buildings', icon: Building2 },
    { to: '/admin/blacklist', label: 'Blacklist Control', icon: Ban },
    { to: '/admin/reports', label: 'Audit & Reports', icon: FileSpreadsheet },
  ];

  const hostNav = [
    { to: '/host/requests', label: 'Visit Requests', icon: Inbox },
  ];

  const securityNav = [
    { to: '/security/terminal', label: 'Gate Terminal', icon: QrCode },
  ];

  let currentNav = [];
  if (role === 'admin') currentNav = adminNav;
  else if (role === 'host') currentNav = hostNav;
  else if (role === 'security') currentNav = securityNav;

  const linkBaseClasses =
    'flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors';
  const activeClass = 'bg-blue-600 text-white shadow-sm';
  const inactiveClass = 'text-slate-600 hover:text-slate-900 hover:bg-slate-100';

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-200">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-base">AccessPass</span>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 -mt-1">
                {role} Portal
              </span>
            </div>
          </div>
        </div>

        {/* User Card */}
        <div className="p-4 mx-3 my-3 bg-slate-50 border border-slate-200 rounded-lg">
          <p className="text-xs font-semibold text-slate-900 truncate">{user.fullName}</p>
          <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
          <div className="mt-2 flex items-center text-[11px] text-slate-600 font-medium">
            <Building className="w-3 h-3 mr-1 text-slate-400" />
            <span className="truncate">{user.buildingName || 'Campus-Wide'}</span>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {currentNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `${linkBaseClasses} ${isActive ? activeClass : inactiveClass}`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Logout bottom action */}
        <div className="p-3 border-t border-slate-200">
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
