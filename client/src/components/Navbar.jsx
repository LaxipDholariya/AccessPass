import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Menu, X, LogIn, UserPlus, Search, LayoutDashboard, LogOut } from 'lucide-react';

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  const toggleMobileMenu = () => setIsMobileMenuOpen((prev) => !prev);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const isActive = (path) => location.pathname === path;

  // Compute dashboard target link for logged-in user
  let dashboardPath = '/login';
  if (user) {
    if (user.role === 'admin') dashboardPath = '/admin/dashboard';
    else if (user.role === 'host') dashboardPath = '/host/requests';
    else if (user.role === 'security') dashboardPath = '/security/terminal';
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <Link
            to="/"
            onClick={closeMobileMenu}
            className="flex items-center space-x-2.5 text-slate-900 group"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-bold text-slate-900 tracking-tight">
                Access<span className="text-blue-600">Pass</span>
              </span>
              <span className="block text-[10px] uppercase tracking-wider font-semibold text-slate-400 -mt-1">
                Visitor System
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center space-x-1">
            <Link
              to="/"
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                isActive('/')
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Home
            </Link>

            <Link
              to="/register-visit"
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center space-x-1.5 ${
                isActive('/register-visit')
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register Visit</span>
            </Link>

            <Link
              to="/pass-lookup"
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center space-x-1.5 ${
                isActive('/pass-lookup')
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Find Pass</span>
            </Link>
          </nav>

          {/* Desktop Right Action */}
          <div className="hidden md:flex items-center space-x-3">
            {isAuthenticated ? (
              <div className="flex items-center space-x-2">
                <Link
                  to={dashboardPath}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-md text-white bg-blue-600 hover:bg-blue-700 shadow-sm"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Dashboard</span>
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-md text-xs"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Staff Login</span>
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="flex md:hidden">
            <button
              type="button"
              onClick={toggleMobileMenu}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none"
              aria-label="Toggle navigation"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile menu dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1 text-xs">
          <Link
            to="/"
            onClick={closeMobileMenu}
            className="block px-3 py-2 rounded-md font-medium text-slate-700 hover:bg-slate-50"
          >
            Home
          </Link>
          <Link
            to="/register-visit"
            onClick={closeMobileMenu}
            className="block px-3 py-2 rounded-md font-medium text-slate-700 hover:bg-slate-50"
          >
            Register Visit
          </Link>
          <Link
            to="/pass-lookup"
            onClick={closeMobileMenu}
            className="block px-3 py-2 rounded-md font-medium text-slate-700 hover:bg-slate-50"
          >
            Find Pass
          </Link>
          <div className="pt-2 border-t border-slate-100">
            {isAuthenticated ? (
              <div className="space-y-1">
                <Link
                  to={dashboardPath}
                  onClick={closeMobileMenu}
                  className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-md font-semibold text-white bg-blue-600"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Go to Dashboard</span>
                </Link>
                <button
                  type="button"
                  onClick={() => { logout(); closeMobileMenu(); }}
                  className="w-full text-center py-1.5 text-xs text-rose-600 hover:underline"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                onClick={closeMobileMenu}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-md font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Staff Login</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
