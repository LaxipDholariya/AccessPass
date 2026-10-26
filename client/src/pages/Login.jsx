import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, LogIn, Lock, Mail, ArrowRight } from 'lucide-react';
import AlertMessage from '../components/AlertMessage';
import SEOHead from '../components/SEOHead';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both your email address and password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const user = await login(email, password);
      
      // Determine redirection route
      const fromPath = location.state?.from?.pathname;
      if (fromPath && fromPath !== '/login') {
        navigate(fromPath, { replace: true });
        return;
      }

      // Default role landing pages
      if (user.role === 'admin') navigate('/admin/dashboard', { replace: true });
      else if (user.role === 'host') navigate('/host/requests', { replace: true });
      else if (user.role === 'security') navigate('/security/terminal', { replace: true });
      else navigate('/', { replace: true });

    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick helper to fill demo credentials during examiner review
  const handleDemoFill = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('Password123!');
    setError('');
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-50">
      <SEOHead
        title="Staff Portal Login"
        description="Secure staff authentication portal for faculty hosts, gate security guards, and system administrators."
        canonicalPath="/login"
      />
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center mx-auto mb-3 shadow-sm">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Staff Portal Login</h1>
          <p className="mt-1 text-xs text-slate-500">
            Internal access for Administrators, Faculty Hosts, and Security Officers
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-slate-200 sm:rounded-xl sm:px-10">
          
          <AlertMessage type="error" message={error} onClose={() => setError('')} />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Official Email Address
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@accesspass.local"
                  required
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-colors disabled:opacity-60"
            >
              {isSubmitting ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  <span>Authenticate</span>
                </>
              )}
            </button>
          </form>

          {/* Development Quick-Fill Bar */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Demo Credentials (Password: Password123!)
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleDemoFill('admin@accesspass.local')}
                className="text-left px-2 py-1.5 rounded border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium"
              >
                👔 Admin
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('prof.sharma@accesspass.local')}
                className="text-left px-2 py-1.5 rounded border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium"
              >
                👨‍🏫 Host (Sharma)
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('guard.ramesh@accesspass.local')}
                className="text-left px-2 py-1.5 rounded border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium"
              >
                👮 Security (Ramesh)
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('dr.patel@accesspass.local')}
                className="text-left px-2 py-1.5 rounded border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium"
              >
                👩‍🏫 Host (Patel)
              </button>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-200 text-center space-y-2">
            <p className="text-xs text-slate-600">
              New faculty or security officer?{' '}
              <Link to="/staff-register" className="font-semibold text-blue-600 hover:underline">
                Request Staff Access
              </Link>
            </p>
            <div>
              <Link to="/" className="text-xs text-slate-500 hover:text-slate-800 hover:underline">
                ← Return to Public Homepage
              </Link>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
