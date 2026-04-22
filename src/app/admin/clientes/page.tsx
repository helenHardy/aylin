'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { 
  Users, 
  Plus, 
  Search, 
  Phone, 
  MapPin, 
  History as HistoryIcon, 
  DollarSign,
  X,
  CheckCircle2,
  Trash2,
  Package,
  ArrowRightCircle
} from 'lucide-react';
import SaleDetailModal from '@/components/SaleDetailModal';
import { cn } from '@/utils/cn';

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  current_balance: number;
  created_at: string;
}

export default function ClientesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCustomerToPay, setSelectedCustomerToPay] = useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [isPaying, setIsPaying] = useState(false);
  
  // History Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedCustomerHistory, setSelectedCustomerHistory] = useState<Customer | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name', { ascending: true });

    if (error) console.error(error);
    else setCustomers(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { error } = await supabase
      .from('customers')
      .insert([{ name, phone: phone || null, address: address || null }]);

    if (error) alert(error.message);
    else {
      setShowModal(false);
      setName('');
      setPhone('');
      setAddress('');
      fetchCustomers();
    }
    setIsSubmitting(false);
  };

  const processPayment = async (customerId: string, amount: number, notes: string, onSuccess: () => void) => {
    if (isPaying || amount <= 0) return;
    setIsPaying(true);

    try {
        const { error } = await supabase
          .from('debt_ledger')
          .insert([{ 
             customer_id: customerId, 
             amount: -amount, 
             type: 'payment',
             notes: notes || 'Cobro de deuda' 
          }]);

        if (error) throw error;
        
        onSuccess();
        fetchCustomers();
    } catch (err: any) {
        alert(err.message || 'Error al procesar el pago');
    } finally {
        setIsPaying(false);
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerToPay || !paymentAmount) return;
    
    await processPayment(
        selectedCustomerToPay.id, 
        Number(paymentAmount), 
        'Cobro de deuda (vía modal)',
        () => {
            setShowPaymentModal(false);
            setPaymentAmount('');
            setSelectedCustomerToPay(null);
        }
    );
  };

  // Detail Modal Logic
  const [showSaleDetail, setShowSaleDetail] = useState(false);
  const [selectedSaleObj, setSelectedSaleObj] = useState<any>(null);

  const openSaleDetail = async (saleId: string | null) => {
    if (!saleId) return;
    
    const { data } = await supabase
        .from('sales')
        .select('*, customers(name)')
        .eq('id', saleId)
        .single();
    
    if (data) {
        setSelectedSaleObj(data);
        setShowSaleDetail(true);
    }
  };

  const fetchHistory = async (customer: Customer) => {
    setSelectedCustomerHistory(customer);
    setShowHistoryModal(true);
    setLoadingHistory(true);
    setPaymentAmount(''); // Reset payment input
    
    const { data, error } = await supabase
      .from('debt_ledger')
      .select('*')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false });
    
    if (error) console.error(error);
    else setHistory(data || []);
    setLoadingHistory(false);
  };

  const handleQuickPayment = async (customer: Customer) => {
    if (!paymentAmount) return;
    
    await processPayment(
        customer.id, 
        Number(paymentAmount), 
        'Cobro de deuda (vía historial)',
        () => {
            setPaymentAmount('');
            fetchHistory(customer);
        }
    );
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.phone && c.phone.includes(searchTerm))
  );

  return (
    <div className="space-y-8 pb-24">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
        <div className="flex items-center space-x-6">
            <div className="w-16 h-16 bg-blue-600 rounded-[24px] flex items-center justify-center text-white shadow-xl shadow-blue-100">
                <Users className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Clientes</h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Control de saldos y créditos</p>
            </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="w-full md:w-auto flex items-center justify-center space-x-3 bg-slate-900 hover:bg-blue-600 text-white px-8 py-5 rounded-[24px] font-black shadow-2xl shadow-slate-200 transition-all active:scale-95 uppercase tracking-[0.2em] text-[10px]"
        >
          <Plus className="w-5 h-5" />
          <span>Añadir Cliente</span>
        </button>
      </div>

      {/* Stats Cards (Optional but adds value) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Clientes</div>
              <div className="text-2xl font-black text-slate-900">{customers.length}</div>
          </div>
          <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
              <div className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-1">Con Deuda</div>
              <div className="text-2xl font-black text-red-600">{customers.filter(c => c.current_balance > 0).length}</div>
          </div>
          <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
              <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">Total Deuda</div>
              <div className="text-2xl font-black text-slate-900">{customers.reduce((acc, c) => acc + c.current_balance, 0).toFixed(2)}</div>
          </div>
          <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
              <div className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Al día</div>
              <div className="text-2xl font-black text-blue-600">{customers.filter(c => c.current_balance <= 0).length}</div>
          </div>
      </div>

      {/* Search Bar */}
      <div className="relative group">
          <div className="absolute inset-y-0 left-8 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
              <Search className="w-5 h-5" />
          </div>
          <input 
            type="text"
            placeholder="Buscar por nombre o celular..."
            className="w-full bg-white border border-slate-100 rounded-[32px] py-6 pl-20 pr-8 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-slate-900 shadow-sm placeholder:text-slate-300 placeholder:font-black placeholder:uppercase placeholder:text-[10px] placeholder:tracking-widest"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        {loading ? (
          [1,2,3,4,5,6,7,8].map(i => <div key={i} className="h-64 bg-white animate-pulse rounded-[32px] border border-slate-100"></div>)
        ) : filteredCustomers.length === 0 ? (
          <div className="col-span-full py-20 text-center flex flex-col items-center">
              <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center text-slate-200 mb-6 border border-slate-100">
                  <Search className="w-10 h-10" />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {searchTerm ? 'No se encontraron clientes para esta búsqueda' : 'No hay clientes registrados'}
              </p>
          </div>
        ) : filteredCustomers.map(c => (
          <div key={c.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-2xl hover:border-blue-500/30 transition-all duration-500 group flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div className="w-14 h-14 bg-slate-50 rounded-[22px] flex items-center justify-center text-slate-300 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors border border-slate-100 group-hover:border-blue-100">
                <Users className="w-6 h-6" />
              </div>
              <div className={cn(
                "px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-sm border animate-in fade-in zoom-in",
                c.current_balance > 0 ? "bg-red-50 text-red-600 border-red-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
              )}>
                {c.current_balance > 0 ? `Debe ${c.current_balance.toFixed(2)} BS` : 'Al día'}
              </div>
            </div>
            
            <div className="space-y-4 flex-1">
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight group-hover:text-blue-600 transition-colors">{c.name}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Registrado {new Date(c.created_at).toLocaleDateString()}</p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center text-slate-600 text-xs font-bold bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <Phone className="w-4 h-4 mr-3 text-blue-500" />
                  {c.phone || 'Sin teléfono'}
                </div>
                {c.address && (
                  <div className="flex items-start text-slate-600 text-xs font-bold bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <MapPin className="w-4 h-4 mr-3 text-blue-500 mt-0.5" />
                    <span className="leading-relaxed truncate">{c.address}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex gap-3">
              <button 
                onClick={() => fetchHistory(c)}
                className="flex-1 flex items-center justify-center space-x-2 bg-slate-50 hover:bg-slate-100 text-slate-900 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
              >
                <HistoryIcon className="w-4 h-4" />
                <span>Historial</span>
              </button>
              {c.current_balance > 0 && (
                <button 
                  onClick={() => { setSelectedCustomerToPay(c); setShowPaymentModal(true); }}
                  className="flex-1 flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-emerald-100"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Cobrar</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
          <div className="bg-white rounded-[48px] shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in duration-300">
            <div className="px-10 py-10 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
              <div>
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Nuevo Cliente</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Ingresa los datos personales</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-4 bg-white hover:bg-slate-100 rounded-2xl text-slate-300 transition-colors shadow-sm">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-10 space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nombre Completo</label>
                <input
                  required
                  className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-3xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-slate-900 font-black uppercase text-sm placeholder:text-slate-300"
                  placeholder="Ej: Juan Pérez"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Teléfono / WhatsApp</label>
                <input
                  className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-3xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-slate-900 font-black text-sm placeholder:text-slate-300"
                  placeholder="Ej: 77712345"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Dirección de Entrega</label>
                <textarea
                  className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-3xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all resize-none text-slate-900 font-black uppercase text-sm placeholder:text-slate-300"
                  rows={2}
                  placeholder="Calle, Barrio, Ciudad..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-6 bg-slate-900 hover:bg-blue-600 text-white font-black rounded-3xl shadow-2xl shadow-slate-200 transition-all active:scale-[0.98] uppercase text-[10px] tracking-[0.2em]"
              >
                {isSubmitting ? 'Guardando...' : 'Registrar Cliente'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Unified History & Payment Modal */}
      {showHistoryModal && selectedCustomerHistory && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-0 md:p-4 z-[100] animate-in fade-in duration-300">
          <div className="bg-white md:rounded-[48px] shadow-2xl max-w-5xl w-full h-full md:h-[85vh] flex flex-col md:flex-row overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
            
            {/* Left Section: History List */}
            <div className="w-full md:flex-1 flex flex-col min-w-0 bg-slate-50/50 md:overflow-hidden">
                <div className="px-8 md:px-12 py-10 border-b border-slate-100 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter">Historial</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{selectedCustomerHistory.name}</p>
                    </div>
                    <button onClick={() => setShowHistoryModal(false)} className="md:hidden p-3 bg-white rounded-2xl shadow-sm text-slate-400"><X className="w-6 h-6" /></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-4">
                    {loadingHistory ? (
                        <div className="py-20 text-center animate-pulse text-slate-300 font-black uppercase tracking-widest text-[10px]">Cargando transacciones...</div>
                    ) : history.length === 0 ? (
                        <div className="py-20 text-center text-slate-300 opacity-50 flex flex-col items-center">
                            <div className="w-16 h-16 bg-slate-100 rounded-[24px] flex items-center justify-center mb-6"><HistoryIcon className="w-8 h-8" /></div>
                            <span className="text-[10px] font-black uppercase tracking-widest">Sin movimientos</span>
                        </div>
                    ) : (
                        history.map((h, index) => {
                            const historyInOrder = [...history].reverse();
                            const currentIndex = history.length - 1 - index;
                            const runningBalance = historyInOrder
                                .slice(0, currentIndex + 1)
                                .reduce((acc, curr) => acc + curr.amount, 0);

                            return (
                                <div key={h.id} className="bg-white p-5 md:p-6 rounded-[28px] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-all">
                                    <div className="flex items-center space-x-4">
                                        <div className={`w-12 h-12 rounded-[18px] flex items-center justify-center shadow-inner border border-white ${
                                            h.type === 'sale' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                                        }`}>
                                            {h.type === 'sale' ? <HistoryIcon className="w-6 h-6" /> : <DollarSign className="w-6 h-6" />}
                                        </div>
                                        <div>
                                            <div className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-2">
                                                {new Date(h.created_at).toLocaleString()}
                                            </div>
                                            <div className="font-black text-slate-800 uppercase text-xs">
                                                {h.type === 'sale' ? (
                                                    <button 
                                                        onClick={() => openSaleDetail(h.reference_id)}
                                                        className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                                                    >
                                                        Recibo #{h.reference_id?.slice(0,8)}
                                                        <ArrowRightCircle className="w-3.5 h-3.5 ml-2" />
                                                    </button>
                                                ) : 'Abono Registrado'}
                                            </div>
                                            <div className="text-[9px] text-slate-400 font-bold mt-1">
                                                Saldo: <span className={cn("font-black", runningBalance > 0 ? "text-red-500" : "text-emerald-500")}>{runningBalance.toFixed(2)} BS</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`text-base font-black tracking-tight ${
                                        h.amount > 0 ? 'text-red-600' : 'text-emerald-600'
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
            <div className="w-full md:w-[400px] bg-white border-t md:border-t-0 md:border-l border-slate-100 flex flex-col shrink-0">
                <div className="p-8 md:p-12 flex flex-col h-full">
                    <div className="hidden md:flex justify-end mb-8">
                        <button onClick={() => setShowHistoryModal(false)} className="p-4 bg-slate-50 text-slate-300 hover:text-slate-600 rounded-2xl transition-colors shadow-sm">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="space-y-8 flex-1">
                        <div className="space-y-4">
                            <div className="bg-slate-50 p-6 md:p-8 rounded-[32px] border border-slate-100 shadow-inner">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Compras Totales</span>
                                <div className="text-2xl font-black text-slate-900 mt-2">
                                    {history.filter(h => h.amount > 0).reduce((acc, h) => acc + h.amount, 0).toFixed(2)} <span className="text-sm text-slate-300">BS</span>
                                </div>
                            </div>
                            <div className="p-8 md:p-10 rounded-[40px] bg-slate-900 shadow-2xl shadow-slate-200">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Deuda Pendiente</span>
                                <div className="text-4xl font-black text-white tracking-tighter mt-2">
                                    {selectedCustomerHistory.current_balance.toFixed(2)} <span className="text-base text-slate-400 font-medium">BS</span>
                                </div>
                            </div>
                        </div>

                        {selectedCustomerHistory.current_balance > 0 && (
                            <div className="pt-8 border-t border-slate-100 space-y-6 animate-in slide-in-from-top-4">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Monto a Cobrar</label>
                                    <div className="relative">
                                        <input 
                                            type="number"
                                            placeholder="0.00"
                                            max={selectedCustomerHistory.current_balance}
                                            className="w-full p-6 bg-emerald-50/50 border border-emerald-100 rounded-[28px] font-black text-4xl text-emerald-700 outline-none focus:ring-4 focus:ring-emerald-500/10 tracking-tighter"
                                            value={paymentAmount}
                                            onChange={(e) => setPaymentAmount(e.target.value ? Number(e.target.value) : '')}
                                        />
                                        <span className="absolute right-8 top-1/2 -translate-y-1/2 font-black text-emerald-200">BS</span>
                                    </div>
                                </div>
                                <button 
                                    disabled={isPaying || !paymentAmount}
                                    onClick={() => handleQuickPayment(selectedCustomerHistory)}
                                    className="w-full py-6 bg-emerald-600 hover:bg-blue-600 text-white rounded-[28px] font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-emerald-100 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-3"
                                >
                                    <CheckCircle2 className="w-5 h-5" />
                                    <span>Registrar Pago</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Shared Sale Detail Modal */}
      <SaleDetailModal 
        isOpen={showSaleDetail}
        sale={selectedSaleObj}
        onClose={() => setShowSaleDetail(false)}
        onVoidSuccess={() => {
            if (selectedCustomerHistory) fetchHistory(selectedCustomerHistory);
            fetchCustomers();
        }}
      />

      {/* Quick Payment Modal */}
      {showPaymentModal && selectedCustomerToPay && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
          <div className="bg-white rounded-[48px] shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in duration-300 p-10">
            <div className="flex justify-between items-center mb-8">
              <div>
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Cobrar</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{selectedCustomerToPay.name}</p>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl text-slate-300 transition-colors shadow-sm">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handlePayment} className="space-y-8">
              <div className="text-center bg-red-50/50 border border-red-100 p-6 rounded-[32px] shadow-inner">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-red-400 mb-2">Deuda Pendiente</p>
                <div className="text-4xl font-black text-red-600 tracking-tighter">{selectedCustomerToPay.current_balance.toFixed(2)} <span className="text-base font-medium">BS</span></div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Monto a Abonar</label>
                <div className="relative">
                    <input
                      required
                      type="number"
                      min="0.1"
                      step="0.1"
                      max={selectedCustomerToPay.current_balance}
                      className="w-full p-6 bg-slate-50 border border-slate-200 rounded-[28px] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-slate-900 font-black text-3xl text-center tracking-tighter"
                      placeholder="0.00"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value ? Number(e.target.value) : '')}
                    />
                </div>
              </div>

              <button
                type="submit"
                disabled={isPaying || !paymentAmount}
                className="w-full py-6 bg-emerald-600 hover:bg-blue-600 text-white font-black rounded-[28px] shadow-2xl shadow-emerald-100 transition-all active:scale-[0.98] flex items-center justify-center uppercase text-[10px] tracking-[0.2em] space-x-3 disabled:opacity-50"
              >
                <DollarSign className="w-5 h-5" />
                <span>{isPaying ? 'Procesando...' : 'Confirmar Pago'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


