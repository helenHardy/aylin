'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { 
  ShoppingBag, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Phone, 
  User, 
  Package, 
  Eye,
  Search,
  MessageCircle,
  Check,
  Edit2,
  Plus
} from 'lucide-react';
import SaleDetailModal from '@/components/SaleDetailModal';
import OrderEditModal from '@/components/OrderEditModal';
import OrderApprovalModal from '@/components/OrderApprovalModal';

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [showDetails, setShowDetails] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showApproval, setShowApproval] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<any>(null);

  useEffect(() => {
    fetchPedidos();
  }, []);

  const fetchPedidos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sales')
      .select('*, customers(name, phone), sale_items(*, products(name))')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) console.error(error);
    else setPedidos(data || []);
    setLoading(false);
  };

  const handleStatusUpdate = async (id: string, newStatus: 'completed' | 'cancelled') => {
    const msg = newStatus === 'completed' ? '¿Aprobar este pedido y descontar stock?' : '¿Rechazar este pedido?';
    if (!confirm(msg)) return;

    const { error } = await supabase
      .from('sales')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) alert('Error: ' + error.message);
    else fetchPedidos();
  };

  const filteredPedidos = pedidos.filter(p => 
    p.customers?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.id.includes(searchTerm)
  );

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Gestión de Pedidos</h1>
          <p className="text-slate-500 mt-1 font-medium italic">Revisa y aprueba los pedidos realizados desde el catálogo público.</p>
        </div>
        <div className="bg-orange-50 text-orange-600 px-6 py-3 rounded-2xl border border-orange-100 flex items-center space-x-3 shadow-sm">
            <Clock className="w-5 h-5 animate-pulse" />
            <span className="font-black uppercase text-xs tracking-widest">{pedidos.length} Pendientes</span>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 flex items-center space-x-3 shadow-sm max-w-xl">
        <Search className="w-5 h-5 text-slate-300" />
        <input 
            type="text" 
            placeholder="Buscar por cliente o ID..." 
            className="flex-1 outline-none text-slate-900 font-bold placeholder:text-slate-300 text-sm" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
            [1,2,3,4].map(i => <div key={i} className="h-64 bg-white rounded-[32px] animate-pulse border border-slate-100"></div>)
        ) : filteredPedidos.length > 0 ? (
            filteredPedidos.map((p) => (
                <div key={p.id} className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                    {/* Status Badge */}
                    <div className="absolute top-0 right-0 px-6 py-3 bg-orange-50 text-orange-600 font-black text-[9px] uppercase tracking-[0.2em] rounded-bl-3xl border-l border-b border-orange-100 shadow-sm z-20">
                        Pendiente
                    </div>

                    <div className="flex flex-col h-full space-y-6">
                        {/* Client Info */}
                        <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                    <User className="w-7 h-7" />
                                </div>
                                <div>
                                    <h3 className="font-black text-xl text-slate-900 leading-tight">{p.customers?.name || 'Cliente sin nombre'}</h3>
                                    <div className="flex items-center text-slate-400 text-xs font-bold mt-1">
                                        <Phone className="w-3 h-3 mr-1" />
                                        {p.customers?.phone || 'No registrado'}
                                    </div>
                                </div>
                            </div>
                            
                            {p.customers?.phone && (
                                <a 
                                    href={`https://wa.me/${p.customers.phone.replace(/\D/g,'')}`}
                                    target="_blank"
                                    className="p-4 bg-green-50 text-green-600 rounded-2xl hover:bg-green-600 hover:text-white transition-all shadow-sm"
                                    title="Contactar por WhatsApp"
                                >
                                    <MessageCircle className="w-6 h-6" />
                                </a>
                            )}
                        </div>

                        {/* Items Summary */}
                        <div className="flex-1 bg-slate-50/50 rounded-3xl p-6 space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resumen de Pedido</p>
                                <span className="bg-white px-2 py-1 rounded-lg text-[9px] font-black text-slate-500 border border-slate-100">{p.sale_items?.length} items</span>
                            </div>
                            <div className="space-y-3">
                                {p.sale_items?.slice(0, 3).map((item: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center text-sm">
                                        <span className="text-slate-600 font-bold truncate flex-1 mr-4">{item.products?.name} <span className="text-slate-400 font-medium text-xs ml-1">x{item.quantity}</span></span>
                                        <span className="font-black text-slate-900 whitespace-nowrap">{item.total.toFixed(2)} BS</span>
                                    </div>
                                ))}
                                {p.sale_items?.length > 3 && (
                                    <div className="pt-2 flex items-center text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-50/50 rounded-xl px-3 py-2">
                                        <Plus className="w-3 h-3 mr-2" />
                                        <span>Y {p.sale_items.length - 3} productos más</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer / Actions */}
                        <div className="flex flex-col space-y-6 pt-6 border-t border-slate-100">
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total a Cobrar</p>
                                    <div className="flex items-baseline space-x-1">
                                        <span className="text-3xl font-black text-slate-900 tracking-tighter">{p.total_amount.toFixed(2)}</span>
                                        <span className="text-xs font-black text-slate-400 uppercase">BS</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => { setSelectedPedido(p); setShowEdit(true); }}
                                        className="w-12 h-12 bg-white border border-slate-200 text-slate-600 rounded-2xl hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all flex items-center justify-center shadow-sm active:scale-95"
                                        title="Editar Pedido"
                                    >
                                        <Edit2 className="w-5 h-5" />
                                    </button>
                                    <button 
                                        onClick={() => { setSelectedPedido(p); setShowDetails(true); }}
                                        className="w-12 h-12 bg-white border border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all flex items-center justify-center shadow-sm active:scale-95"
                                        title="Ver Detalles"
                                    >
                                        <Eye className="w-5 h-5" />
                                    </button>
                                    <button 
                                        onClick={() => handleStatusUpdate(p.id, 'cancelled')}
                                        className="w-12 h-12 bg-white border border-slate-200 text-slate-400 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all flex items-center justify-center shadow-sm active:scale-95"
                                        title="Rechazar"
                                    >
                                        <XCircle className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => { setSelectedPedido(p); setShowApproval(true); }}
                                className="w-full flex items-center justify-center space-x-3 bg-blue-600 text-white py-4 rounded-[24px] font-black uppercase text-xs tracking-[0.2em] hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95"
                            >
                                <Check className="w-5 h-5" />
                                <span>Aprobar Pedido</span>
                            </button>
                        </div>
                    </div>
                </div>
            ))
        ) : (
            <div className="col-span-full py-32 text-center">
                <div className="w-20 h-20 bg-slate-100 rounded-[30px] flex items-center justify-center mx-auto mb-6 text-slate-300">
                    <ShoppingBag className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest">No hay pedidos pendientes</h3>
                <p className="text-slate-400 text-sm mt-2 font-medium">Los nuevos pedidos del catálogo aparecerán aquí.</p>
            </div>
        )}
      </div>

      <SaleDetailModal 
        isOpen={showDetails} 
        sale={selectedPedido} 
        onClose={() => setShowDetails(false)} 
        onVoidSuccess={fetchPedidos}
      />

      <OrderEditModal
        isOpen={showEdit}
        order={selectedPedido}
        onClose={() => setShowEdit(false)}
        onSaveSuccess={fetchPedidos}
      />

      <OrderApprovalModal
        isOpen={showApproval}
        order={selectedPedido}
        onClose={() => setShowApproval(false)}
        onConfirm={fetchPedidos}
      />
    </div>
  );
}
