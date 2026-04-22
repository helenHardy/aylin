'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { 
  X, 
  Warehouse, 
  Package, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  CreditCard,
  Banknote,
  QrCode,
  Layers
} from 'lucide-react';

interface OrderApprovalModalProps {
  order: any;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function OrderApprovalModal({ order, isOpen, onClose, onConfirm }: OrderApprovalModalProps) {
  const [items, setItems] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selections, setSelections] = useState<Record<string, string>>({}); // itemId -> warehouseId
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qr' | 'mixed' | 'credit'>('cash');
  const [amountCash, setAmountCash] = useState(0);
  const [amountQR, setAmountQR] = useState(0);

  useEffect(() => {
    if (isOpen && order) {
      fetchData();
      setAmountCash(order.total_amount); // Default to total in cash
      setAmountQR(0);
    }
  }, [isOpen, order]);

  useEffect(() => {
      if (!order) return;
      if (paymentMethod === 'cash') { setAmountCash(order.total_amount); setAmountQR(0); }
      if (paymentMethod === 'qr') { setAmountQR(order.total_amount); setAmountCash(0); }
      if (paymentMethod === 'credit') { setAmountCash(0); setAmountQR(0); }
  }, [paymentMethod, order?.total_amount]);

  const fetchData = async () => {
    setLoading(true);
    const [itemsRes, whRes] = await Promise.all([
      supabase.from('sale_items').select('*, products(name)').eq('sale_id', order.id),
      supabase.from('warehouses').select('*').order('name')
    ]);

    setItems(itemsRes.data || []);
    setWarehouses(whRes.data || []);
    
    const initial: Record<string, string> = {};
    itemsRes.data?.forEach(i => {
        if (i.warehouse_id) initial[i.id] = i.warehouse_id;
    });
    setSelections(initial);
    
    setLoading(false);
  };

  const handleApprove = async () => {
    const allSelected = items.every(i => selections[i.id]);
    if (!allSelected) return alert('Por favor, selecciona un depósito para cada producto.');

    if (paymentMethod === 'mixed' && (amountCash + amountQR) !== order.total_amount) {
        return alert(`La suma (${amountCash + amountQR}) debe ser igual al total (${order.total_amount})`);
    }

    setSubmitting(true);
    try {
        // 1. Update warehouses for items
        for (const item of items) {
            await supabase
                .from('sale_items')
                .update({ warehouse_id: selections[item.id] })
                .eq('id', item.id);
        }

        // 2. Register Payments
        if (paymentMethod !== 'credit') {
            await supabase.from('payments').insert([{
                sale_id: order.id,
                amount_cash: paymentMethod === 'mixed' ? amountCash : (paymentMethod === 'cash' ? order.total_amount : 0),
                amount_qr: paymentMethod === 'mixed' ? amountQR : (paymentMethod === 'qr' ? order.total_amount : 0),
                payment_date: new Date().toISOString()
            }]);
        } else {
            // Register as Debt
            await supabase.from('debt_ledger').insert([{
                customer_id: order.customer_id,
                amount: order.total_amount,
                type: 'debt',
                description: `Pedido #${order.id.slice(0,8)} al crédito`,
                reference_id: order.id
            }]);
        }

        // 3. Update sale status, payment method and SELLER
        const { data: { user } } = await supabase.auth.getUser();
        const { error: saleErr } = await supabase
            .from('sales')
            .update({ 
                status: 'completed',
                payment_method: paymentMethod,
                seller_id: user?.id
            })
            .eq('id', order.id);

        if (saleErr) throw saleErr;

        onConfirm();
        onClose();
    } catch (err: any) {
        alert('Error al aprobar: ' + err.message);
    } finally {
        setSubmitting(false);
    }
  };

  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-[40px] shadow-2xl max-w-4xl w-full flex flex-col md:flex-row max-h-[95vh] overflow-hidden animate-in zoom-in duration-300">
        
