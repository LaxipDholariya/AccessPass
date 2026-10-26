import React, { useState, useEffect } from 'react';
import { securityApi } from '../../services/api';
import { 
  QrCode, 
  Search, 
  CheckCircle2, 
  LogIn, 
  LogOut, 
  RefreshCw,
  ShieldAlert,
  Camera,
  XCircle,
  Clock,
  Ban,
  Building,
  AlertTriangle
} from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import AlertMessage from '../../components/AlertMessage';
import QRCameraScanner from '../../components/QRCameraScanner';

export default function SecurityTerminal() {
  const [codeInput, setCodeInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [verificationError, setVerificationError] = useState(null);

  // Camera scanner visibility
  const [showCameraScanner, setShowCameraScanner] = useState(false);

  // Gate action states
  const [gateName, setGateName] = useState('Main Gate');
  const [remarks, setRemarks] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);

  // Today's Checkpoint Activity
  const [todayLogs, setTodayLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);

  const fetchTodayLogs = async () => {
    try {
      const response = await securityApi.getTodayLogs();
      if (response.success) {
        setTodayLogs(response.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch today logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchTodayLogs();
  }, []);

  const verifyPassCode = async (codeToVerify) => {
    const clean = (codeToVerify || codeInput).trim();
    if (!clean) return;

    setIsVerifying(true);
    setVerificationResult(null);
    setVerificationError(null);
    setActionFeedback(null);

    try {
      const response = await securityApi.verifyPass(clean);
      if (response.success && response.data) {
        setVerificationResult(response.data);
      } else {
        throw new Error(response.message || 'Pass verification rejected.');
      }
    } catch (err) {
      const errData = err.data || {};
      setVerificationError({
        alertType: errData.alertType || 'INVALID',
        message: errData.message || err.message || 'Verification check failed. Pass invalid or unapproved.',
        visitor: errData.visitor,
        targetBuilding: errData.targetBuilding,
      });
      setVerificationResult(null);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifySubmit = (e) => {
    if (e) e.preventDefault();
    verifyPassCode(codeInput);
  };

  const handleCameraScanSuccess = (scannedText) => {
    setCodeInput(scannedText);
    setShowCameraScanner(false);
    verifyPassCode(scannedText);
  };

  const handleCheckIn = async () => {
    if (!verificationResult) return;
    setIsActionLoading(true);
    setActionFeedback(null);

    try {
      const response = await securityApi.checkIn(
        verificationResult.passId,
        gateName,
        remarks
      );
      if (response.success) {
        setActionFeedback({
          type: 'success',
          message: `Check-in recorded! ${verificationResult.visitor.name} authorized to enter premises.`,
        });
        // Re-verify to flip state to "inside"
        verifyPassCode(verificationResult.passCode);
        fetchTodayLogs();
        setRemarks('');
      }
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Failed to record entry log.',
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!verificationResult) return;
    setIsActionLoading(true);
    setActionFeedback(null);

    try {
      const response = await securityApi.checkOut(
        verificationResult.passId,
        gateName,
        remarks
      );
      if (response.success) {
        setActionFeedback({
          type: 'success',
          message: `Check-out recorded! ${verificationResult.visitor.name} has departed safely.`,
        });
        // Re-verify to update state
        verifyPassCode(verificationResult.passCode);
        fetchTodayLogs();
        setRemarks('');
      }
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Failed to record check-out log.',
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Security Gate Checkpoint</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Verify digital QR tokens via camera scan or manual code lookup to log physical arrival and departure.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCameraScanner((prev) => !prev)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto"
        >
          <Camera className="w-4 h-4 mr-1.5" />
          <span>{showCameraScanner ? 'Close Camera' : 'Open Camera Scanner'}</span>
        </button>
      </div>

      {/* Live Camera Scanner Box */}
      {showCameraScanner && (
        <div className="mb-6">
          <QRCameraScanner
            onScan={handleCameraScanSuccess}
            onClose={() => setShowCameraScanner(false)}
          />
        </div>
      )}

      {/* Pass Scan & Verification Form */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4 flex items-center">
          <QrCode className="w-4 h-4 mr-1.5 text-blue-600" />
          Pass Token / Reference Scanner
        </h2>

        <form onSubmit={handleVerifySubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="Scan QR or enter token (e.g. PASS-TOK-... or AP-2026-X8B9K)"
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 font-mono uppercase"
            />
          </div>

          <button
            type="submit"
            disabled={isVerifying || !codeInput.trim()}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors disabled:opacity-60"
          >
            {isVerifying ? 'Verifying...' : 'Verify Pass'}
          </button>
        </form>

        {/* Explicit Invalid Result Banner */}
        {verificationError && (
          <div className="mt-5 border border-rose-300 bg-rose-50 rounded-xl p-5 shadow-sm">
            <div className="flex items-start space-x-3">
              {verificationError.alertType === 'BLACKLISTED' ? (
                <ShieldAlert className="w-6 h-6 text-rose-700 flex-shrink-0 mt-0.5" />
              ) : verificationError.alertType === 'REVOKED' ? (
                <Ban className="w-6 h-6 text-rose-700 flex-shrink-0 mt-0.5" />
              ) : verificationError.alertType === 'EXPIRED' ? (
                <Clock className="w-6 h-6 text-amber-700 flex-shrink-0 mt-0.5" />
              ) : verificationError.alertType === 'WRONG_BUILDING' ? (
                <Building className="w-6 h-6 text-amber-700 flex-shrink-0 mt-0.5" />
              ) : verificationError.alertType === 'NOT_APPROVED' ? (
                <Clock className="w-6 h-6 text-amber-700 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-6 h-6 text-rose-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-grow">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-sm tracking-wide uppercase text-rose-950">
                    INVALID PASS — ACCESS DENIED
                  </span>
                  <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-rose-200 text-rose-800 border border-rose-300">
                    {verificationError.alertType}
                  </span>
                </div>
                <p className="text-xs text-rose-900 mt-1 font-medium">
                  {verificationError.message}
                </p>
                {verificationError.visitor && (
                  <p className="text-[11px] text-rose-800 mt-1">
                    Visitor: <strong>{verificationError.visitor.name}</strong> ({verificationError.visitor.phone})
                  </p>
                )}
                {verificationError.targetBuilding && (
                  <p className="text-[11px] text-rose-800 mt-1">
                    Destination Facility: <strong>{verificationError.targetBuilding}</strong>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Verification Result Card */}
      {verificationResult && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          
          {/* Status Verdict Banner */}
          <div
            className={`px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-white ${
              verificationResult.isCurrentlyInside ? 'bg-blue-800' : 'bg-emerald-800'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <CheckCircle2 className="w-6 h-6 text-white" />
              <div>
                <span className="text-sm font-bold block uppercase tracking-wider">
                  {verificationResult.isCurrentlyInside
                    ? 'VALID PASS — VISITOR CURRENTLY ON PREMISES'
                    : 'VALID PASS — AUTHORIZED FOR ENTRY'}
                </span>
                <span className="text-xs opacity-90">
                  {verificationResult.isCurrentlyInside
                    ? `Checked in at ${new Date(verificationResult.checkedInAt).toLocaleTimeString()}`
                    : `Valid until ${new Date(verificationResult.validUntil).toLocaleTimeString()}`}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <StatusBadge status={verificationResult.lifecycleStatus} />
              <span className="font-mono text-xs bg-white/20 px-3 py-1 rounded">
                REF: {verificationResult.referenceCode}
              </span>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            
            {actionFeedback && (
              <AlertMessage
                type={actionFeedback.type}
                message={actionFeedback.message}
                onClose={() => setActionFeedback(null)}
              />
            )}

            {/* Visitor and Appointment Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs text-slate-600 border-b border-slate-100 pb-6">
              <div>
                <span className="text-slate-400 uppercase font-semibold block mb-1">Visitor</span>
                <strong className="text-sm text-slate-900 block">{verificationResult.visitor.name}</strong>
                <span>{verificationResult.visitor.phone}</span>
                <span className="block text-slate-500">{verificationResult.visitor.idProofType} ({verificationResult.visitor.idProofNumber || 'N/A'})</span>
              </div>

              <div>
                <span className="text-slate-400 uppercase font-semibold block mb-1">Assigned Facility</span>
                <strong className="text-sm text-slate-900 block">{verificationResult.building.name} ({verificationResult.building.code})</strong>
                <span>Host: {verificationResult.host.name} ({verificationResult.host.phone || 'N/A'})</span>
              </div>

              <div>
                <span className="text-slate-400 uppercase font-semibold block mb-1">Pass Validity Window</span>
                <strong className="text-sm text-slate-900 block">
                  {new Date(verificationResult.validUntil).toLocaleDateString()}
                </strong>
                <span className="text-slate-700 block">
                  {new Date(verificationResult.validFrom).toLocaleTimeString()} – {new Date(verificationResult.validUntil).toLocaleTimeString()}
                </span>
              </div>

              <div>
                <span className="text-slate-400 uppercase font-semibold block mb-1">Visit Purpose</span>
                <p className="text-slate-800 italic bg-slate-50 p-2.5 rounded border border-slate-200">
                  {verificationResult.purpose}
                </p>
              </div>
            </div>

            {/* Checkpoint Gate Actions */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                Checkpoint Operation
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div>
                  <label htmlFor="gateName" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Checkpoint Gate
                  </label>
                  <input
                    id="gateName"
                    type="text"
                    value={gateName}
                    onChange={(e) => setGateName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="gateRemarks" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Security Remarks / ID Check Notes
                  </label>
                  <input
                    id="gateRemarks"
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="e.g. Identity verified; laptop serial recorded"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {verificationResult.canCheckIn && (
                  <button
                    type="button"
                    onClick={handleCheckIn}
                    disabled={isActionLoading}
                    className="inline-flex items-center px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    <span>{isActionLoading ? 'Recording...' : 'Authorize & Log Check-In'}</span>
                  </button>
                )}

                {verificationResult.canCheckOut && (
                  <button
                    type="button"
                    onClick={handleCheckOut}
                    disabled={isActionLoading}
                    className="inline-flex items-center px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    <span>{isActionLoading ? 'Recording...' : 'Record Departure (Check-Out)'}</span>
                  </button>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Today's Gate Log Activity */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 sm:px-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Today's Checkpoint Activity</h2>
            <p className="text-xs text-slate-500">Live arrival and departure logbook</p>
          </div>
          <button
            type="button"
            onClick={fetchTodayLogs}
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-50"
            title="Refresh logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {isLoadingLogs ? (
          <LoadingSpinner message="Loading today's gate logs..." />
        ) : todayLogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No physical check-in or check-out events logged today yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Visitor Name</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Entry Time</th>
                  <th className="px-4 py-3">Exit Time</th>
                  <th className="px-4 py-3">Checkpoint Gate</th>
                  <th className="px-4 py-3">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {todayLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-2.5 font-medium text-slate-900">
                      {log.visitor_name}
                      <span className="block text-[11px] text-slate-400">{log.visitor_phone}</span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-blue-600">
                      {log.reference_code}
                    </td>
                    <td className="px-4 py-2.5 text-slate-800">
                      {new Date(log.check_in_time).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-2.5">
                      {log.check_out_time ? (
                        <span className="text-slate-800">{new Date(log.check_out_time).toLocaleTimeString()}</span>
                      ) : (
                        <span className="inline-flex items-center text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-medium border border-emerald-200">
                          Inside Premises
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {log.entry_gate} {log.exit_gate ? `→ ${log.exit_gate}` : ''}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 max-w-xs truncate" title={log.remarks}>
                      {log.remarks || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
