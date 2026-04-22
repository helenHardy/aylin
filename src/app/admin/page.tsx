'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  AlertTriangle, 
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  ShoppingCart
} from 'lucide-react';

interface Stats {
  totalSalesValue: number;
  totalOrders: number;
  totalCustomers: number;
  totalReceivable: number;
  totalPayable: number;
  lowStockItems: number;
  recentSales: any[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalSalesValue: 0,
    totalOrders: 0,
    totalCustomers: 0,
    totalReceivable: 0,
    totalPayable: 0,
    lowStockItems: 0,
    recentSales: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    
    // Get start of today in ISO format
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    // 1. Sales count and total (TODAY ONLY)
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select('total_amount, created_at, seller_id, profiles(full_name), customers(name)')
      .gte('created_at', todayISO);
    
    if (salesError) console.error('Sales Error:', salesError);
    
    const totalSalesValue = (sales || []).reduce((acc, s) => acc + Number(s.total_amount), 0);
    const totalOrders = (sales || []).length;

    // 2. Customer count and receivable (Global)
    const { data: customers } = await supabase.from('customers').select('current_balance');
    const totalReceivable = (customers || []).reduce((acc, c) => acc + (Number(c.current_balance) || 0), 0);

    // 3. Supplier payable (Global)
    const { data: suppliers } = await supabase.from('suppliers').select('current_balance');
    const totalPayable = (suppliers || []).reduce((acc, s) => acc + (Number(s.current_balance) || 0), 0);

    // 4. Low stock (arbitrary threshold < 10)
    const { data: lowStock } = await supabase.from('inventory').select('*').lt('quantity', 10);
    const lowStockItems = (lowStock || []).length;

    setStats({
      totalSalesValue,
      totalOrders,
      totalCustomers: (customers || []).length,
      totalReceivable,
      totalPayable,
      lowStockItems,
      recentSales: (sales || []).slice(-10).reverse()
    });
    setLoading(false);
  };

