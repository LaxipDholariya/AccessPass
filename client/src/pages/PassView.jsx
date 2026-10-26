import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { publicApi } from '../services/api';
import { 
  ShieldCheck, 
  Printer, 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  XCircle,
  ArrowLeft,
  Lock,
  Unlock,
  KeyRound,
  Copy,
  Check,
  Building,
  Calendar,
  AlertCircle
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertMessage from '../components/AlertMessage';
import SEOHead from '../components/SEOHead';

export default function PassView() {
  const { referenceCode } = useParams();

  // Public Status State (unverified, zero PII, zero QR tokens)
  const [publicStatus, setPublicStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Verification & Unlocked State (requires verificationSecret)
  const [verificationSecret, setVerificationSecret] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [verifiedData, setVerifiedData] = useState(null);

  // Copy feedback state
  const [copiedRef, setCopiedRef] = useState(false);

  // 1. Fetch public status on mount or reference change
  const fetchStatus = async () => {
    setError('');
    try {
      const response = await publicApi.getVisitStatus(referenceCode);
      if (response.success && response.data) {
        setPublicStatus(response.data);
      } else {
        throw new Error(response.message || 'Visit request not found.');
      }
    } catch (err) {
      setError(err.message || 'Unable to retrieve visit status.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (referenceCode) {
      fetchStatus();
    }
  }, [referenceCode]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchStatus();
    // If already verified, re-verify with existing secret to refresh live badge
    if (verifiedData && verificationSecret) {
      try {
        const verifyRes = await publicApi.verifyVisitAccess(referenceCode, verificationSecret.trim());
        if (verifyRes.success && verifyRes.data) {
          setVerifiedData(verifyRes.data);
        }
      } catch {
        // Keep existing verified data if silent refresh encounters error
      }
    }
  };

  // 2. Handle Verification Secret submission
  const handleVerify = async (e) => {
    e.preventDefault();
    setVerificationError('');
    setIsVerifying(true);

    try {
      const response = await publicApi.verifyVisitAccess(referenceCode, verificationSecret.trim());
      if (response.success && response.data) {
        setVerifiedData(response.data);
        setVerificationError('');
      } else {
        throw new Error(response.message || 'Invalid visit reference or verification secret.');
      }
    } catch (err) {
      setVerificationError(err.message || 'Invalid visit reference or verification secret.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCopyRef = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(referenceCode);
      } else {
        const ta = document.createElement('textarea');
        ta.value = referenceCode;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleLockSession = () => {
    setVerifiedData(null);
    setVerificationSecret('');
    setVerificationError('');
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto my-16 text-center">
        <LoadingSpinner message="Checking visit records from database..." size="lg" />
      </div>
    );
  }

  if (error || !publicStatus) {
    return (
      <div className="max-w-md mx-auto my-16 px-4 text-center">
        <SEOHead
          title="Visit Not Found"
          description="The requested visit reference was not found in the AccessPass database."
          noIndex={true}
        />
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
          <XCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">Visit Reference Not Found</h1>
          <p className="text-sm text-slate-600 mb-6">{error || 'No matching visit record found.'}</p>
          <div className="space-y-2">
            <Link
              to="/pass-lookup"
              className="block w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm transition-colors"
            >
              Try Another Reference Code
            </Link>
            <Link to="/" className="block text-xs text-slate-500 hover:text-slate-800 pt-2">
              Back to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Use verified data if available, otherwise fallback to public safe status
  const currentStatus = verifiedData || publicStatus;
  const { 
    lifecycleStatus = 'Pending',
    requestedDate, 
    expectedStartTime, 
    expectedEndTime, 
    building, 
    rejectionReason,
    createdAt 
  } = currentStatus;

  const isApproved = lifecycleStatus === 'Approved' || lifecycleStatus === 'Inside';
  const hasDigitalPass = verifiedData && verifiedData.digitalPass;

  return (
    <div className="max-w-3xl mx-auto my-8 px-4 sm:px-6">
      <SEOHead
        title={`Visit Status - ${referenceCode}`}
        description="Check your visitor authorization status and unlock your digital pass."
        noIndex={true}
      />

      {/* Embedded Print Styling */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; }
          header, footer, nav, .print-hide { display: none !important; }
          #printable-card {
            border: 1px solid #cbd5e1 !important;
            box-shadow: none !important;
            margin: 0 auto !important;
            max-width: 100% !important;
          }
        }
      `}} />

      {/* Top action row */}
      <div className="flex items-center justify-between mb-6 print-hide">
        <Link to="/pass-lookup" className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900">
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Lookup Another Reference
        </Link>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Status
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center px-3.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 shadow-sm"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
            Print Card / PDF
          </button>
        </div>
      </div>

      {/* Main Status & Pass Card */}
      <div id="printable-card" className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm mb-6">
        
        {/* Pass Top Banner */}
        <div className="bg-slate-900 text-white px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">AccessPass Appointment Status</h1>
              <div className="flex items-center space-x-2 mt-0.5">
                <span className="text-xs text-slate-300 font-mono font-bold">
                  {referenceCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopyRef}
                  className="print-hide text-[10px] text-slate-400 hover:text-white inline-flex items-center space-x-1 border border-slate-700 rounded px-1.5 py-0.5"
                  title="Copy Reference Code"
                >
                  {copiedRef ? (
                    <>
                      <Check className="w-2.5 h-2.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-2.5 h-2.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          <div>
            <StatusBadge status={lifecycleStatus} />
          </div>
        </div>

        <div className="p-6 sm:p-8">

          {/* Lifecycle Status Banners */}
          {lifecycleStatus === 'Pending' && (
            <div className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-start space-x-3 text-sm text-amber-900">
              <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Appointment Awaiting Host Approval</strong>
                <p className="text-xs text-amber-800 mt-0.5">
                  Your appointment request has been submitted to the designated host for review. Once authorized, enter your verification secret below to unlock your scannable digital QR pass.
                </p>
              </div>
            </div>
          )}

          {lifecycleStatus === 'Rejected' && (
            <div className="mb-6 p-4 rounded-lg bg-rose-50 border border-rose-200 flex items-start space-x-3 text-sm text-rose-900">
              <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Visit Request Declined by Host</strong>
                <p className="text-xs text-rose-800 mt-0.5">
                  Host remarks: {rejectionReason || 'No specific rationale provided.'}
                </p>
              </div>
            </div>
          )}

          {lifecycleStatus === 'Approved' && !verifiedData && (
            <div className="mb-6 p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start space-x-3 text-sm text-emerald-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Visit Authorized by Host!</strong>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Your appointment has been approved and a digital pass has been issued. To protect your identity, personal details and your scannable QR badge are locked. Enter your Verification Secret below to unlock your badge.
                </p>
              </div>
            </div>
          )}

          {lifecycleStatus === 'Approved' && verifiedData && (
            <div className="mb-6 p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start space-x-3 text-sm text-emerald-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Visit Pass Active & Authorized</strong>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Present your scannable QR badge at the checkpoint when entering {building?.name || 'the building'}.
                </p>
              </div>
            </div>
          )}

          {lifecycleStatus === 'Inside' && (
            <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-300 flex items-start space-x-3 text-sm text-blue-900">
              <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Visitor Currently Checked In (On Premises)</strong>
                <p className="text-xs text-blue-800 mt-0.5">
                  Physical entry was authorized at the checkpoint. Please keep this pass ready for security inspection when exiting.
                </p>
              </div>
            </div>
          )}

          {lifecycleStatus === 'Exited' && (
            <div className="mb-6 p-4 rounded-lg bg-teal-50 border border-teal-200 flex items-start space-x-3 text-sm text-teal-900">
              <CheckCircle2 className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Visit Concluded (Checked Out)</strong>
                <p className="text-xs text-teal-800 mt-0.5">
                  Departure has been recorded at the security terminal. Thank you for visiting {building?.name || 'campus'}.
                </p>
              </div>
            </div>
          )}

          {lifecycleStatus === 'Expired' && (
            <div className="mb-6 p-4 rounded-lg bg-slate-100 border border-slate-300 flex items-start space-x-3 text-sm text-slate-800">
              <Clock className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Pass Validity Elapsed (Expired)</strong>
                <p className="text-xs text-slate-600 mt-0.5">
                  The valid time window for this visit has expired. This pass can no longer be used for building entry.
                </p>
              </div>
            </div>
          )}

          {lifecycleStatus === 'Revoked' && (
            <div className="mb-6 p-4 rounded-lg bg-rose-100 border border-rose-300 flex items-start space-x-3 text-sm text-rose-900">
              <XCircle className="w-5 h-5 text-rose-700 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Pass Revoked</strong>
                <p className="text-xs text-rose-800 mt-0.5">
                  This access pass has been revoked by campus administration. Checkpoint admission is strictly prohibited.
                </p>
              </div>
            </div>
          )}

          {/* Active QR Code Display (Only rendered when verified and pass is active) */}
          {hasDigitalPass && (lifecycleStatus === 'Approved' || lifecycleStatus === 'Inside') && (
            <div className="mb-8 p-6 bg-slate-50 border border-slate-200 rounded-xl text-center">
              <div className="inline-block p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
                <QRCodeSVG
                  value={verifiedData.digitalPass.qrPayload || verifiedData.digitalPass.passCode}
                  size={190}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <div className="mt-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Checkpoint Gate Security Token
                </span>
                <span className="font-mono text-xs sm:text-sm font-bold text-slate-900 bg-white px-3 py-1 rounded border border-slate-200 inline-block mt-1 select-all">
                  {verifiedData.digitalPass.passCode}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Present this scannable badge to the gate security officer at <strong>{building?.name}</strong>.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-center space-x-3 print-hide">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors"
                >
                  <Printer className="w-3.5 h-3.5 mr-1.5" />
                  Print Pass Badge
                </button>
              </div>
            </div>
          )}

          {/* Public Status Overview (Screenshot-friendly, ZERO PII) */}
          {!verifiedData && (
            <div className="space-y-4">
              <div className="border border-slate-200 rounded-lg p-5 bg-slate-50/50">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3 pb-2 border-b border-slate-200 flex items-center justify-between">
                  <span>Visit Schedule & Facility</span>
                  <span className="text-[10px] text-slate-400 normal-case font-normal">Public Status Summary</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 block">Scheduled Date</span>
                    <strong className="text-slate-800 text-sm">
                      {requestedDate ? new Date(requestedDate).toLocaleDateString() : 'N/A'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Expected Arrival Window</span>
                    <strong className="text-slate-800 text-sm">
                      {expectedStartTime} – {expectedEndTime}
                    </strong>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-500 block">Destination Facility</span>
                    <strong className="text-slate-800 text-sm">
                      {building?.name} ({building?.code})
                    </strong>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] text-slate-500 text-center">
                  🛡️ Public Status View: Visitor names, phone numbers, and scannable gate passes are protected and not displayed here.
                </div>
              </div>
            </div>
          )}

          {/* Verified Private Details Grid (Rendered only when visitor provides valid secret) */}
          {verifiedData && (
            <div className="space-y-6 pt-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center space-x-1.5 text-emerald-700 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Visitor Identity & Credentials Verified</span>
                </div>
                <button
                  type="button"
                  onClick={handleLockSession}
                  className="text-[11px] text-slate-500 hover:text-slate-800 underline print-hide"
                >
                  Lock Private Details
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                
                {/* Private Visitor Details */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100">
                    Visitor Identity
                  </h3>
                  <div>
                    <span className="text-xs text-slate-500 block">Full Legal Name</span>
                    <span className="font-semibold text-slate-900">{verifiedData.visitor.name}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Contact Phone</span>
                    <span className="text-slate-800">{verifiedData.visitor.phone}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Registered Email</span>
                    <span className="text-slate-800">{verifiedData.visitor.email}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Document Verified</span>
                    <span className="text-slate-800">{verifiedData.visitor.idProofType}</span>
                  </div>
                </div>

                {/* Destination & Schedule Details */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100">
                    Destination & Schedule
                  </h3>
                  <div>
                    <span className="text-xs text-slate-500 block">Facility & Address</span>
                    <span className="font-semibold text-slate-900">{verifiedData.building.name} ({verifiedData.building.code})</span>
                    <span className="text-xs text-slate-400 block">{verifiedData.building.address}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Designated Host</span>
                    <span className="text-slate-800">{verifiedData.host.name} ({verifiedData.host.email})</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Visit Date & Hours</span>
                    <span className="text-slate-800 font-medium">
                      {new Date(verifiedData.requestedDate).toLocaleDateString()} ({verifiedData.expectedStartTime} – {verifiedData.expectedEndTime})
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Stated Purpose</span>
                    <span className="text-slate-800 italic">{verifiedData.purpose}</span>
                  </div>
                </div>

              </div>

              {/* Pass Validity Window (if issued) */}
              {verifiedData.digitalPass && (
                <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex flex-col sm:flex-row justify-between">
                  <span>Pass Valid From: <strong>{new Date(verifiedData.digitalPass.validFrom).toLocaleString()}</strong></span>
                  <span>Pass Valid Until: <strong>{new Date(verifiedData.digitalPass.validUntil).toLocaleString()}</strong></span>
                </div>
              )}
            </div>
          )}

        </div>

      </div>

      {/* Verification Card (Displayed when visitor has not yet unlocked private details) */}
      {!verifiedData && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm print-hide">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                View Visit Details / QR Pass
              </h2>
              <p className="text-xs text-slate-500">
                Enter your private verification secret to unlock your personal appointment details and scannable digital badge.
              </p>
            </div>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            {verificationError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                <span>{verificationError}</span>
              </div>
            )}

            <div>
              <label htmlFor="verifySecret" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Private Verification Secret *
              </label>
              <input
                id="verifySecret"
                type="text"
                value={verificationSecret}
                onChange={(e) => setVerificationSecret(e.target.value.toUpperCase())}
                placeholder="e.g. SEC-8B9K-4C2M"
                required
                autoComplete="off"
                className="block w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 font-mono uppercase tracking-wider"
              />
              <p className="text-[11px] text-slate-500 mt-1.5">
                Enter the secret displayed upon visit registration. To prevent credential theft, verification attempts are rate-limited.
              </p>
            </div>

            <button
              type="submit"
              disabled={isVerifying || !verificationSecret.trim()}
              className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors flex items-center justify-center space-x-2 disabled:opacity-60"
            >
              {isVerifying ? (
                <span>Verifying Secret...</span>
              ) : (
                <>
                  <Unlock className="w-4 h-4 mr-1.5" />
                  <span>Verify Secret & Unlock Pass</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
