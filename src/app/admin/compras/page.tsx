'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { 
  ShoppingBag, 
  Plus, 
  Search, 
  Calendar, 
  Truck, 
  Warehouse,
  ChevronRight,
  Package,
  X,
  User as UserIcon,
  Hash,
  DollarSign
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/utils/cn';

export default function ComprasPage() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Details Modal
  const [selectedPurchase, setSelectedPurchase] = useState<any | null>(null);
  const [purchaseItems, setPurchaseItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    fetchPurchases();
  }, []);

  const fetchPurchases = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('purchases')
      .select('*, suppliers(name), warehouses(name), purchase_items(count)')
      .order('created_at', { ascending: false });
    
    if (error) console.error(error);
    else setPurchases(data || []);
    setLoading(false);
  };

  const fetchPurchaseDetails = async (purchase: any) => {
    setSelectedPurchase(purchase);
    setLoadingItems(true);
    const { data, error } = await supabase
        .from('purchase_items')
        .select('*, products(name, brand, color, brands(name), categories(name), product_models(name))')
        .eq('purchase_id', purchase.id);
    
    if (!error) setPurchaseItems(data || []);
    setLoadingItems(false);
  };

  const filtered = purchases.filter(p => 
    p.suppliers?.name.toLowerCase().includes(search.toLowerCase()) ||
    p.id.includes(search)
  );

  const totalInversion = purchases.reduce((acc, p) => acc + p.total_amount, 0);

  return (
    <div className="space-y-8 pb-24">
      {/* Header Section */}
      <div className="bg-white p-8 md:p-10 rounded-[48px] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div className="flex items-center space-x-6">
            <div className="w-16 h-16 bg-emerald-600 rounded-[24px] flex items-center justify-center text-white shadow-2xl shadow-emerald-100">
                <ShoppingBag className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Compras</h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Registro de Abastecimiento</p>
            </div>
        </div>
        <Link
          href="/admin/compras/nueva"
          className="w-full md:w-auto flex items-center justify-center space-x-3 bg-slate-900 hover:bg-emerald-600 text-white px-10 py-5 rounded-[24px] font-black shadow-2xl shadow-slate-200 transition-all active:scale-95 uppercase tracking-[0.2em] text-[10px]"
        >
          <Plus className="w-5 h-5" />
          <span>Nueva Compra</span>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Compras</div>
              <div className="text-2xl font-black text-slate-900">{purchases.length}</div>
          </div>
          <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
              <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">Inversión Total</div>
              <div className="text-2xl font-black text-slate-900">{totalInversion.toFixed(2)}</div>
          </div>
          <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
              <div className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Proveedores</div>
              <div className="text-2xl font-black text-blue-600">{new Set(purchases.map(p => p.suppliers?.name)).size}</div>
          </div>
          <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
              <div className="text-[9px] font-black text-orange-400 uppercase tracking-widest mb-1">Promedio</div>
              <div className="text-2xl font-black text-slate-900">{purchases.length > 0 ? (totalInversion / purchases.length).toFixed(2) : '0.00'}</div>
          </div>
      </div>

      {/* Search Bar */}
      <div className="relative group">
          <div className="absolute inset-y-0 left-8 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">
              <Search className="w-5 h-5" />
          </div>
          <input 
            type="text"
            placeholder="Buscar por proveedor o ID..."
            className="w-full bg-white border border-slate-100 rounded-[32px] py-6 pl-20 pr-8 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-slate-900 shadow-sm placeholder:text-slate-300 placeholder:font-black placeholder:uppercase placeholder:text-[10px] placeholder:tracking-widest"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Compra #</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Proveedor</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Depósito</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Detalle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
                [1,2,3].map(i => <tr key={i} className="animate-pulse"><td colSpan={6} className="h-20 bg-slate-50/20"></td></tr>)
            ) : filtered.length === 0 ? (
                <tr>
                    <td colSpan={6} className="py-20 text-center">
                        <div className="flex flex-col items-center">
                            <Search className="w-10 h-10 text-slate-200 mb-4" />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {search ? 'No se encontraron resultados' : 'No hay compras registradas'}
                            </p>
                        </div>
                    </td>
                </tr>
            ) : filtered.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => fetchPurchaseDetails(p)}>
                    <td className="px-8 py-6">
                        <div className="flex flex-col">
                            <span className="font-black text-slate-800 uppercase text-xs">{new Date(p.created_at).toLocaleDateString()}</span>
                            <span className="text-[10px] text-slate-400 font-bold">{new Date(p.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                    </td>
                    <td className="px-8 py-6">
                        <span className="font-black text-emerald-600 text-sm bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                            {p.purchase_number ? `#${String(p.purchase_number).padStart(4, '0')}` : `#${p.id.slice(0,8).toUpperCase()}`}
                        </span>
                    </td>
                    <td className="px-8 py-6">
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-[14px] flex items-center justify-center group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors border border-slate-100">
                                <Truck className="w-5 h-5" />
                            </div>
                            <span className="font-black text-slate-900 text-sm uppercase">{p.suppliers?.name}</span>
                        </div>
                    </td>
                    <td className="px-8 py-6">
                        <span className="text-xs font-black text-slate-400 uppercase">{p.warehouses?.name || '—'}</span>
                    </td>
                    <td className="px-8 py-6">
                        <span className="font-black text-slate-900 text-lg tracking-tighter">{p.total_amount.toFixed(2)} <span className="text-[10px] text-slate-400">BS</span></span>
                    </td>
                    <td className="px-8 py-6 text-right">
                         <button 
                            className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm active:scale-95 opacity-0 group-hover:opacity-100"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </td>
                </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="h-40 bg-white animate-pulse rounded-[28px] border border-slate-100"></div>)
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-[32px] border border-slate-100 py-20 text-center flex flex-col items-center">
              <Search className="w-10 h-10 text-slate-200 mb-4" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {search ? 'Sin resultados' : 'No hay compras'}
              </p>
          </div>
        ) : filtered.map(p => (
          <div 
            key={p.id} 
            onClick={() => fetchPurchaseDetails(p)}
            className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm hover:shadow-xl active:bg-slate-50 transition-all cursor-pointer group"
          >
            {/* Top Row: Number + Date */}
            <div className="flex justify-between items-start mb-5">
              <div>
                <span className="font-black text-emerald-600 text-sm bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 inline-block">
                  {p.purchase_number ? `#${String(p.purchase_number).padStart(4, '0')}` : `#${p.id.slice(0,8).toUpperCase()}`}
                </span>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(p.created_at).toLocaleDateString()}</div>
                <div className="text-[9px] font-bold text-slate-300">{new Date(p.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
              </div>
            </div>

            {/* Supplier */}
            <div className="flex items-center space-x-3 mb-5">
              <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-[14px] flex items-center justify-center group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors border border-slate-100">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 uppercase text-xs tracking-tight">{p.suppliers?.name}</h3>
                {p.warehouses?.name && <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{p.warehouses.name}</p>}
              </div>
            </div>

            {/* Bottom: Total + Arrow */}
            <div className="flex justify-between items-center pt-5 border-t border-slate-50">
              <div>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Total Invertido</span>
                <span className="text-xl font-black text-slate-900 tracking-tighter">{p.total_amount.toFixed(2)} <span className="text-[10px] text-slate-400">BS</span></span>
              </div>
              <div className="w-10 h-10 bg-slate-50 rounded-[14px] flex items-center justify-center text-slate-300 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors border border-slate-100">
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Details Modal */}
      {selectedPurchase && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-4 z-[100] animate-in fade-in duration-300">
              <div className="bg-white w-full md:max-w-2xl md:rounded-[48px] rounded-t-[32px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500 flex flex-col max-h-[92vh] md:max-h-[85vh]">
                   {/* Modal Header */}
                   <div className="px-8 md:px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                      <div>
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Detalle de Compra</h2>
                        <div className="flex items-center space-x-3 mt-2">
                            <span className="text-sm font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-100">
                                {selectedPurchase.purchase_number ? `#${String(selectedPurchase.purchase_number).padStart(4, '0')}` : `#${selectedPurchase.id.slice(0,8).toUpperCase()}`}
                            </span>
                            <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(selectedPurchase.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                      <button onClick={() => setSelectedPurchase(null)} className="p-4 bg-white rounded-2xl text-slate-300 hover:text-slate-600 transition-colors shadow-sm border border-slate-100">
                          <X className="w-5 h-5" />
                      </button>
                  </div>

                  {/* Modal Body */}
                  <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                      {/* Info Cards */}
                      <div className="grid grid-cols-2 gap-3">
                          <div className="p-5 bg-slate-50 rounded-[20px] border border-slate-100">
                              <div className="flex items-center space-x-2 mb-2">
                                  <Truck className="w-4 h-4 text-slate-400" />
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Proveedor</span>
                              </div>
                              <div className="font-black text-slate-900 text-sm uppercase">{selectedPurchase.suppliers?.name}</div>
                          </div>
                          <div className="p-5 bg-slate-50 rounded-[20px] border border-slate-100">
                              <div className="flex items-center space-x-2 mb-2">
                                  <Warehouse className="w-4 h-4 text-slate-400" />
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Depósito</span>
                              </div>
                              <div className="font-black text-slate-900 text-sm uppercase">{selectedPurchase.warehouses?.name}</div>
                          </div>
                      </div>

                      {/* Items - Desktop Table */}
                      <div className="hidden md:block border border-slate-100 rounded-[20px] overflow-hidden">
                          <table className="w-full text-left">
                              <thead className="bg-slate-50/50">
                                  <tr>
                                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Producto</th>
                                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Cant.</th>
                                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Costo U.</th>
                                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                  {loadingItems ? (
                                      <tr><td colSpan={4} className="py-12 text-center animate-pulse text-slate-400 font-bold text-xs uppercase tracking-widest">Cargando ítems...</td></tr>
                                  ) : purchaseItems.map(item => (
                                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                          <td className="px-6 py-4">
                                              <div className="font-black text-slate-900 text-sm uppercase">{item.products?.name}</div>
                                              <div className="flex flex-wrap gap-1 mt-1.5">
                                                {item.products?.brands?.name && <span className="text-[8px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md uppercase border border-slate-200/50">{item.products.brands.name}</span>}
                                                {item.products?.product_models?.name && <span className="text-[8px] font-black bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded-md uppercase border border-blue-100/50">{item.products.product_models.name}</span>}
                                              </div>
                                          </td>
                                          <td className="px-6 py-4 text-center font-black text-slate-900">{item.quantity}</td>
                                          <td className="px-6 py-4 text-right font-bold text-slate-600 text-sm">{item.unit_cost.toFixed(2)}</td>
                                          <td className="px-6 py-4 text-right font-black text-slate-900">{item.total.toFixed(2)} BS</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>

                      {/* Items - Mobile Cards */}
                      <div className="md:hidden space-y-3">
                          {loadingItems ? (
                            [1,2,3].map(i => <div key={i} className="h-24 bg-slate-50 animate-pulse rounded-2xl"></div>)
                          ) : purchaseItems.map(item => (
                            <div key={item.id} className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex-1 min-w-0 mr-4">
                                  <h4 className="font-black text-slate-900 text-xs uppercase truncate">{item.products?.name}</h4>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {item.products?.brands?.name && <span className="text-[7px] font-black bg-white text-slate-400 px-1.5 py-0.5 rounded-md uppercase border border-slate-200/50">{item.products.brands.name}</span>}
                                    {item.products?.product_models?.name && <span className="text-[7px] font-black bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded-md uppercase border border-blue-100/50">{item.products.product_models.name}</span>}
                                  </div>
                                </div>
                                <span className="font-black text-slate-900 text-sm shrink-0">{item.total.toFixed(2)} BS</span>
                              </div>
                              <div className="flex gap-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                <span>Cant: <span className="text-slate-900">{item.quantity}</span></span>
                                <span>C/U: <span className="text-slate-900">{item.unit_cost.toFixed(2)}</span></span>
                              </div>
                            </div>
                          ))}
                      </div>

                      {/* Total Footer */}
                      <div className="flex justify-between items-center p-6 bg-slate-900 rounded-[20px] text-white">
                          <span className="font-black uppercase text-[10px] tracking-widest opacity-60">Total Invertido</span>
                          <span className="text-2xl md:text-3xl font-black tracking-tighter">{selectedPurchase.total_amount.toFixed(2)} <span className="text-sm opacity-60">BS</span></span>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
