import React, { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';
import { Building2, Plus, Edit, RefreshCw } from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import AlertMessage from '../../components/AlertMessage';
import Modal from '../../components/Modal';

export default function BuildingManager() {
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', code: '', address: '' });

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ id: null, name: '', code: '', address: '', isActive: true });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadBuildings = async () => {
    setError('');
    try {
      const response = await adminApi.getBuildings();
      if (response.success) {
        setBuildings(response.data || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load buildings list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBuildings();
  }, []);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await adminApi.createBuilding(addForm);
      if (response.success) {
        setSuccess('New building created successfully.');
        setIsAddOpen(false);
        setAddForm({ name: '', code: '', address: '' });
        loadBuildings();
      }
    } catch (err) {
      setError(err.message || 'Failed to create building.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditOpen = (bldg) => {
    setEditForm({
      id: bldg.id,
      name: bldg.name,
      code: bldg.code,
      address: bldg.address || '',
      isActive: Boolean(bldg.is_active),
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await adminApi.updateBuilding(editForm.id, editForm);
      if (response.success) {
        setSuccess('Building details updated successfully.');
        setIsEditOpen(false);
        loadBuildings();
      }
    } catch (err) {
      setError(err.message || 'Failed to update building.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Campus Buildings & Facilities</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Configure campus complexes, premises codes, and gate checkpoint boundaries.
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => { setLoading(true); loadBuildings(); }}
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
            <Plus className="w-4 h-4 mr-1.5" />
            Add Building
          </button>
        </div>
      </div>

      <AlertMessage type="success" message={success} onClose={() => setSuccess('')} />
      <AlertMessage type="error" message={error} onClose={() => setError('')} />

      {/* Buildings Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        {loading ? (
          <LoadingSpinner message="Loading facilities list..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Building Name</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Campus Address / Location</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {buildings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-semibold text-slate-900 text-sm">
                      {b.name}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-blue-600">
                      {b.code}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {b.address || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {b.is_active ? (
                        <span className="inline-flex items-center text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium border border-emerald-200">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-medium border border-slate-200">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleEditOpen(b)}
                        className="inline-flex items-center px-2 py-1 rounded border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
                      >
                        <Edit className="w-3 h-3 mr-1 text-slate-400" />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Building Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Register New Building">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Building / Complex Name *
            </label>
            <input
              type="text"
              required
              value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              placeholder="e.g. Electrical & Computing Complex"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Short Building Code * (Unique)
            </label>
            <input
              type="text"
              required
              value={addForm.code}
              onChange={(e) => setAddForm({ ...addForm, code: e.target.value })}
              placeholder="e.g. BLDG-ECE"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg uppercase font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Campus Address / Zone
            </label>
            <input
              type="text"
              value={addForm.address}
              onChange={(e) => setAddForm({ ...addForm, address: e.target.value })}
              placeholder="e.g. South Sector, Sector 9 Gate"
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
              {isSubmitting ? 'Saving...' : 'Add Facility'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Building Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Building Details">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Building Name *
            </label>
            <input
              type="text"
              required
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Building Code *
            </label>
            <input
              type="text"
              required
              value={editForm.code}
              onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg uppercase font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Campus Address / Location
            </label>
            <input
              type="text"
              value={editForm.address}
              onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="isBldgActive"
              checked={editForm.isActive}
              onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
              className="rounded border-slate-300 text-blue-600"
            />
            <label htmlFor="isBldgActive" className="text-xs font-medium text-slate-700">
              Facility Active (Accepts new visits)
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
              {isSubmitting ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
