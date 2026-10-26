import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { publicApi } from '../services/api';
import { 
  ShieldCheck, 
  UserPlus, 
  Building, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  Copy,
  Check,
  Printer,
  Lock,
  KeyRound
} from 'lucide-react';
import AlertMessage from '../components/AlertMessage';
import LoadingSpinner from '../components/LoadingSpinner';
import SEOHead from '../components/SEOHead';

export default function RegisterVisit() {
  const navigate = useNavigate();

  const [copiedRef, setCopiedRef] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Form fields
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    idProofType: 'National ID',
    idProofNumber: '',
    buildingId: '',
    hostUserId: '',
    purpose: '',
    requestedDate: new Date().toISOString().split('T')[0],
    expectedStartTime: '09:00',
    expectedEndTime: '13:00',
  });

  // Dynamic dropdown data
  const [buildings, setBuildings] = useState([]);
  const [hosts, setHosts] = useState([]);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(true);

  // Submission status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [successInfo, setSuccessInfo] = useState(null);

  // 1. Load active buildings on mount
  useEffect(() => {
    async function loadBuildings() {
      try {
        const response = await publicApi.getBuildings();
        if (response.success && response.data.length > 0) {
          setBuildings(response.data);
          // Set first building as default
          setFormData((prev) => ({ ...prev, buildingId: String(response.data[0].id) }));
        }
      } catch (err) {
        setErrorMessage('Failed to load active buildings list from server.');
      } finally {
        setIsLoadingMetadata(false);
      }
    }
    loadBuildings();
  }, []);

  // 2. Load hosts whenever selected building changes
  useEffect(() => {
    async function loadHosts() {
      if (!formData.buildingId) return;

      try {
        const response = await publicApi.getHosts(formData.buildingId);
        if (response.success) {
          setHosts(response.data);
          if (response.data.length > 0) {
            setFormData((prev) => ({ ...prev, hostUserId: String(response.data[0].id) }));
          } else {
            setFormData((prev) => ({ ...prev, hostUserId: '' }));
          }
        }
      } catch (err) {
        console.error('Failed to load hosts for building:', err);
      }
    }

    loadHosts();
  }, [formData.buildingId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      // Format start and end time with seconds for MySQL TIME field
      const payload = {
        ...formData,
        expectedStartTime: formData.expectedStartTime.length === 5 ? `${formData.expectedStartTime}:00` : formData.expectedStartTime,
        expectedEndTime: formData.expectedEndTime.length === 5 ? `${formData.expectedEndTime}:00` : formData.expectedEndTime,
      };

      const response = await publicApi.registerVisit(payload);

      if (response.success && response.data) {
        setSuccessInfo(response.data);
      } else {
        throw new Error(response.message || 'Registration failed.');
      }
    } catch (err) {
      const msg = err.message || 'Could not complete registration. Please check inputs.';
      setErrorMessage(msg);
      if (err.data?.field) {
        setFieldErrors({ [err.data.field]: msg });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = async (text, type) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers or non-secure contexts
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      if (type === 'ref') {
        setCopiedRef(true);
        setTimeout(() => setCopiedRef(false), 2000);
      } else {
        setCopiedSecret(true);
        setTimeout(() => setCopiedSecret(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // If successfully registered, show confirmation screen with dedicated save credentials & confirmation card
  if (successInfo) {
    return (
      <div className="max-w-2xl mx-auto my-10 px-4">
        <SEOHead
          title="Registration Confirmation"
          description="Your visitor appointment request has been submitted successfully and is awaiting host authorization."
          noIndex={true}
        />

        {/* Global Print Style for clean confirmation card printout */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body { background: white !important; }
            header, footer, nav, .print-hide { display: none !important; }
            #printable-confirmation { 
              box-shadow: none !important; 
              border: 1px solid #cbd5e1 !important; 
              margin: 0 auto !important;
              max-width: 100% !important;
            }
          }
        `}} />

        {/* Success Header */}
        <div className="text-center mb-6 print-hide">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 border border-emerald-200">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Registration Submitted!</h1>
          <p className="text-sm text-slate-600 mt-1">
            Your appointment request has been recorded and is currently awaiting host review.
          </p>
        </div>

        {/* Dedicated "Save Your Visit Reference" Area */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mb-6 print-hide">
          <div className="flex items-center space-x-2 pb-3 mb-4 border-b border-slate-100">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              Save Your Visit Reference & Verification Secret
            </h2>
          </div>

          <p className="text-xs text-slate-600 mb-4 leading-relaxed">
            AccessPass does not use visitor accounts. Please copy and save both credentials below immediately. Your Visit Reference is used for public status tracking, while your Verification Secret is strictly private and required to unlock your scannable digital badge.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Box 1: Public Visit Reference */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                  Public Visit Reference
                </span>
                <span className="text-lg font-mono font-bold text-blue-600 block mt-1 tracking-wide select-all">
                  {successInfo.referenceCode}
                </span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Use this reference code to check your visit review status.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => handleCopy(successInfo.referenceCode, 'ref')}
                  className="w-full inline-flex items-center justify-center px-3 py-1.5 rounded-md text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition-colors"
                >
                  {copiedRef ? (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                      <span className="text-emerald-600 font-bold">Copied Reference!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 mr-1.5" />
                      <span>Copy Reference Code</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Box 2: Private Verification Secret */}
            <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 block">
                    Private Verification Secret
                  </span>
                </div>
                <span className="text-lg font-mono font-bold text-amber-900 block mt-1 tracking-wide select-all">
                  {successInfo.verificationSecret}
                </span>
                <p className="text-[11px] text-amber-800 mt-1">
                  Keep this private! Required to unlock your scannable QR badge.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-amber-200">
                <button
                  type="button"
                  onClick={() => handleCopy(successInfo.verificationSecret, 'secret')}
                  className="w-full inline-flex items-center justify-center px-3 py-1.5 rounded-md text-xs font-semibold text-amber-900 bg-white hover:bg-amber-100/50 border border-amber-300 transition-colors"
                >
                  {copiedSecret ? (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Copied Secret!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 mr-1.5" />
                      <span>Copy Verification Secret</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-start space-x-2">
            <Lock className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Security Guarantee:</strong> Your verification secret is never stored in plain text and cannot be retrieved once you leave this page. Store it safely now.
            </span>
          </div>
        </div>

        {/* Screenshot-Friendly Confirmation Card */}
        {/* Strictly contains ONLY: Visit Reference, Submission Date/Time, Status, and Schedule/Facility. ZERO ID numbers, phone numbers or personal secrets! */}
        <div 
          id="printable-confirmation"
          className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-sm mb-6 print:border-slate-400"
        >
          <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center font-bold">
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">AccessPass Visit Confirmation</h3>
                <span className="block text-[10px] text-slate-400 font-mono">OFFICIAL VISIT APPOINTMENT SLIP</span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded text-xs font-semibold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Pending Host Review
            </span>
          </div>

          <div className="p-6 space-y-4 text-sm">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <span className="text-xs uppercase font-semibold text-slate-500">Visit Reference</span>
              <span className="text-base font-mono font-bold text-blue-600">{successInfo.referenceCode}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block">Current Status</span>
                <strong className="text-slate-800 text-sm">Pending Host Approval</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Submitted Timestamp</span>
                <strong className="text-slate-800">
                  {new Date(successInfo.createdAt || Date.now()).toLocaleString()}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Scheduled Visit Date</span>
                <strong className="text-slate-800">{successInfo.requestedDate}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Scheduled Time Window</span>
                <strong className="text-slate-800">
                  {successInfo.expectedStartTime} – {successInfo.expectedEndTime}
                </strong>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-500 block">Target Facility / Building</span>
                <strong className="text-slate-800">{successInfo.buildingName || 'Authorized Campus Building'}</strong>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 text-center">
              Screenshot or print this card. Personal identity numbers, contact details, and private verification secrets are omitted for your protection.
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 print-hide">
          <button
            type="button"
            onClick={handlePrint}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4 mr-2 text-slate-600" />
            Print / Save as PDF
          </button>
          <Link
            to={`/pass/${successInfo.referenceCode}`}
            className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
          >
            Track Pass Status Now →
          </Link>
          <button
            type="button"
            onClick={() => {
              setSuccessInfo(null);
              setFormData({
                fullName: '',
                email: '',
                phone: '',
                idProofType: 'National ID',
                idProofNumber: '',
                buildingId: buildings.length > 0 ? String(buildings[0].id) : '',
                hostUserId: '',
                purpose: '',
                requestedDate: new Date().toISOString().split('T')[0],
                expectedStartTime: '09:00',
                expectedEndTime: '13:00',
              });
            }}
            className="w-full sm:w-auto text-xs text-slate-500 hover:text-slate-800 py-2 sm:px-3 text-center"
          >
            Register Another Visit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto my-10 px-4 sm:px-6">
      <SEOHead
        title="Visitor Access Registration"
        description="Register your visit in advance for campus buildings and obtain host authorization with AccessPass."
        canonicalPath="/register-visit"
      />
      
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Visitor Access Registration</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Submit your personal and visit details for pre-authorized campus building access.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm">
        
        <AlertMessage type="error" message={errorMessage} onClose={() => setErrorMessage('')} />

        {isLoadingMetadata ? (
          <LoadingSpinner message="Loading building and host directory..." />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* 1. Personal Identity Details */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 pb-2 border-b border-slate-100 mb-4">
                1. Visitor Contact & Identity
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div className="sm:col-span-2">
                  <label htmlFor="fullName" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Legal Full Name *
                  </label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="e.g. Ananya Roy"
                    className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Email Address *
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="ananya@example.com"
                    className={`block w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-1 ${
                      fieldErrors.email
                        ? 'border-rose-400 focus:ring-rose-500 focus:border-rose-500 bg-rose-50/20'
                        : 'border-slate-300 focus:ring-blue-600 focus:border-blue-600'
                    }`}
                  />
                  {fieldErrors.email && (
                    <p className="mt-1 text-xs text-rose-600">{fieldErrors.email}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="phone" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Phone Number *
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+91-9876543210"
                    className={`block w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-1 ${
                      fieldErrors.phone
                        ? 'border-rose-400 focus:ring-rose-500 focus:border-rose-500 bg-rose-50/20'
                        : 'border-slate-300 focus:ring-blue-600 focus:border-blue-600'
                    }`}
                  />
                  {fieldErrors.phone && (
                    <p className="mt-1 text-xs text-rose-600">{fieldErrors.phone}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="idProofType" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    ID Proof Type *
                  </label>
                  <select
                    id="idProofType"
                    name="idProofType"
                    value={formData.idProofType}
                    onChange={handleChange}
                    className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                  >
                    <option value="National ID">National ID / Aadhaar</option>
                    <option value="Passport">Passport</option>
                    <option value="Driving License">Driving License</option>
                    <option value="Student ID">Student / College ID</option>
                    <option value="Other">Other Official ID</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="idProofNumber" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    ID Document Number
                  </label>
                  <input
                    id="idProofNumber"
                    name="idProofNumber"
                    type="text"
                    value={formData.idProofNumber}
                    onChange={handleChange}
                    placeholder="e.g. DL-2026-99001"
                    className={`block w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-1 ${
                      fieldErrors.idProofNumber
                        ? 'border-rose-400 focus:ring-rose-500 focus:border-rose-500 bg-rose-50/20'
                        : 'border-slate-300 focus:ring-blue-600 focus:border-blue-600'
                    }`}
                  />
                  {fieldErrors.idProofNumber && (
                    <p className="mt-1 text-xs text-rose-600">{fieldErrors.idProofNumber}</p>
                  )}
                </div>

              </div>
            </div>

            {/* 2. Destination & Host Assignment */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 pb-2 border-b border-slate-100 mb-4">
                2. Destination & Host Assignment
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div>
                  <label htmlFor="buildingId" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Target Building / Facility *
                  </label>
                  <select
                    id="buildingId"
                    name="buildingId"
                    required
                    value={formData.buildingId}
                    onChange={handleChange}
                    className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                  >
                    {buildings.map((bldg) => (
                      <option key={bldg.id} value={bldg.id}>
                        {bldg.name} ({bldg.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="hostUserId" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Designated Host *
                  </label>
                  <select
                    id="hostUserId"
                    name="hostUserId"
                    required
                    value={formData.hostUserId}
                    onChange={handleChange}
                    className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                  >
                    {hosts.length === 0 ? (
                      <option value="">No hosts available for this building</option>
                    ) : (
                      hosts.map((host) => (
                        <option key={host.id} value={host.id}>
                          {host.full_name} ({host.email})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="purpose" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Purpose of Visit *
                  </label>
                  <input
                    id="purpose"
                    name="purpose"
                    type="text"
                    required
                    value={formData.purpose}
                    onChange={handleChange}
                    placeholder="e.g. Academic project consultation, lab inspection, or meeting"
                    className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>

              </div>
            </div>

            {/* 3. Date & Time Window */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 pb-2 border-b border-slate-100 mb-4">
                3. Scheduled Visit Timing
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                <div>
                  <label htmlFor="requestedDate" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Visit Date *
                  </label>
                  <input
                    id="requestedDate"
                    name="requestedDate"
                    type="date"
                    required
                    value={formData.requestedDate}
                    onChange={handleChange}
                    className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>

                <div>
                  <label htmlFor="expectedStartTime" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Expected Arrival *
                  </label>
                  <input
                    id="expectedStartTime"
                    name="expectedStartTime"
                    type="time"
                    required
                    value={formData.expectedStartTime}
                    onChange={handleChange}
                    className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>

                <div>
                  <label htmlFor="expectedEndTime" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Expected Departure *
                  </label>
                  <input
                    id="expectedEndTime"
                    name="expectedEndTime"
                    type="time"
                    required
                    value={formData.expectedEndTime}
                    onChange={handleChange}
                    className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>

              </div>
            </div>

            {/* Submit Bar */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <Link to="/" className="text-xs text-slate-500 hover:text-slate-800">
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting || hosts.length === 0}
                className="inline-flex items-center px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-colors disabled:opacity-60"
              >
                {isSubmitting ? (
                  <span>Transmitting Request...</span>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    <span>Submit Visit Request</span>
                  </>
                )}
              </button>
            </div>

          </form>
        )}

      </div>

    </div>
  );
}
