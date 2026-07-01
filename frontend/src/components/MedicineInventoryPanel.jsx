import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Pill } from 'lucide-react';
import { fetchPharmacyInventory, createInventoryItem, updateInventoryItem, deleteInventoryItem } from '../services/apiService.js';

const emptyMedicine = { name: '', batchNumber: '', expiryDate: '', purchasePrice: '', sellingPrice: '', currentStock: '', minimumStockLevel: '' };
const fields = ['name', 'batchNumber', 'expiryDate', 'purchasePrice', 'sellingPrice', 'currentStock', 'minimumStockLevel'];
const numericFields = new Set(['purchasePrice', 'sellingPrice', 'currentStock', 'minimumStockLevel']);

/** Shared add/edit/delete medicine inventory panel, used by the pharmacist and admin dashboards. */
export default function MedicineInventoryPanel({ onChanged }) {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyMedicine);
  const [editingId, setEditingId] = useState(null);

  const reload = async () => {
    try {
      const data = await fetchPharmacyInventory();
      setInventory(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading inventory:', error);
      toast.error('Could not load medicine inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const startEdit = (medicine) => {
    setEditingId(medicine._id);
    setForm({
      name: medicine.name || '',
      batchNumber: medicine.batchNumber || '',
      expiryDate: medicine.expiryDate ? String(medicine.expiryDate).slice(0, 10) : '',
      purchasePrice: medicine.purchasePrice ?? '',
      sellingPrice: medicine.sellingPrice ?? '',
      currentStock: medicine.currentStock ?? '',
      minimumStockLevel: medicine.minimumStockLevel ?? ''
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyMedicine);
  };

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error('Enter medicine name');
      return;
    }

    const payload = {
      name: form.name.trim(),
      batchNumber: form.batchNumber.trim(),
      expiryDate: form.expiryDate || null,
      purchasePrice: Number(form.purchasePrice) || 0,
      sellingPrice: Number(form.sellingPrice) || 0,
      currentStock: Number(form.currentStock) || 0,
      minimumStockLevel: Number(form.minimumStockLevel) || 0
    };

    try {
      if (editingId) {
        await updateInventoryItem(editingId, payload);
        toast.success('Medicine updated');
      } else {
        await createInventoryItem(payload);
        toast.success('Medicine added');
      }
      cancelEdit();
      await reload();
      await onChanged?.();
    } catch (error) {
      console.error('Error saving medicine:', error);
      toast.error(error.response?.data?.message || 'Failed to save medicine');
    }
  };

  const remove = async (id) => {
    try {
      await deleteInventoryItem(id);
      toast.success('Medicine deleted');
      if (editingId === id) cancelEdit();
      await reload();
      await onChanged?.();
    } catch (error) {
      console.error('Error deleting medicine:', error);
      toast.error('Failed to delete medicine');
    }
  };

  return (
    <section className="patient-panel mt-8 rounded-xl p-5">
      <h2 className="flex items-center gap-2 text-xl font-bold"><Pill size={19} /> Medicine inventory</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        {fields.map((field) => (
          <input
            key={field}
            className="field"
            type={field === 'expiryDate' ? 'date' : numericFields.has(field) ? 'number' : 'text'}
            placeholder={field.replace(/([A-Z])/g, ' $1')}
            value={form[field]}
            onChange={(e) => setForm((v) => ({ ...v, [field]: e.target.value }))}
          />
        ))}
        <div className="flex gap-2 md:col-span-4">
          <button type="button" className="btn-primary" onClick={submit}>{editingId ? 'Update medicine' : 'Save medicine'}</button>
          {editingId ? <button type="button" className="btn-secondary" onClick={cancelEdit}>Cancel edit</button> : null}
        </div>
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="text-slate-500"><tr><th className="py-3">Medicine</th><th>Batch</th><th>Expiry</th><th>Buy</th><th>Sell</th><th>Stock</th><th>Alert</th><th /></tr></thead>
          <tbody>
            {inventory.map((medicine) => (
              <tr key={medicine._id} className="border-t border-slate-200">
                <td className="py-3 font-bold">{medicine.name}</td>
                <td>{medicine.batchNumber}</td>
                <td>{medicine.expiryDate ? String(medicine.expiryDate).slice(0, 10) : ''}</td>
                <td>INR {medicine.purchasePrice}</td>
                <td>INR {medicine.sellingPrice}</td>
                <td>{medicine.currentStock}</td>
                <td>{medicine.currentStock <= medicine.minimumStockLevel ? <span className="text-xs font-bold text-rose-700">LOW STOCK</span> : 'OK'}</td>
                <td className="py-3">
                  <div className="flex gap-3">
                    <button type="button" className="text-xs font-bold text-medical-700" onClick={() => startEdit(medicine)}>Edit</button>
                    <button type="button" className="text-xs font-bold text-rose-700" onClick={() => remove(medicine._id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && !inventory.length ? (
              <tr><td colSpan={8} className="py-6 text-center text-slate-500">No medicines yet. Add one above.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
