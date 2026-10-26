import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Heart } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Brand info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center space-x-2 text-white">
              <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="text-lg font-bold">AccessPass</span>
            </div>
            <p className="text-sm text-slate-400 max-w-sm">
              Digital Visitor Access Management System for academic campuses and commercial facilities.
              Streamlining visitor registration, host approvals, and verifiable security gate passes.
            </p>
            <p className="text-xs text-slate-500">
              Academic Assignment Project built with React, Tailwind CSS, Express, and MySQL.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-200 mb-3">
              Visitor Portal
            </h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <Link to="/register-visit" className="hover:text-white transition-colors">
                  Register New Visit
                </Link>
              </li>
              <li>
                <Link to="/pass-lookup" className="hover:text-white transition-colors">
                  Check Pass Status
                </Link>
              </li>
              <li>
                <Link to="/#features" className="hover:text-white transition-colors">
                  System Workflow
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom row */}
        <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© {currentYear} AccessPass. Developed for FSD College Project Submission.</p>
          <p className="flex items-center mt-2 sm:mt-0">
            Built with React & Express
          </p>
        </div>
      </div>
    </footer>
  );
}