  return (
    <div className="space-y-10 pb-10">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Panel de Control</h1>
          <p className="text-slate-500 mt-1 font-medium italic">Estado actual de tu negocio para hoy.</p>
        </div>
        <div className="flex items-center space-x-2 text-sm font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100 shadow-sm">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
          <span>EN VIVO</span>
          <span className="text-slate-300 mx-2">|</span>
          <span className="text-slate-500 uppercase tracking-wider">
            {new Date().toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
            title="Ventas de Hoy" 
            value={`${stats.totalSalesValue.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`} 
            unit="BS"
            icon={<DollarSign className="w-6 h-6" />}
            gradient="from-blue-600 to-indigo-600"
            trend={`${stats.totalOrders} pedidos`}
        />
        <StatCard 
            title="Cartera de Clientes" 
            value={`${stats.totalReceivable.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`} 
            unit="BS"
            icon={<TrendingUp className="w-6 h-6" />}
            gradient="from-emerald-500 to-teal-600"
            trend="Por Cobrar"
        />
        <StatCard 
            title="Deuda a Proveedores" 
            value={`${stats.totalPayable.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`} 
            unit="BS"
            icon={<ArrowDownRight className="w-6 h-6" />}
            gradient="from-rose-500 to-red-600"
            trend="Por Pagar"
        />
        <StatCard 
            title="Alertas Stock" 
            value={stats.lowStockItems.toString()} 
            unit="ITEMS"
            icon={<AlertTriangle className="w-6 h-6" />}
            gradient="from-amber-500 to-orange-600"
            trend="Inventario Bajo"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Sales View */}
        <div className="lg:col-span-2 bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm flex flex-col h-full">
          <div className="p-6 sm:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
            <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight">Ventas del Día</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Últimos movimientos</p>
            </div>
            <Link href="/admin/ventas" className="bg-white text-slate-600 px-4 py-2 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-900 hover:text-white transition-all border border-slate-200 shadow-sm active:scale-95">Ver Historial</Link>
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-[10px] uppercase font-black text-slate-400 tracking-widest">
                  <th className="px-8 py-4">Cliente</th>
                  <th className="px-8 py-4">Vendedor</th>
                  <th className="px-8 py-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                    [1,2,3,4].map(i => (
                        <tr key={i} className="animate-pulse">
                            <td colSpan={3} className="px-8 py-6"><div className="h-4 bg-slate-100 rounded-full w-full"></div></td>
                        </tr>
                    ))
                ) : stats.recentSales.length > 0 ? (
                    stats.recentSales.map((sale, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-all group">
                        <td className="px-8 py-6">
                            <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-bold text-sm group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                    {sale.customers?.name?.charAt(0) || 'V'}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900 text-sm">{sale.customers?.name || 'Venta Varios'}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                            </div>
                        </td>
                        <td className="px-8 py-6">
                            <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl uppercase tracking-tighter">
                                {sale.profiles?.full_name?.split(' ')[0] || 'Vendedor'}
                            </span>
                        </td>
                        <td className="px-8 py-6 text-right">
                            <div className="text-base font-black text-slate-900 tracking-tighter">{Number(sale.total_amount).toFixed(2)}</div>
                            <div className="text-[8px] font-black text-slate-300 uppercase leading-none">BS</div>
                        </td>
                    </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan={3} className="px-8 py-20 text-center">
                            <div className="flex flex-col items-center opacity-30">
                                <ShoppingCart className="w-12 h-12 mb-4 text-slate-300" />
                                <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Sin ventas registradas hoy</p>
                            </div>
                        </td>
                    </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="sm:hidden divide-y divide-slate-100 flex-1 overflow-y-auto">
            {loading ? (
                [1,2].map(i => <div key={i} className="p-6 animate-pulse space-y-3"><div className="h-4 bg-slate-100 rounded w-1/2"></div><div className="h-8 bg-slate-100 rounded"></div></div>)
            ) : stats.recentSales.length > 0 ? (
                stats.recentSales.map((sale, i) => (
                    <div key={i} className="p-6 hover:bg-slate-50 active:bg-slate-100 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center font-black text-xs">
                                    {sale.customers?.name?.charAt(0) || 'V'}
                                </div>
                                <div>
                                    <h4 className="font-black text-slate-900 uppercase text-xs truncate max-w-[120px]">{sale.customers?.name || 'Venta Varios'}</h4>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-black text-slate-900 leading-none">{Number(sale.total_amount).toFixed(2)}</div>
                                <span className="text-[8px] font-black text-slate-400 uppercase">BS</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-end">
                            <span className="text-[8px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                POR: {sale.profiles?.full_name || 'VENDEDOR'}
                            </span>
                        </div>
                    </div>
                ))
            ) : (
                <div className="p-10 text-center text-slate-300 opacity-50 flex flex-col items-center">
                    <ShoppingCart className="w-8 h-8 mb-2" />
                    <p className="text-[10px] font-black uppercase">Sin ventas hoy</p>
                </div>
            )}
          </div>
        </div>

        {/* Inventory Alerts & Quick Stats */}
        <div className="space-y-8">
          <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm space-y-6">
            <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Stock Crítico</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Niveles por debajo de 10</p>
            </div>
            
            <div className="space-y-4">
              {loading ? (
                  <div className="h-20 bg-slate-50 animate-pulse rounded-2xl"></div>
              ) : stats.lowStockItems > 0 ? (
                <div className="p-6 bg-red-50 rounded-[24px] border border-red-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <AlertTriangle className="w-16 h-16 text-red-600" />
                    </div>
                    <div className="relative z-10">
                        <div className="text-3xl font-black text-red-600 leading-none mb-1">{stats.lowStockItems}</div>
                        <div className="text-[10px] font-black text-red-400 uppercase tracking-widest">Productos Agotándose</div>
                        <Link href="/admin/inventario" className="inline-flex items-center mt-4 text-[10px] font-black text-red-600 hover:underline uppercase tracking-tighter">
                            Reponer Stock <ArrowUpRight className="w-3 h-3 ml-1" />
                        </Link>
                    </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-slate-100 rounded-[24px] text-slate-300">
                    <CheckCircle2 className="w-10 h-10 mb-2" />
                    <p className="text-[10px] font-black uppercase">Inventario Saludable</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-900 rounded-[32px] p-8 text-white relative overflow-hidden shadow-2xl">
             <div className="absolute -right-10 -bottom-10 opacity-10">
                 <BarChart3 className="w-48 h-48" />
             </div>
             <div className="relative z-10 flex flex-col justify-between h-40">
                <div className="bg-white/10 w-fit p-3 rounded-2xl">
                    <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Métricas de Alcance</p>
                    <div className="text-4xl font-black tracking-tighter">{stats.totalCustomers}</div>
                    <p className="text-sm text-slate-500 font-bold uppercase">Clientes Registrados</p>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, unit, icon, gradient, trend }: { title: string, value: string, unit: string, icon: any, gradient: string, trend: string }) {
  return (
    <div className="bg-white p-1 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 group">
      <div className="p-7 flex flex-col h-full bg-white rounded-[31px]">
          <div className="flex justify-between items-start mb-6">
            <div className={`p-4 rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-lg group-hover:scale-110 transition-transform`}>
              {icon}
            </div>
            <div className="text-right">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{trend}</span>
                <div className="flex items-center justify-end text-emerald-500 text-[10px] font-black">
                    <ArrowUpRight className="w-3 h-3 mr-0.5" /> HOY
                </div>
            </div>
          </div>
          <div>
            <div className="flex items-baseline space-x-1 overflow-hidden">
                <div className="text-3xl font-black text-slate-900 tracking-tighter truncate">{value}</div>
                <div className="text-[10px] font-black text-slate-300 uppercase">{unit}</div>
            </div>
            <div className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-tight">{title}</div>
          </div>
      </div>
    </div>
  );
}

import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
