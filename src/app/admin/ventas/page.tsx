'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { 
  History as HistoryIcon,
  Package,
  Plus,
  ChevronRight,
  Eye,
  Calendar,
  MoreVertical,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Hash,
  CheckCircle2,
  Search,
  User as UserIcon
} from 'lucide-react';
import Link from 'next/link';
import SaleDetailModal from '@/components/SaleDetailModal';

export default function VentasHistoryPage() {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Details Modal
  const [showDetails, setShowDetails] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    setLoading(true);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data, error } = await supabase
      .from('sales')
      .select('*, customers(name), warehouses(name), payments(amount_cash, amount_qr), profiles(full_name)')
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString())
      .order('created_at', { ascending: false });
    
    if (error) console.error(error);
    else setSales(data || []);
    setLoading(false);
  };

  const openSaleDetails = (sale: any) => {
    setSelectedSale(sale);
    setShowDetails(true);
  };

  const filteredSales = sales.filter(s => 
    (s.customers?.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
    s.id.includes(search) ||
    (s.profiles?.full_name?.toLowerCase() || '').includes(search.toLowerCase())
  );

  // Stats (calculated from today's sales which are the only ones loaded now)
  const totalToday = sales.reduce((acc, s) => acc + s.total_amount, 0);

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase leading-none">Ventas del Día</h1>
          <p className="text-slate-500 mt-2 font-medium text-sm">Historial exclusivo de las transacciones de hoy.</p>
        </div>
        <div className="flex space-x-3 w-full sm:w-auto">
            <button 
                onClick={fetchSales}
                className="p-4 bg-white border border-slate-200 rounded-3xl text-slate-400 hover:text-blue-600 transition-all shadow-sm active:scale-95"
            >
                <Calendar className="w-6 h-6" />
            </button>
            <Link
              href="/admin/ventas/nueva"
              className="flex-1 sm:flex-none flex items-center justify-center space-x-3 bg-slate-900 hover:bg-blue-600 text-white px-8 py-4 rounded-[28px] font-black transition-all active:scale-95 shadow-xl shadow-slate-200 uppercase tracking-widest text-xs"
            >
              <Plus className="w-5 h-5" />
              <span>Nueva Venta</span>
            </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-200 shadow-sm flex items-center space-x-6">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                <TrendingUp className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <div className="min-w-0">
                <div className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Caja Hoy</div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tighter truncate">{totalToday.toFixed(2)} BS</div>
            </div>
        </div>
        <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-200 shadow-sm flex items-center space-x-6">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <div className="min-w-0">
                <div className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Ventas</div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tighter truncate">{sales.length} hoy</div>
            </div>
        </div>
        <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-200 shadow-sm flex items-center space-x-6 sm:col-span-2 lg:col-span-1">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center shrink-0">
                <UserIcon className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <div className="min-w-0">
                <div className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Vendedores</div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tighter truncate">
                   {new Set(sales.map(s => s.seller_id)).size} activos
                </div>
            </div>
        </div>
      </div>

      {/* Search & List */}
      <div className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 sm:p-8 border-b border-slate-100 flex items-center space-x-4 bg-slate-50/30">
            <Search className="w-6 h-6 text-slate-300" />
            <input 
                type="text" 
                placeholder="Buscar cliente, vendedor o ID..." 
                className="bg-transparent outline-none flex-1 text-slate-900 font-bold placeholder:text-slate-300 text-sm sm:text-base"
                value={search}
                onChange={e => setSearch(e.target.value)}
            />
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50/50">
                        <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Hora</th>
                        <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Recibo / Cliente</th>
                        <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Vendedor</th>
                        <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Metodo</th>
                        <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total</th>
                        <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Acción</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {loading ? (
                        [1,2,3,4,5].map(i => <tr key={i} className="animate-pulse"><td colSpan={6} className="h-24 bg-slate-50/30"></td></tr>)
                    ) : filteredSales.length === 0 ? (
                        <tr><td colSpan={6} className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">No se registraron ventas hoy aún.</td></tr>
                    ) : filteredSales.map(s => (
                        <tr key={s.id} className="hover:bg-slate-50 transition-all group">
                            <td className="px-10 py-6">
                                <div className="flex flex-col leading-tight">
                                    <span className="font-black text-slate-800 uppercase text-[11px]">{new Date(s.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    <span className="text-[9px] text-slate-400 font-bold">{new Date(s.created_at).toLocaleDateString()}</span>
                                </div>
                            </td>
                             <td className="px-10 py-6">
                                <span className="font-black text-blue-600 text-sm tracking-tight">
                                    {s.receipt_number ? `#${String(s.receipt_number).padStart(4, '0')}` : `#${s.id.slice(0,8).toUpperCase()}`}
                                </span>
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">{s.customers?.name || 'Consumidor Final'}</div>
                            </td>
                            <td className="px-10 py-6">
                                <div className="flex items-center space-x-3">
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black uppercase shadow-sm ${s.profiles ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                        {s.profiles?.full_name?.charAt(0) || (s.seller_id ? '?' : 'S')}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-black text-slate-700 uppercase leading-none">
                                            {s.profiles?.full_name || (s.seller_id ? 'Vendedor' : 'Sistema')}
                                        </span>
                                    </div>
                                </div>
                            </td>
                            <td className="px-10 py-6">
                                <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                    s.payment_method === 'cash' ? 'bg-green-50 text-green-600 border-green-100' :
                                    s.payment_method === 'qr' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                    s.payment_method === 'credit' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                                }`}>
                                    {s.payment_method}
                                </span>
                            </td>
                            <td className="px-10 py-6">
                                <span className="font-black text-slate-900 text-base tracking-tighter">{s.total_amount.toFixed(2)} BS</span>
                            </td>
                            <td className="px-10 py-6 text-right">
                                <button 
                                    onClick={() => openSaleDetails(s)}
                                    className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm active:scale-95"
                                >
                                    <Eye className="w-5 h-5" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/* Mobile List View */}
        <div className="md:hidden divide-y divide-slate-100">
            {loading ? (
                [1,2,3].map(i => <div key={i} className="p-6 animate-pulse space-y-3"><div className="h-4 bg-slate-100 rounded w-1/2"></div><div className="h-8 bg-slate-100 rounded"></div></div>)
            ) : filteredSales.length === 0 ? (
                <div className="p-10 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">No hay registros</div>
            ) : filteredSales.map(s => (
                <button 
                    key={s.id} 
                    onClick={() => openSaleDetails(s)}
                    className="w-full p-6 text-left hover:bg-slate-50 transition-all active:bg-slate-100"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <span className="font-black text-blue-600 text-xs tracking-tight bg-blue-50 px-2 py-1 rounded-lg">
                                {s.receipt_number ? `#${String(s.receipt_number).padStart(4, '0')}` : `#${s.id.slice(0,8).toUpperCase()}`}
                            </span>
                            <h4 className="font-black text-slate-900 uppercase text-sm mt-2">{s.customers?.name || 'Consumidor Final'}</h4>
                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">
                                {new Date(s.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • Por: {s.profiles?.full_name || (s.seller_id ? 'Vendedor' : 'Sistema')}
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="text-lg font-black text-slate-900 leading-none">{s.total_amount.toFixed(2)}</div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Bolivianos</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                         <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                s.payment_method === 'cash' ? 'bg-green-50 text-green-600 border-green-100' :
                                s.payment_method === 'qr' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                s.payment_method === 'credit' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                            }`}>
                                {s.payment_method}
                        </span>
                        <div className="flex items-center text-blue-600 font-black text-[10px] uppercase tracking-widest">
                            Detalles <ChevronRight className="w-3 h-3 ml-1" />
                        </div>
                    </div>
                </button>
            ))}
        </div>
      </div>

      <SaleDetailModal 
        isOpen={showDetails} 
        sale={selectedSale} 
        onClose={() => setShowDetails(false)} 
        onVoidSuccess={fetchSales}
      />
    </div>
  );
}
