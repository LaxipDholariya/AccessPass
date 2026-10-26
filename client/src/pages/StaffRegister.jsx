import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { publicApi } from '../services/api';
import { 
  ShieldCheck, 
  UserPlus, 
  Building2, 
  Mail, 
  Phone, 
  BadgeCheck, 
  Lock, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import AlertMessage from '../components/AlertMessage';
import SEOHead from '../components/SEOHead';

export default function StaffRegister() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    staffId: '',
    requestedRole: 'host',
    buildingId: '',
    password: '',
    confirmPassword: '',
  });

  const [buildings, setBuildings] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submittedData, setSubmittedData] = useState(null);

  useEffect(() => {
    async function loadBuildings() {
      try {
        const response = await publicApi.getBuildings();
        if (response.success && response.data) {
          setBuildings(response.data);
        }
      } catch (err) {
        console.error('Failed to load buildings list:', err);
      }
    }
    loadBuildings();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.fullName.trim()) {
      errors.fullName = 'Full legal name is required.';
    }

    if (!formData.email.trim()) {
      errors.email = 'Official email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Please enter a valid official email address.';
    }

    if (!formData.phone.trim()) {
      errors.phone = 'Contact phone number is required.';
    } else if (!/^[0-9+()\- ]{7,20}$/.test(formData.phone.trim())) {
      errors.phone = 'Please enter a valid phone number (digits, hyphens, or country code).';
    }

    if (!formData.staffId.trim()) {
      errors.staffId = 'Staff ID / Employee number is required.';
    } else if (formData.staffId.trim().length < 3) {
      errors.staffId = 'Staff ID must be at least 3 characters.';
    }

    if (!['host', 'security'].includes(formData.requestedRole)) {
      errors.requestedRole = 'Select a valid requested role (Host or Security).';
    }

    if (!formData.password) {
      errors.password = 'Password is required.';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters long.';
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setFieldErrors({});

    const clientValidationErrors = validateForm();
    if (Object.keys(clientValidationErrors).length > 0) {
      setFieldErrors(clientValidationErrors);
      setErrorMessage('Please fix the highlighted errors before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        staffId: formData.staffId.trim().toUpperCase(),
        requestedRole: formData.requestedRole,
        buildingId: formData.buildingId ? Number(formData.buildingId) : null,
        password: formData.password,
      };

      const response = await publicApi.registerStaff(payload);

      if (response.success) {
        setSubmittedData({
          fullName: response.data.fullName,
          email: response.data.email,
          staffId: response.data.staffId,
          requestedRole: response.data.requestedRole,
          approvalStatus: response.data.approvalStatus,
          message: response.message,
        });
      } else {
        setErrorMessage(response.message || 'Staff registration request could not be completed.');
      }
    } catch (err) {
      const apiData = err.data;
      if (apiData && apiData.field) {
        setFieldErrors({ [apiData.field]: apiData.message });
        setErrorMessage(apiData.message);
      } else {
        setErrorMessage(err.message || 'Failed to submit staff registration request.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmittedData(null);
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      staffId: '',
      requestedRole: 'host',
      buildingId: '',
      password: '',
      confirmPassword: '',
    });
    setFieldErrors({});
    setErrorMessage('');
  };

  return (
    <div className="min-h-[85vh] py-10 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <SEOHead
        title="Staff Registration"
        description="Request an internal AccessPass staff account for campus hosts or security officers. Subject to administrator verification."
        canonicalPath="/staff-register"
      />

      <div className="max-w-2xl mx-auto">
        
        {/* Header Banner */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center mx-auto mb-3 shadow-sm">
            <UserPlus className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Staff Account Registration</h1>
          <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
            Internal credential registration for campus faculty hosts and gate security personnel.
          </p>
        </div>

        {/* Success Confirmation Card */}
        {submittedData ? (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden p-6 sm:p-8 animate-fadeIn">
            <div className="flex items-start space-x-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 mb-1">
                  Status: Pending Administrator Approval
                </span>
                <h2 className="text-lg font-bold text-slate-900">Application Submitted Successfully</h2>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Your registration request has been queued for review. In accordance with campus security policy, staff accounts remain inactive until an authorized Administrator validates your credentials and authorizes your system privileges.
                </p>
              </div>
            </div>

            {/* Application Summary Box */}
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 mb-6 text-xs space-y-2.5">
              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500 font-medium">Applicant Name:</span>
                <span className="text-slate-900 font-semibold">{submittedData.fullName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500 font-medium">Staff ID:</span>
                <span className="text-slate-900 font-mono font-bold">{submittedData.staffId}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500 font-medium">Official Email:</span>
                <span className="text-slate-900 font-mono">{submittedData.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Requested Role:</span>
                <span className="text-slate-900 font-semibold capitalize bg-slate-200/70 px-2 py-0.5 rounded">
                  {submittedData.requestedRole}
                </span>
              </div>
            </div>

            {/* Informational Guidance */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3.5 mb-6 text-xs text-blue-800 flex items-start space-x-2.5">
              <ShieldAlert className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block mb-0.5">What happens next?</span>
                An IT Administrator will review your Staff ID against campus directory records. Once approved, your account will be activated and you can sign in directly using your registered email and password.
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={handleReset}
                className="w-full sm:w-auto px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Register Another Staff Member
              </button>
              <Link
                to="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors"
              >
                <span>Proceed to Staff Login</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Link>
            </div>
          </div>
        ) : (
          /* Staff Registration Form */
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 sm:p-8">
            
            {/* Policy Notice Box */}
            <div className="mb-6 bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs text-slate-600 flex items-start space-x-2.5">
              <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-800">Authorization Notice:</span> Public visitor accounts cannot be registered here. Staff registrations undergo administrator approval prior to activation. Administrator accounts cannot be self-requested.
              </div>
            </div>

            <AlertMessage type="error" message={errorMessage} onClose={() => setErrorMessage('')} />

            <form onSubmit={handleSubmit} className="space-y-4 text-xs" noValidate>
              
              {/* Full Legal Name */}
              <div>
                <label htmlFor="fullName" className="block font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Full Legal Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="e.g. Prof. Rajesh Varma or Officer S. Pillai"
                  className={`w-full px-3 py-2 text-xs border rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-1 ${
                    fieldErrors.fullName ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-300 focus:ring-blue-600'
                  }`}
                />
                {fieldErrors.fullName && (
                  <p className="mt-1 text-[11px] text-rose-600 font-medium">{fieldErrors.fullName}</p>
                )}
              </div>

              {/* Staff ID & Requested Role Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="staffId" className="block font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Staff ID / Employee No. <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <BadgeCheck className="w-4 h-4" />
                    </div>
                    <input
                      id="staffId"
                      name="staffId"
                      type="text"
                      required
                      value={formData.staffId}
                      onChange={handleChange}
                      placeholder="e.g. STF-FAC-042"
                      className={`w-full pl-9 pr-3 py-2 text-xs font-mono uppercase border rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-1 ${
                        fieldErrors.staffId ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-300 focus:ring-blue-600'
                      }`}
                    />
                  </div>
                  {fieldErrors.staffId && (
                    <p className="mt-1 text-[11px] text-rose-600 font-medium">{fieldErrors.staffId}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="requestedRole" className="block font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Requested Role <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="requestedRole"
                    name="requestedRole"
                    value={formData.requestedRole}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 text-xs border rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-1 ${
                      fieldErrors.requestedRole ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-300 focus:ring-blue-600'
                    }`}
                  >
                    <option value="host">Host (Faculty / Staff Member)</option>
                    <option value="security">Security Officer (Gate Guard)</option>
                  </select>
                  {fieldErrors.requestedRole && (
                    <p className="mt-1 text-[11px] text-rose-600 font-medium">{fieldErrors.requestedRole}</p>
                  )}
                </div>
              </div>

              {/* Official Email Address */}
              <div>
                <label htmlFor="email" className="block font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Official Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="name@accesspass.local"
                    className={`w-full pl-9 pr-3 py-2 text-xs border rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-1 ${
                      fieldErrors.email ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-300 focus:ring-blue-600'
                    }`}
                  />
                </div>
                {fieldErrors.email && (
                  <p className="mt-1 text-[11px] text-rose-600 font-medium">{fieldErrors.email}</p>
                )}
              </div>

              {/* Phone Number & Assigned Building */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="phone" className="block font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Contact Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+91-9876543210"
                      className={`w-full pl-9 pr-3 py-2 text-xs border rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-1 ${
                        fieldErrors.phone ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-300 focus:ring-blue-600'
                      }`}
                    />
                  </div>
                  {fieldErrors.phone && (
                    <p className="mt-1 text-[11px] text-rose-600 font-medium">{fieldErrors.phone}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="buildingId" className="block font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Primary Building / Facility
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <select
                      id="buildingId"
                      name="buildingId"
                      value={formData.buildingId}
                      onChange={handleChange}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                    >
                      <option value="">Campus-Wide / Unassigned</option>
                      {buildings.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label htmlFor="password" className="block font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Account Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      minLength={6}
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Minimum 6 characters"
                      className={`w-full pl-9 pr-3 py-2 text-xs border rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-1 ${
                        fieldErrors.password ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-300 focus:ring-blue-600'
                      }`}
                    />
                  </div>
                  {fieldErrors.password && (
                    <p className="mt-1 text-[11px] text-rose-600 font-medium">{fieldErrors.password}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Confirm Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      required
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Re-type password"
                      className={`w-full pl-9 pr-3 py-2 text-xs border rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-1 ${
                        fieldErrors.confirmPassword ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-300 focus:ring-blue-600'
                      }`}
                    />
                  </div>
                  {fieldErrors.confirmPassword && (
                    <p className="mt-1 text-[11px] text-rose-600 font-medium">{fieldErrors.confirmPassword}</p>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center py-2.5 px-4 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <span>Submitting Request...</span>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      <span>Submit Staff Registration Request</span>
                    </>
                  )}
                </button>
              </div>

              {/* Auxiliary Navigation */}
              <div className="pt-4 text-center border-t border-slate-200">
                <span className="text-slate-500">Already registered and approved? </span>
                <Link to="/login" className="text-blue-600 font-semibold hover:underline">
                  Sign in here
                </Link>
              </div>

            </form>
          </div>
        )}

      </div>
    </div>
  );
}
