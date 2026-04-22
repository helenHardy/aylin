'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { Plus, Warehouse, MoreVertical, Edit2, Trash2, Check, X } from 'lucide-react';
import { cn } from '@/utils/cn';

interface WarehouseData {
  id: string;
  name: string;
  location: string | null;
  is_active: boolean;
  created_at: string;
}

export default function DepositosPage() {
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('warehouses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching warehouses:', error);
    } else {
      setWarehouses(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (editingId) {
      const { error } = await supabase
        .from('warehouses')
        .update({ name, location })
        .eq('id', editingId);
      
      if (error) alert('Error al actualizar: ' + error.message);
    } else {
      const { error } = await supabase
        .from('warehouses')
        .insert([{ name, location }]);
      
      if (error) alert('Error al crear: ' + error.message);
    }

    setIsSubmitting(false);
    setShowModal(false);
    setEditingId(null);
    setName('');
    setLocation('');
    fetchWarehouses();
  };

  const handleEdit = (warehouse: WarehouseData) => {
    setName(warehouse.name);
    setLocation(warehouse.location || '');
    setEditingId(warehouse.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este depósito?')) {
      const { error } = await supabase.from('warehouses').delete().eq('id', id);
      if (error) alert('Error al eliminar: ' + error.message);
      else fetchWarehouses();
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gestión de Depósitos</h1>
          <p className="text-slate-500 mt-1">Administra las ubicaciones donde guardas tu mercadería.</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setName('');
            setLocation('');
            setShowModal(true);
          }}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all active:scale-[0.98]"
        >
          <Plus className="w-5 h-5" />
          <span>Nuevo Depósito</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-slate-100 animate-pulse rounded-2xl"></div>
          ))
        ) : warehouses.length === 0 ? (
          <div className="col-span-full py-20 bg-white rounded-3xl border border-dashed border-slate-300 flex flex-col items-center justify-center space-y-4">
            <Warehouse className="w-12 h-12 text-slate-300" />
            <p className="text-slate-500 font-medium">No hay depósitos registrados.</p>
          </div>
        ) : (
          warehouses.map((w) => (
            <div key={w.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all group">
              <div className="flex justify-between items-start">
                <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                  <Warehouse className="w-6 h-6" />
                </div>
                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEdit(w)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(w.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-bold text-slate-900">{w.name}</h3>
                <p className="text-slate-500 text-sm mt-1">{w.location || 'Sin ubicación registrada'}</p>
              </div>
              <div className="mt-6 flex items-center justify-between">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Activo
                </span>
                <span className="text-xs text-slate-400">Creado el {new Date(w.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">
                {editingId ? 'Editar Depósito' : 'Registrar Nuevo Depósito'}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 ml-1">Nombre del Depósito</label>
                <input
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900"
                  placeholder="Ej: Depósito Central"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 ml-1">Ubicación (Opcional)</label>
                <textarea
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none text-slate-900"
                  rows={3}
                  placeholder="Ej: Calle 4, Zona Industrial"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-[0.98] disabled:opacity-50 px-8"
                >
                  {isSubmitting ? 'Guardando...' : (editingId ? 'Actualizar' : 'Guardar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
