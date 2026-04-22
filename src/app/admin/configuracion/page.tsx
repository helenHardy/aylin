'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { 
  Tags, 
  Award, 
  Layers, 
  Plus, 
  Trash2, 
  Edit2, 
  X,
  CheckCircle2
} from 'lucide-react';

export default function ConfiguracionCatalogos() {
  const [activeTab, setActiveTab] = useState<'categorias' | 'marcas' | 'modelos'>('categorias');
  
  // Data
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [catRes, brandRes, modelRes] = await Promise.all([
      supabase.from('categories').select('*').order('name'),
      supabase.from('brands').select('*').order('name'),
      supabase.from('product_models').select('*, brands(name)').order('name')
    ]);

    setCategories(catRes.data || []);
    setBrands(brandRes.data || []);
    setModels(modelRes.data || []);
    setLoading(false);
  };

  const resetForm = () => {
    setName('');
    setSelectedBrandId('');
    setEditingId(null);
  };

  const handleOpenModal = (item?: any) => {
    resetForm();
    if (item) {
        setEditingId(item.id);
        setName(item.name);
        if (activeTab === 'modelos') setSelectedBrandId(item.brand_id);
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
        let table = activeTab === 'categorias' ? 'categories' : (activeTab === 'marcas' ? 'brands' : 'product_models');
        let data: any = { name };
        if (activeTab === 'modelos') data.brand_id = selectedBrandId;

        if (editingId) {
            await supabase.from(table).update(data).eq('id', editingId);
        } else {
            await supabase.from(table).insert([data]);
        }

        setShowModal(false);
        fetchData();
    } catch (err) {
        alert('Error al guardar');
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro? Otros productos podrían depender de este valor.')) return;
    let table = activeTab === 'categorias' ? 'categories' : (activeTab === 'marcas' ? 'brands' : 'product_models');
    await supabase.from(table).delete().eq('id', id);
    fetchData();
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Configuración de Catálogo</h1>
          <p className="text-slate-500 mt-1">Administra tus categorías, marcas y modelos de productos.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span>Nuevo {activeTab.slice(0, -1)}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-100 p-1.5 rounded-2xl w-fit">
        <TabButton active={activeTab === 'categorias'} onClick={() => setActiveTab('categorias')} icon={<Tags className="w-4 h-4" />} label="Categorías" />
        <TabButton active={activeTab === 'marcas'} onClick={() => setActiveTab('marcas')} icon={<Award className="w-4 h-4" />} label="Marcas" />
        <TabButton active={activeTab === 'modelos'} onClick={() => setActiveTab('modelos')} icon={<Layers className="w-4 h-4" />} label="Modelos" />
      </div>

      {/* List */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase tracking-wider">Nombre</th>
              {activeTab === 'modelos' && <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase tracking-wider">Marca</th>}
              <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase tracking-wider text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
                [1,2,3].map(i => <tr key={i} className="animate-pulse"><td colSpan={3} className="h-16 bg-slate-50/50"></td></tr>)
            ) : (
                (activeTab === 'categorias' ? categories : activeTab === 'marcas' ? brands : models).map(item => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4 font-bold text-slate-900">{item.name}</td>
                        {activeTab === 'modelos' && <td className="px-6 py-4 text-slate-500">{item.brands?.name}</td>}
                        <td className="px-6 py-4 text-right flex justify-end space-x-2">
                            <button onClick={() => handleOpenModal(item)} className="p-2 text-slate-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                        </td>
                    </tr>
                ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[32px] shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center text-slate-900 font-bold text-xl">
              <span>{editingId ? 'Editar' : 'Crear'} {activeTab.slice(0, -1)}</span>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {activeTab === 'modelos' && (
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Seleccionar Marca</label>
                    <select 
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                        value={selectedBrandId}
                        onChange={e => setSelectedBrandId(e.target.value)}
                    >
                        <option value="">Marca...</option>
                        {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nombre</label>
                <input 
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
                    placeholder={`Ej: ${activeTab === 'categorias' ? 'Lanas' : activeTab === 'marcas' ? 'Lora' : 'Premium'}`}
                    value={name}
                    onChange={e => setName(e.target.value)}
                />
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-all text-lg"
              >
                {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({ active, icon, label, onClick }: any) {
    return (
        <button 
            onClick={onClick}
            className={`flex items-center space-x-2 px-6 py-2.5 rounded-[14px] font-bold text-sm transition-all ${
                active ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
        >
            {icon}
            <span>{label}</span>
        </button>
    )
}