        {/* Left: Items & Warehouses */}
        <div className="flex-1 overflow-y-auto p-8 border-b md:border-b-0 md:border-r border-slate-100 flex flex-col">
          <div className="mb-6">
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Asignar Depósitos</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Pedido de {order.customers?.name}</p>
          </div>

          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
            </div>
          ) : (
            <div className="space-y-4 flex-1">
              {items.map((item) => (
                <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 truncate mr-2">{item.products?.name}</span>
                    <span className="text-[10px] font-black text-slate-400 whitespace-nowrap">x{item.quantity} un.</span>
                  </div>
                  <select 
                        required
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
                        value={selections[item.id] || ''}
                        onChange={(e) => setSelections({...selections, [item.id]: e.target.value})}
                    >
                        <option value="">-- Seleccionar Depósito --</option>
                        {warehouses.map(wh => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
                    </select>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Payment Method */}
        <div className="flex-1 p-8 bg-slate-50/50 flex flex-col">
          <div className="flex justify-between items-start mb-8">
            <div>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Método de Pago</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Total: {order.total_amount.toFixed(2)} BS</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-all">
                <X className="w-6 h-6 text-slate-300" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <button 
                onClick={() => setPaymentMethod('cash')}
                className={`p-4 rounded-2xl border transition-all flex flex-col items-center space-y-2 ${
                    paymentMethod === 'cash' ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400 hover:border-blue-300'
                }`}
            >
                <Banknote className="w-6 h-6" />
                <span className="text-[10px] font-black uppercase tracking-widest">Efectivo</span>
            </button>
            <button 
                onClick={() => setPaymentMethod('qr')}
                className={`p-4 rounded-2xl border transition-all flex flex-col items-center space-y-2 ${
                    paymentMethod === 'qr' ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400 hover:border-blue-300'
                }`}
            >
                <QrCode className="w-6 h-6" />
                <span className="text-[10px] font-black uppercase tracking-widest">QR</span>
            </button>
            <button 
                onClick={() => setPaymentMethod('mixed')}
                className={`p-4 rounded-2xl border transition-all flex flex-col items-center space-y-2 ${
                    paymentMethod === 'mixed' ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400 hover:border-blue-300'
                }`}
            >
                <Layers className="w-6 h-6" />
                <span className="text-[10px] font-black uppercase tracking-widest">Mixto</span>
            </button>
            <button 
                onClick={() => setPaymentMethod('credit')}
                className={`p-4 rounded-2xl border transition-all flex flex-col items-center space-y-2 ${
                    paymentMethod === 'credit' ? 'bg-orange-500 border-orange-500 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400 hover:border-orange-300'
                }`}
            >
                <CreditCard className="w-6 h-6" />
                <span className="text-[10px] font-black uppercase tracking-widest">Al Crédito</span>
            </button>
          </div>

          {/* Mixed Payment Details */}
          {paymentMethod === 'mixed' && (
              <div className="space-y-4 mb-8 p-6 bg-white rounded-[32px] border border-blue-100 shadow-sm animate-in fade-in slide-in-from-top-2">
                  <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Efectivo</label>
                      <input 
                        type="number"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        value={amountCash}
                        onChange={(e) => setAmountCash(Number(e.target.value))}
                      />
                  </div>
                  <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">QR</label>
                      <input 
                        type="number"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        value={amountQR}
                        onChange={(e) => setAmountQR(Number(e.target.value))}
                      />
                  </div>
                  <div className={`p-4 rounded-xl text-center font-black text-xs uppercase tracking-widest ${
                      (amountCash + amountQR) === order.total_amount ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                  }`}>
                      Suma: {(amountCash + amountQR).toFixed(2)} / {order.total_amount.toFixed(2)} BS
                  </div>
              </div>
          )}

          <div className="mt-auto space-y-3">
            <button 
                disabled={submitting || items.some(i => !selections[i.id]) || (paymentMethod === 'mixed' && (amountCash + amountQR) !== order.total_amount)}
                onClick={handleApprove}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-100 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
            >
                {submitting ? 'Procesando...' : 'Finalizar y Aprobar'}
            </button>
            <button 
                onClick={onClose}
                className="w-full py-4 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600"
            >
                Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
