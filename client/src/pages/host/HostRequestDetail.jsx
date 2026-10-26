import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { hostApi } from '../../services/api';
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  Ban
} from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import AlertMessage from '../../components/AlertMessage';
import Modal from '../../components/Modal';

export default function HostRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Modals
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isRevokeOpen, setIsRevokeOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [revokeReason, setRevokeReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRequest = async () => {
    setError('');
    try {
      // Find in host requests
      const response = await hostApi.getRequests();
      if (response.success && response.data) {
        const found = response.data.find((r) => String(r.id) === String(id));
        if (found) {
          setRequest(found);
        } else {
          setError('Visit request not found or not assigned to your account.');
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load request.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequest();
  }, [id]);

  const handleApprove = async () => {
    setActionLoading(true);
    setError('');
    try {
      const response = await hostApi.approveRequest(id);
      if (response.success) {
        setSuccessMessage('Visit request approved and digital pass issued.');
        setIsApproveOpen(false);
        fetchRequest();
      }
    } catch (err) {
      setError(err.message || 'Failed to approve request.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    setActionLoading(true);
    setError('');
    try {
      const response = await hostApi.rejectRequest(id, rejectionReason);
      if (response.success) {
        setSuccessMessage('Visit request rejected.');
        setIsRejectOpen(false);
        fetchRequest();
      }
    } catch (err) {
      setError(err.message || 'Failed to reject request.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevoke = async () => {
    setActionLoading(true);
    setError('');
    try {
      const response = await hostApi.revokeRequest(id, revokeReason);
      if (response.success) {
        setSuccessMessage('Digital pass has been revoked.');
        setIsRevokeOpen(false);
        fetchRequest();
      }
    } catch (err) {
      setError(err.message || 'Failed to revoke pass.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Retrieving request details..." size="lg" />;
  }

  if (error || !request) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white border border-slate-200 rounded-xl p-6 text-center">
        <AlertMessage type="error" message={error || 'Request not found.'} />
        <Link to="/host/requests" className="text-sm text-blue-600 hover:underline">
          ← Return to Requests List
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      
      {/* Back button */}
      <div className="mb-4">
        <Link to="/host/requests" className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900">
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Back to All Requests
        </Link>
      </div>

      <AlertMessage type="success" message={successMessage} onClose={() => setSuccessMessage('')} />
      <AlertMessage type="error" message={error} onClose={() => setError('')} />

      {/* Main card */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm mb-6">
        
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
              Visit Request Reference
            </span>
            <span className="font-mono text-lg font-bold text-slate-900">
              {request.reference_code}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <StatusBadge status={request.status} />

            {request.status === 'pending' && (
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsApproveOpen(true)}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Approve Request
                </button>
                <button
                  type="button"
                  onClick={() => setIsRejectOpen(true)}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" />
                  Reject
                </button>
              </div>
            )}

            {request.status === 'approved' && request.pass_status !== 'revoked' && (
              <button
                type="button"
                onClick={() => setIsRevokeOpen(true)}
                className="inline-flex items-center px-3 py-1.5 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold shadow-sm"
              >
                <Ban className="w-3.5 h-3.5 mr-1" />
                Revoke Pass
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left: Visitor Details */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100">
                Visitor Identity
              </h3>

              <div>
                <span className="text-xs text-slate-500 block">Full Name</span>
                <span className="text-sm font-semibold text-slate-900">{request.visitor_name}</span>
              </div>

              <div>
                <span className="text-xs text-slate-500 block">Email Address</span>
                <span className="text-sm text-slate-800">{request.visitor_email}</span>
              </div>

              <div>
                <span className="text-xs text-slate-500 block">Phone Number</span>
                <span className="text-sm text-slate-800">{request.visitor_phone}</span>
              </div>

              <div>
                <span className="text-xs text-slate-500 block">ID Proof Document</span>
                <span className="text-sm text-slate-800">
                  {request.id_proof_type} {request.id_proof_number ? `(${request.id_proof_number})` : ''}
                </span>
              </div>
            </div>

            {/* Right: Appointment & Destination */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100">
                Appointment Schedule
              </h3>

              <div>
                <span className="text-xs text-slate-500 block">Requested Building</span>
                <span className="text-sm font-semibold text-slate-900">{request.building_name}</span>
              </div>

              <div>
                <span className="text-xs text-slate-500 block">Visit Date</span>
                <span className="text-sm text-slate-800 font-medium">
                  {new Date(request.requested_date).toLocaleDateString()}
                </span>
              </div>

              <div>
                <span className="text-xs text-slate-500 block">Authorized Hours</span>
                <span className="text-sm text-slate-800">
                  {request.expected_start_time} to {request.expected_end_time}
                </span>
              </div>

              <div>
                <span className="text-xs text-slate-500 block">Stated Visit Purpose</span>
                <p className="text-sm text-slate-800 bg-slate-50 p-3 rounded-md border border-slate-200 mt-1">
                  {request.purpose}
                </p>
              </div>
            </div>

          </div>

          {/* Pass details if approved */}
          {request.pass_code && (
            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-2">
                Digital Pass Issued
              </h3>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-xs text-emerald-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <span className="block font-medium">Pass Token:</span>
                  <span className="font-mono text-sm font-bold">{request.pass_code}</span>
                </div>
                <div>
                  <span className="block font-medium">Valid Until:</span>
                  <span>{new Date(request.valid_until).toLocaleString()}</span>
                </div>
                <StatusBadge status={request.pass_status} />
              </div>
            </div>
          )}

          {/* Rejection reason if rejected */}
          {request.rejection_reason && (
            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 mb-2">
                Rejection Rationale
              </h3>
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-800">
                {request.rejection_reason}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Approve Modal */}
      <Modal isOpen={isApproveOpen} onClose={() => setIsApproveOpen(false)} title="Confirm Approval">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Confirm approval for <strong>{request.visitor_name}</strong> on {new Date(request.requested_date).toLocaleDateString()}?
          </p>
          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsApproveOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApprove}
              disabled={actionLoading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm"
            >
              {actionLoading ? 'Issuing...' : 'Authorize Access'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal isOpen={isRejectOpen} onClose={() => setIsRejectOpen(false)} title="Decline Visit">
        <div className="space-y-4">
          <label htmlFor="modalReason" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
            State reason for rejection *
          </label>
          <textarea
            id="modalReason"
            rows={3}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="e.g. Schedule conflict or inappropriate visit timing"
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
          />
          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsRejectOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleReject}
              disabled={actionLoading || !rejectionReason.trim()}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm"
            >
              {actionLoading ? 'Declining...' : 'Confirm Rejection'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Revoke Modal */}
      <Modal isOpen={isRevokeOpen} onClose={() => setIsRevokeOpen(false)} title="Revoke Digital Pass">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Revoking will permanently invalidate this digital pass. The visitor will be denied entry at all security gates.
          </p>
          <label htmlFor="revokeReasonInput" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
            State reason for revocation (Optional)
          </label>
          <textarea
            id="revokeReasonInput"
            rows={3}
            value={revokeReason}
            onChange={(e) => setRevokeReason(e.target.value)}
            placeholder="e.g. Host unavailable, meeting rescheduled, or security concern"
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
          />
          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsRevokeOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRevoke}
              disabled={actionLoading}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm"
            >
              {actionLoading ? 'Revoking...' : 'Confirm Revocation'}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
