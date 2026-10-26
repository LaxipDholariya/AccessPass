import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { hostApi } from '../../services/api';
import { 
  Inbox, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  Search, 
  RefreshCw,
  Ban
} from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import AlertMessage from '../../components/AlertMessage';
import Modal from '../../components/Modal';

export default function HostDashboard() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [revokeReason, setRevokeReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState('');

  const fetchRequests = async () => {
    setError('');
    try {
      const param = statusFilter === 'all' ? '' : statusFilter;
      const response = await hostApi.getRequests(param);
      if (response.success) {
        setRequests(response.data || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load visitor requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const handleApproveConfirm = async () => {
    if (!selectedRequest) return;
    setActionLoading(true);
    setError('');
    setActionSuccessMessage('');

    try {
      const response = await hostApi.approveRequest(selectedRequest.id);
      if (response.success) {
        setActionSuccessMessage(`Visit request ${selectedRequest.reference_code} approved! Pass code issued.`);
        setIsApproveModalOpen(false);
        fetchRequests();
      }
    } catch (err) {
      setError(err.message || 'Failed to approve request.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!selectedRequest) return;
    setActionLoading(true);
    setError('');
    setActionSuccessMessage('');

    try {
      const response = await hostApi.rejectRequest(selectedRequest.id, rejectionReason);
      if (response.success) {
        setActionSuccessMessage(`Visit request ${selectedRequest.reference_code} has been rejected.`);
        setIsRejectModalOpen(false);
        setRejectionReason('');
        fetchRequests();
      }
    } catch (err) {
      setError(err.message || 'Failed to reject request.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeConfirm = async () => {
    if (!selectedRequest) return;
    setActionLoading(true);
    setError('');
    setActionSuccessMessage('');

    try {
      const response = await hostApi.revokeRequest(selectedRequest.id, revokeReason);
      if (response.success) {
        setActionSuccessMessage(`Digital pass for ${selectedRequest.reference_code} has been revoked.`);
        setIsRevokeModalOpen(false);
        setRevokeReason('');
        fetchRequests();
      }
    } catch (err) {
      setError(err.message || 'Failed to revoke digital pass.');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter requests by search term
  const filteredRequests = requests.filter((r) => {
    const term = searchTerm.toLowerCase();
    return (
      r.reference_code.toLowerCase().includes(term) ||
      r.visitor_name.toLowerCase().includes(term) ||
      r.visitor_email.toLowerCase().includes(term) ||
      r.purpose.toLowerCase().includes(term)
    );
  });

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 mb-6 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Host Visit Requests</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Review, authorize, and manage visitor appointment applications for your office.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setLoading(true); fetchRequests(); }}
          className="inline-flex items-center self-start sm:self-auto px-3.5 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Refresh Requests
        </button>
      </div>

      <AlertMessage type="error" message={error} onClose={() => setError('')} />
      <AlertMessage type="success" message={actionSuccessMessage} onClose={() => setActionSuccessMessage('')} />

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Status Filter Tabs */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg w-full sm:w-auto">
          {['all', 'pending', 'approved', 'rejected'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors ${
                statusFilter === tab
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search visitor, ref, purpose..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
          />
        </div>

      </div>

      {/* Requests Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        {loading ? (
          <LoadingSpinner message="Loading visit requests..." />
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Inbox className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">No visit requests found</p>
            <p className="text-xs text-slate-400 mt-1">
              {statusFilter !== 'all' ? `No requests matching filter '${statusFilter}'` : 'Your incoming request inbox is empty.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold tracking-wider">
                <tr>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Visitor Details</th>
                  <th className="px-4 py-3">Purpose</th>
                  <th className="px-4 py-3">Visit Date & Time</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                    
                    <td className="px-4 py-3 font-mono font-semibold text-blue-600 whitespace-nowrap">
                      {req.reference_code}
                    </td>

                    <td className="px-4 py-3">
                      <strong className="block text-slate-900 text-sm font-medium">{req.visitor_name}</strong>
                      <span className="text-slate-500">{req.visitor_phone} • {req.visitor_email}</span>
                    </td>

                    <td className="px-4 py-3 max-w-xs truncate text-slate-700" title={req.purpose}>
                      {req.purpose}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="block font-medium text-slate-800">
                        {new Date(req.requested_date).toLocaleDateString()}
                      </span>
                      <span className="text-slate-500">
                        {req.expected_start_time} – {req.expected_end_time}
                      </span>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={req.status} />
                    </td>

                    <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                      <Link
                        to={`/host/requests/${req.id}`}
                        className="inline-flex items-center px-2.5 py-1 rounded border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-medium"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        Details
                      </Link>

                      {req.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            onClick={() => { setSelectedRequest(req); setIsApproveModalOpen(true); }}
                            className="inline-flex items-center px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Approve
                          </button>

                          <button
                            type="button"
                            onClick={() => { setSelectedRequest(req); setIsRejectModalOpen(true); }}
                            className="inline-flex items-center px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-medium"
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            Reject
                          </button>
                        </>
                      )}

                      {req.status === 'approved' && req.pass_status !== 'revoked' && (
                        <button
                          type="button"
                          onClick={() => { setSelectedRequest(req); setIsRevokeModalOpen(true); }}
                          className="inline-flex items-center px-2.5 py-1 rounded border border-rose-200 text-rose-700 hover:bg-rose-50 font-medium"
                        >
                          <Ban className="w-3.5 h-3.5 mr-1" />
                          Revoke
                        </button>
                      )}
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Approve Confirmation Modal */}
      <Modal
        isOpen={isApproveModalOpen}
        onClose={() => setIsApproveModalOpen(false)}
        title="Authorize Visitor Access"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to approve this visit request?
          </p>

          {selectedRequest && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
              <div><strong>Visitor:</strong> {selectedRequest.visitor_name}</div>
              <div><strong>Reference:</strong> {selectedRequest.reference_code}</div>
              <div><strong>Purpose:</strong> {selectedRequest.purpose}</div>
              <div><strong>Scheduled Date:</strong> {new Date(selectedRequest.requested_date).toLocaleDateString()} ({selectedRequest.expected_start_time} - {selectedRequest.expected_end_time})</div>
            </div>
          )}

          <p className="text-xs text-slate-500">
            Approving this request immediately issues a digital pass with a verifiable QR token.
          </p>

          <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setIsApproveModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApproveConfirm}
              disabled={actionLoading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm disabled:opacity-50"
            >
              {actionLoading ? 'Issuing Pass...' : 'Confirm Approval'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title="Decline Visit Request"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Please enter a brief explanation for declining this visit request. The visitor will be able to view this rationale.
          </p>

          {selectedRequest && (
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <strong>Visitor:</strong> {selectedRequest.visitor_name} ({selectedRequest.reference_code})
            </div>
          )}

          <div>
            <label htmlFor="reason" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Rejection Reason *
            </label>
            <textarea
              id="reason"
              rows={3}
              required
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Host is unavailable due to academic committee meeting / laboratory maintenance."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setIsRejectModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRejectConfirm}
              disabled={actionLoading || !rejectionReason.trim()}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm disabled:opacity-50"
            >
              {actionLoading ? 'Declining...' : 'Confirm Rejection'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Revoke Modal */}
      <Modal
        isOpen={isRevokeModalOpen}
        onClose={() => setIsRevokeModalOpen(false)}
        title="Revoke Digital Pass"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Revoking a pass immediately cancels access permissions. The visitor will no longer be permitted entry through security gates.
          </p>

          {selectedRequest && (
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <strong>Visitor:</strong> {selectedRequest.visitor_name} ({selectedRequest.reference_code})
            </div>
          )}

          <div>
            <label htmlFor="revokeReason" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Revocation Reason (Optional)
            </label>
            <textarea
              id="revokeReason"
              rows={3}
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              placeholder="e.g. Appointment cancelled by host or security concern."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-600 focus:border-rose-600"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setIsRevokeModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRevokeConfirm}
              disabled={actionLoading}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm disabled:opacity-50"
            >
              {actionLoading ? 'Revoking...' : 'Confirm Revocation'}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
