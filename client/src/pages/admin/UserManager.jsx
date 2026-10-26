import React, { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';
import { 
  Users, 
  UserPlus, 
  Edit, 
  Ban, 
  CheckCircle2, 
  RefreshCw, 
  Building, 
  Clock, 
  Check, 
  X, 
  Shield, 
  AlertCircle 
} from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import AlertMessage from '../../components/AlertMessage';
import Modal from '../../components/Modal';

export default function UserManager() {
  const [users, setUsers] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add User Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    fullName: '',
    email: '',
    password: '',
    staffId: '',
    role: 'host',
    buildingId: '',
    phone: '',
  });

  // Edit User Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    id: null,
    fullName: '',
    staffId: '',
    role: 'host',
    buildingId: '',
    phone: '',
    isActive: true,
    password: '',
  });

  // Approval Modal State
  const [approveUser, setApproveUser] = useState(null);
  const [approveForm, setApproveForm] = useState({
    role: 'host',
    buildingId: '',
  });

  // Reject Modal State
  const [rejectUser, setRejectUser] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setError('');
    try {
      const [usersRes, bldgRes] = await Promise.all([
        adminApi.getUsers(),
        adminApi.getBuildings(),
      ]);

      if (usersRes.success) setUsers(usersRes.data || []);
      if (bldgRes.success) {
        setBuildings(bldgRes.data || []);
        if (bldgRes.data.length > 0) {
          setAddForm((prev) => ({ ...prev, buildingId: String(bldgRes.data[0].id) }));
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load user directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter users into Pending Approvals vs Established Directory
  const pendingUsers = users.filter((u) => u.approval_status === 'pending');
  const establishedUsers = users.filter((u) => u.approval_status !== 'pending');

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        fullName: addForm.fullName.trim(),
        email: addForm.email.trim(),
        password: addForm.password,
        staffId: addForm.staffId.trim().toUpperCase(),
        role: addForm.role,
        buildingId: addForm.buildingId ? Number(addForm.buildingId) : null,
        phone: addForm.phone.trim(),
      };

      const response = await adminApi.createUser(payload);
      if (response.success) {
        setSuccess('New staff user account created and activated successfully.');
        setIsAddOpen(false);
        setAddForm({
          fullName: '',
          email: '',
          password: '',
          staffId: '',
          role: 'host',
          buildingId: buildings[0]?.id ? String(buildings[0].id) : '',
          phone: '',
        });
        loadData();
      }
    } catch (err) {
      setError(err.message || 'Failed to create user account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditOpen = (user) => {
    setEditForm({
      id: user.id,
      fullName: user.full_name,
      staffId: user.staff_id || '',
      role: user.role,
      buildingId: user.building_id ? String(user.building_id) : '',
      phone: user.phone || '',
      isActive: Boolean(user.is_active),
      password: '',
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        fullName: editForm.fullName.trim(),
        staffId: editForm.staffId.trim().toUpperCase(),
        role: editForm.role,
        buildingId: editForm.buildingId ? Number(editForm.buildingId) : null,
        phone: editForm.phone.trim(),
        isActive: editForm.isActive,
      };

      if (editForm.password && editForm.password.trim()) {
        payload.password = editForm.password.trim();
      }

      const response = await adminApi.updateUser(editForm.id, payload);
      if (response.success) {
        setSuccess('Staff profile updated successfully.');
        setIsEditOpen(false);
        loadData();
      }
    } catch (err) {
      setError(err.message || 'Failed to update user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenApprove = (user) => {
    setApproveUser(user);
    setApproveForm({
      role: user.requested_role || user.role || 'host',
      buildingId: user.building_id ? String(user.building_id) : '',
    });
  };

  const handleConfirmApprove = async (e) => {
    e.preventDefault();
    if (!approveUser) return;

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        role: approveForm.role,
        buildingId: approveForm.buildingId ? Number(approveForm.buildingId) : null,
      };

      const response = await adminApi.approveStaff(approveUser.id, payload);
      if (response.success) {
        setSuccess(`Staff account for ${approveUser.full_name} (${response.data.staffId}) approved and activated.`);
        setApproveUser(null);
        loadData();
      }
    } catch (err) {
      setError(err.message || 'Failed to approve staff account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenReject = (user) => {
    setRejectUser(user);
    setRejectReason('');
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectUser) return;

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await adminApi.rejectStaff(rejectUser.id, rejectReason.trim());
      if (response.success) {
        setSuccess(`Staff application for ${rejectUser.full_name} has been rejected.`);
        setRejectUser(null);
        loadData();
      }
    } catch (err) {
      setError(err.message || 'Failed to reject staff application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (userId) => {
    if (!window.confirm('Are you sure you want to suspend this staff user account?')) return;
    setError('');
    setSuccess('');

    try {
      const response = await adminApi.deleteUser(userId);
      if (response.success) {
        setSuccess('User account has been deactivated.');
        loadData();
      }
    } catch (err) {
      setError(err.message || 'Failed to deactivate user.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Provision, review, and manage internal Administrator, Host, and Security accounts.
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => { setLoading(true); loadData(); }}
            className="p-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm"
          >
            <UserPlus className="w-4 h-4 mr-1.5" />
            Add Staff User
          </button>
        </div>
      </div>

      <AlertMessage type="success" message={success} onClose={() => setSuccess('')} />
      <AlertMessage type="error" message={error} onClose={() => setError('')} />

      {/* ================================================================= */}
      {/* 1. PENDING STAFF APPROVALS (If any requests exist)                 */}
      {/* ================================================================= */}
      {pendingUsers.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-amber-200 bg-amber-100/50 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <Clock className="w-5 h-5 text-amber-700" />
              <h2 className="text-sm font-bold text-amber-900">
                Pending Staff Registration Requests ({pendingUsers.length})
              </h2>
            </div>
            <span className="text-[11px] font-semibold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-full">
              Action Required
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-amber-200/60 text-left text-xs">
              <thead className="bg-amber-100/30 text-amber-900 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Applicant Name & Email</th>
                  <th className="px-4 py-3">Staff ID</th>
                  <th className="px-4 py-3">Requested Role</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Facility</th>
                  <th className="px-4 py-3 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-200/40 bg-white/70">
                {pendingUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-amber-100/30">
                    <td className="px-4 py-3">
                      <strong className="block text-slate-900 font-semibold">{u.full_name}</strong>
                      <span className="text-slate-500 font-mono text-[11px]">{u.email}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {u.staff_id || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="capitalize font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                        {u.requested_role || u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-[11px]">
                      {u.phone || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {u.building_name || <em className="text-slate-400">Campus-Wide</em>}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleOpenApprove(u)}
                        className="inline-flex items-center px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-colors"
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenReject(u)}
                        className="inline-flex items-center px-2 py-1 rounded border border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold text-xs transition-colors"
                      >
                        <X className="w-3.5 h-3.5 mr-1" />
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 2. ESTABLISHED USERS DIRECTORY                                    */}
      {/* ================================================================= */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Active & Established Staff Directory ({establishedUsers.length})
          </h2>
        </div>

        {loading ? (
          <LoadingSpinner message="Loading user directory..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Staff ID</th>
                  <th className="px-4 py-3">User Details</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Assigned Facility</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {establishedUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {u.staff_id || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <strong className="block text-slate-900 text-sm font-medium">{u.full_name}</strong>
                      <span className="text-slate-500 font-mono text-[11px]">{u.email}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`capitalize font-semibold px-2.5 py-0.5 rounded border ${
                        u.role === 'admin'
                          ? 'text-purple-700 bg-purple-50 border-purple-200'
                          : u.role === 'security'
                          ? 'text-amber-700 bg-amber-50 border-amber-200'
                          : 'text-blue-700 bg-blue-50 border-blue-200'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {u.building_name || <em className="text-slate-400">Campus-Wide</em>}
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-[11px]">
                      {u.phone || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {u.approval_status === 'rejected' ? (
                        <span className="inline-flex items-center text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-medium border border-slate-200">
                          Rejected
                        </span>
                      ) : u.is_active ? (
                        <span className="inline-flex items-center text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium border border-emerald-200">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-medium border border-rose-200">
                          Suspended
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleEditOpen(u)}
                        className="inline-flex items-center px-2 py-1 rounded border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
                      >
                        <Edit className="w-3 h-3 mr-1 text-slate-400" />
                        Edit
                      </button>
                      {u.is_active ? (
                        <button
                          type="button"
                          onClick={() => handleDeactivate(u.id)}
                          className="inline-flex items-center px-2 py-1 rounded border border-rose-200 text-rose-700 hover:bg-rose-50 font-medium"
                        >
                          <Ban className="w-3 h-3 mr-1" />
                          Suspend
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* 3. ADD USER MODAL (Admin Direct Account Creation)                 */}
      {/* ================================================================= */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Create Staff Account">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Full Legal Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={addForm.fullName}
              onChange={(e) => setAddForm({ ...addForm, fullName: e.target.value })}
              placeholder="e.g. Officer Sunita Rao"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Official Staff ID <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={addForm.staffId}
                onChange={(e) => setAddForm({ ...addForm, staffId: e.target.value })}
                placeholder="STF-SEC-003"
                className="w-full px-3 py-2 text-xs font-mono uppercase border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Official Login Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                placeholder="s.rao@accesspass.local"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Initial Password <span className="text-rose-500">*</span> (Hashed with bcrypt)
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={addForm.password}
              onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
              placeholder="Minimum 6 characters"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                System Role <span className="text-rose-500">*</span>
              </label>
              <select
                value={addForm.role}
                onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="host">Host (Faculty / Staff)</option>
                <option value="security">Security Guard</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Assigned Facility
              </label>
              <select
                value={addForm.buildingId}
                onChange={(e) => setAddForm({ ...addForm, buildingId: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="">Campus-Wide (No specific building)</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Contact Phone Number <span className="text-rose-500">*</span>
            </label>
            <input
              type="tel"
              required
              value={addForm.phone}
              onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
              placeholder="+91-9876543210"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm"
            >
              {isSubmitting ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ================================================================= */}
      {/* 4. EDIT USER MODAL                                                */}
      {/* ================================================================= */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Staff Account">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Full Legal Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={editForm.fullName}
              onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Staff ID / Employee Number <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={editForm.staffId}
              onChange={(e) => setEditForm({ ...editForm, staffId: e.target.value })}
              className="w-full px-3 py-2 text-xs font-mono uppercase border border-slate-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                System Role <span className="text-rose-500">*</span>
              </label>
              <select
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="host">Host</option>
                <option value="security">Security</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Facility Assignment
              </label>
              <select
                value={editForm.buildingId}
                onChange={(e) => setEditForm({ ...editForm, buildingId: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="">Campus-Wide</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Reset Password (leave blank to keep unchanged)
            </label>
            <input
              type="password"
              value={editForm.password}
              onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
              placeholder="New password (optional)"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="isActiveCheck"
              checked={editForm.isActive}
              onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isActiveCheck" className="text-xs font-medium text-slate-700">
              Account Active (Permitted to log in)
            </label>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ================================================================= */}
      {/* 5. APPROVE STAFF APPLICATION MODAL                                */}
      {/* ================================================================= */}
      <Modal 
        isOpen={Boolean(approveUser)} 
        onClose={() => setApproveUser(null)} 
        title="Approve Staff Application"
      >
        {approveUser && (
          <form onSubmit={handleConfirmApprove} className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1.5">
              <div><span className="font-semibold text-slate-600">Applicant:</span> <strong className="text-slate-900">{approveUser.full_name}</strong></div>
              <div><span className="font-semibold text-slate-600">Email:</span> <span className="font-mono text-slate-800">{approveUser.email}</span></div>
              <div><span className="font-semibold text-slate-600">Staff ID:</span> <span className="font-mono font-bold text-slate-900">{approveUser.staff_id}</span></div>
              <div><span className="font-semibold text-slate-600">Requested Role:</span> <span className="capitalize font-semibold text-blue-700">{approveUser.requested_role || 'host'}</span></div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Authorized System Role <span className="text-rose-500">*</span>
              </label>
              <select
                value={approveForm.role}
                onChange={(e) => setApproveForm({ ...approveForm, role: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="host">Host (Faculty / Staff Member)</option>
                <option value="security">Security Officer (Gate Guard)</option>
              </select>
              <p className="mt-1 text-[11px] text-slate-500">
                Only Administrators can authorize roles. Public applicants cannot self-elevate.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Facility / Building Assignment
              </label>
              <select
                value={approveForm.buildingId}
                onChange={(e) => setApproveForm({ ...approveForm, buildingId: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="">Campus-Wide / Unassigned</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                ))}
              </select>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setApproveUser(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm"
              >
                {isSubmitting ? 'Activating...' : 'Authorize & Activate Account'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ================================================================= */}
      {/* 6. REJECT STAFF APPLICATION MODAL                                 */}
      {/* ================================================================= */}
      <Modal
        isOpen={Boolean(rejectUser)}
        onClose={() => setRejectUser(null)}
        title="Reject Staff Registration Application"
      >
        {rejectUser && (
          <form onSubmit={handleConfirmReject} className="space-y-4">
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-800">
              <p className="font-semibold">Reject application for {rejectUser.full_name} ({rejectUser.staff_id})?</p>
              <p className="mt-1 text-[11px] text-rose-700">
                This account will be marked as rejected and login privileges will remain permanently disabled.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Rejection Reason (Optional)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Staff ID not found in HR directory or invalid credentials"
                rows={3}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setRejectUser(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm"
              >
                {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </form>
        )}
      </Modal>

    </div>
  );
}
