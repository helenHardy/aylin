'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { 
  Truck, 
  Plus, 
  Search, 
  Phone, 
  Trash2, 
  Edit2, 
  X,
  User as UserIcon,
  CreditCard,
  History,
  Banknote,
  Calendar,
  Wallet
} from 'lucide-react';

export default function ProveedoresPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Form State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // History Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name');
    
    if (error) console.error(error);
    else setSuppliers(data || []);
    setLoading(false);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier || !paymentAmount) return;
    setIsSubmitting(true);

    try {
        const { error } = await supabase.from('debt_ledger').insert([{
            supplier_id: selectedSupplier.id,
            amount: -parseFloat(paymentAmount), // Negative amount to reduce debt
            type: 'payment',
            notes: paymentNotes || 'Pago a proveedor'
        }]);

        if (error) throw error;

        setShowPaymentModal(false);
        setPaymentAmount('');
        setPaymentNotes('');
        fetchSuppliers();
    } catch (err) {
        alert('Error al registrar el pago');
    } finally {
        setIsSubmitting(false);
    }
  };

  const fetchHistory = async (supplier: any) => {
    setSelectedSupplier(supplier);
    setShowHistoryModal(true);
    setLoadingHistory(true);
    setPaymentAmount(''); // Reset payment input
    
    const { data, error } = await supabase
        .from('debt_ledger')
        .select('*')
        .eq('supplier_id', supplier.id)
        .order('created_at', { ascending: false });

    if (!error) setHistory(data || []);
    setLoadingHistory(false);
  };

  const handleQuickPayment = async (supplier: any) => {
    if (!paymentAmount || Number(paymentAmount) <= 0) return;
    setIsSubmitting(true);

    const { error } = await supabase.from('debt_ledger').insert([{
        supplier_id: supplier.id,
        amount: -Number(paymentAmount), 
        type: 'payment',
        notes: 'Pago a proveedor (vía historial)'
    }]);

    if (error) alert(error.message);
    else {
        setPaymentAmount('');
        fetchSuppliers();
        fetchHistory(supplier);
    }
    setIsSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const supplierData = { name, phone };

    try {
        if (editingId) {
            await supabase.from('suppliers').update(supplierData).eq('id', editingId);
        } else {
            await supabase.from('suppliers').insert([supplierData]);
        }
        setShowModal(false);
        fetchSuppliers();
        resetForm();
    } catch (err) {
        alert('Error al guardar');
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleEdit = (s: any) => {
    setEditingId(s.id);
    setName(s.name);
    setPhone(s.phone || '');
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setPhone('');
  };

  const filtered = suppliers.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    (s.phone && s.phone.includes(search))
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Proveedores</h1>
          <p className="text-slate-500 mt-1">Gestiona tus suministradores de lana y saldos pendientes.</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold transition-all active:scale-95 shadow-lg"
        >
          <Plus className="w-5 h-5" />
          <span>Registrar Proveedor</span>
        </button>
      </div>

      {/* Search & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-3 bg-white p-4 rounded-2xl border border-slate-200 flex items-center">
            <Search className="w-5 h-5 text-slate-400 mr-3" />
            <input 
                type="text"
                placeholder="Buscar por nombre o teléfono..."
                className="bg-transparent outline-none w-full text-slate-900 font-medium"
                value={search}
                onChange={e => setSearch(e.target.value)}
            />
        </div>
        <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl flex items-center space-x-4">
            <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6" />
            </div>
            <div>
                <div className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Deuda Total</div>
                <div className="text-xl font-black text-orange-700">
                    {suppliers.reduce((acc, s) => acc + (s.current_balance || 0), 0).toFixed(2)} BS
                </div>
            </div>
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-8 py-5 text-sm font-bold text-slate-400 uppercase tracking-widest">Suministrador</th>
              <th className="px-8 py-5 text-sm font-bold text-slate-400 uppercase tracking-widest">Contacto</th>
              <th className="px-8 py-5 text-sm font-bold text-slate-400 uppercase tracking-widest">Saldo Pendiente</th>
              <th className="px-8 py-5 text-sm font-bold text-slate-400 uppercase tracking-widest text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
                [1,2,3].map(i => <tr key={i} className="animate-pulse"><td colSpan={4} className="h-20 bg-slate-50/50"></td></tr>)
            ) : filtered.length === 0 ? (
                <tr><td colSpan={4} className="py-20 text-center text-slate-500">No se encontraron proveedores.</td></tr>
            ) : filtered.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-8 py-6">
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center">
                                <Truck className="w-5 h-5" />
                            </div>
                            <span className="font-bold text-slate-900 text-lg">{s.name}</span>
                        </div>
                    </td>
                    <td className="px-8 py-6">
                        <div className="flex items-center text-slate-500">
                            <Phone className="w-4 h-4 mr-2" />
                            {s.phone || 'Sin teléfono'}
                        </div>
                    </td>
                    <td className="px-8 py-6">
                        <span className={`px-4 py-1.5 rounded-full font-bold text-sm ${
                            s.current_balance > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                        }`}>
                            {s.current_balance || 0} BS
                        </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                        <div className="flex justify-end space-x-2">
                             <button 
                                onClick={() => { setSelectedSupplier(s); setShowPaymentModal(true); }}
                                className="p-2 text-slate-400 hover:text-green-600 transition-colors"
                                title="Registrar Pago"
                             >
                                <Banknote className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={() => fetchHistory(s)}
                                className="p-2 text-slate-400 hover:text-orange-600 transition-colors"
                                title="Ver Historial"
                            >
                                <History className="w-5 h-5" />
                            </button>
                             <button onClick={() => handleEdit(s)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </td>
                </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit/New Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[32px] shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-900">{editingId ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nombre Comercial</label>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                    <UserIcon className="w-5 h-5 text-slate-400 mr-3" />
                    <input 
                        required
                        className="bg-transparent outline-none w-full text-slate-900 font-medium" 
                        placeholder="Ej: Lanas del Valle"
                        value={name}
                        onChange={e => setName(e.target.value)}
                    />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Teléfono de Contacto</label>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                    <Phone className="w-5 h-5 text-slate-400 mr-3" />
                    <input 
                        className="bg-transparent outline-none w-full text-slate-900 font-medium" 
                        placeholder="+591 ..."
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                    />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-xl active:scale-95 transition-all text-lg"
              >
                {isSubmitting ? 'Guardando...' : 'Guardar Proveedor'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[32px] shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-green-50/50">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Registrar Pago</h2>
                <p className="text-xs text-slate-500">{selectedSupplier?.name}</p>
              </div>
              <button onClick={() => setShowPaymentModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            
            <form onSubmit={handlePaymentSubmit} className="p-8 space-y-6">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                 <span className="text-sm font-medium text-slate-500">Deuda Actual:</span>
                 <span className="text-lg font-black text-slate-900">{selectedSupplier?.current_balance || 0} BS</span>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 tracking-widest">Monto a Abonar</label>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-green-500 transition-all">
                    <Banknote className="w-5 h-5 text-slate-400 mr-3" />
                    <input 
                        required
                        type="number"
                        step="0.01"
                        className="bg-transparent outline-none w-full text-slate-900 font-bold" 
                        placeholder="0.00"
                        value={paymentAmount}
                        onChange={e => setPaymentAmount(e.target.value)}
                    />
                    <span className="text-xs font-bold text-slate-400 ml-2">BS</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 tracking-widest">Notas / Referencia</label>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-green-500 transition-all">
                    <input 
                        className="bg-transparent outline-none w-full text-slate-900 font-medium" 
                        placeholder="Ej: Pago en efectivo..."
                        value={paymentNotes}
                        onChange={e => setPaymentNotes(e.target.value)}
                    />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting || !paymentAmount}
                className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold shadow-xl shadow-green-200 active:scale-95 transition-all text-lg flex items-center justify-center space-x-2"
              >
                <Wallet className="w-5 h-5" />
                <span>{isSubmitting ? 'Procesando...' : 'Confirmar Pago'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Unified Supplier History & Payment Modal */}
      {showHistoryModal && selectedSupplier && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[48px] shadow-2xl max-w-4xl w-full flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in duration-200 h-[80vh]">
            
            {/* Left Section: History List */}
            <div className="flex-1 flex flex-col min-w-0 bg-slate-50/30">
                <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Estado de Cuenta Suministros</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Movimientos con {selectedSupplier.name}</p>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-10 space-y-4">
                    {loadingHistory ? (
                        <div className="py-20 text-center animate-pulse text-slate-300 font-black uppercase tracking-widest text-[10px]">Cargando transacciones...</div>
                    ) : history.length === 0 ? (
                        <div className="py-20 text-center text-slate-300 opacity-50 flex flex-col items-center">
                            <Truck className="w-10 h-10 mb-2" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Sin movimientos registrados</span>
                        </div>
                    ) : (
                        history.map((h, index) => {
                            const historyInOrder = [...history].reverse();
                            const currentIndex = history.length - 1 - index;
                            const runningBalance = historyInOrder
                                .slice(0, currentIndex + 1)
                                .reduce((acc, curr) => acc + curr.amount, 0);

                            return (
                                <div key={h.id} className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-orange-200 transition-all">
                                    <div className="flex items-center space-x-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                            h.amount > 0 ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'
                                        }`}>
                                            {h.amount > 0 ? <Truck className="w-5 h-5" /> : <Banknote className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                                                {new Date(h.created_at).toLocaleString()}
                                            </div>
                                            <div className="font-black text-slate-800 uppercase text-[11px]">
                                                {h.amount > 0 ? (
                                                    <span className="flex items-center">
                                                        Abastecimiento Factura #{h.reference_id?.slice(0,8)}
                                                    </span>
                                                ) : 'Abono Realizado'}
                                            </div>
                                            <div className="text-[9px] text-slate-400 font-bold mt-1">
                                                Saldo tras mov: <span className="text-slate-600">{runningBalance.toFixed(2)} BS</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`text-sm font-black tracking-tight ${
                                        h.amount > 0 ? 'text-orange-600' : 'text-emerald-600'
                                    }`}>
                                        {h.amount > 0 ? '+' : ''}{h.amount.toFixed(2)} BS
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Right Section: Summary & Action */}
            <div className="w-full md:w-[350px] bg-white border-l border-slate-100 flex flex-col shrink-0">
                <div className="p-10 flex flex-col h-full">
                    <div className="flex justify-end mb-4">
                        <button onClick={() => setShowHistoryModal(false)} className="p-3 hover:bg-slate-50 rounded-2xl transition-all">
                            <X className="w-8 h-8 text-slate-200 hover:text-slate-400" />
                        </button>
                    </div>

                    <div className="space-y-8 flex-1">
                        {/* Summary Stats */}
                        <div className="space-y-4">
                            <div className="bg-slate-50 p-6 rounded-[24px] border border-slate-100">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Compras al Por Mayor</span>
                                <div className="text-xl font-black text-slate-900 mt-1">
                                    {history.filter(h => h.amount > 0).reduce((acc, h) => acc + h.amount, 0).toFixed(2)} BS
                                </div>
                            </div>
                            <div className="bg-emerald-50/50 p-6 rounded-[24px] border border-emerald-100">
                                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em]">Total Liquidado</span>
                                <div className="text-xl font-black text-emerald-600 mt-1">
                                    {Math.abs(history.filter(h => h.amount < 0).reduce((acc, h) => acc + h.amount, 0)).toFixed(2)} BS
                                </div>
                            </div>
                            <div className="p-6 rounded-[32px] bg-slate-900 shadow-2xl shadow-slate-200">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Deuda a Saldar</span>
                                <div className="text-3xl font-black text-white tracking-tighter mt-1">
                                    {selectedSupplier.current_balance.toFixed(2)} BS
                                </div>
                            </div>
                        </div>

                        {/* Payment Input */}
                        {selectedSupplier.current_balance > 0 && (
                            <div className="pt-6 border-t border-slate-100 space-y-4 animate-in slide-in-from-bottom-4">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Registrar Pago a Proveedor</label>
                                    <input 
                                        type="number"
                                        placeholder="Monto a pagar..."
                                        max={selectedSupplier.current_balance}
                                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-xl text-slate-900 outline-none focus:border-emerald-500 transition-all placeholder:text-slate-300"
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                    />
                                </div>
                                <button 
                                    disabled={isSubmitting || !paymentAmount}
                                    onClick={() => handleQuickPayment(selectedSupplier)}
                                    className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[24px] font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-100 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Procesando...' : 'Confirmar Abono'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
