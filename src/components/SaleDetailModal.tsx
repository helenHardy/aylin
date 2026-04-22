'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { 
  X, 
  Package, 
  Trash2, 
  AlertCircle,
  CreditCard,
  History as HistoryIcon
} from 'lucide-react';

interface SaleDetailModalProps {
  sale: any;
  isOpen: boolean;
  onClose: () => void;
  onVoidSuccess?: () => void;
}

export default function SaleDetailModal({ sale, isOpen, onClose, onVoidSuccess }: SaleDetailModalProps) {
  const [items, setItems] = useState<any[]>([]);
  const [payments, setPayments] = useState<{cash: number, qr: number}>({cash: 0, qr: 0});
  const [loading, setLoading] = useState(true);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [isVoiding, setIsVoiding] = useState(false);

  useEffect(() => {
    if (isOpen && sale) {
      fetchDetails();
    }
  }, [isOpen, sale]);

  const fetchDetails = async () => {
    setLoading(true);
    const [itemsRes, paymentsRes] = await Promise.all([
      supabase
        .from('sale_items')
        .select('*, products(name, color, image_url, brands(name), categories(name), product_models(name)), warehouses(name)')
        .eq('sale_id', sale.id),
      supabase
        .from('payments')
        .select('amount_cash, amount_qr')
        .eq('sale_id', sale.id)
    ]);
    
    setItems(itemsRes.data || []);
    
    if (paymentsRes.data && paymentsRes.data.length > 0) {
        const cash = paymentsRes.data.reduce((acc: number, p: any) => acc + (Number(p.amount_cash) || 0), 0);
        const qr = paymentsRes.data.reduce((acc: number, p: any) => acc + (Number(p.amount_qr) || 0), 0);
        setPayments({ cash, qr });
    } else {
        setPayments({ cash: 0, qr: 0 });
    }
    setLoading(false);
  };

  const handleVoidSale = async () => {
    setIsVoiding(true);
    try {
        // 1. Delete items (triggers rollback of inventory)
        await supabase.from('sale_items').delete().eq('sale_id', sale.id);
        
        // 2. If it was credit/mixed, delete ledger entries (Trigger will auto-reverse balance)
        if (sale.payment_method === 'credit' || sale.payment_method === 'mixed') {
            await supabase.from('debt_ledger').delete().eq('reference_id', sale.id);
        }

        // 3. Delete payments
        await supabase.from('payments').delete().eq('sale_id', sale.id);

        // 4. Delete sale
        const { error: saleErr } = await supabase.from('sales').delete().eq('id', sale.id);
        
        if (saleErr) throw saleErr;

        setShowVoidModal(false);
        onClose();
        if (onVoidSuccess) onVoidSuccess();
    } catch (err) {
        alert('Error al anular la venta');
    } finally {
        setIsVoiding(false);
    }
  };

  if (!isOpen || !sale) return null;

  // Format the ID to show as a "Receipt Number" if sequential ID isn't ready, 
  // but we'll prioritize 'receipt_number' if it exists.
  const displayId = sale.receipt_number 
    ? `#${String(sale.receipt_number).padStart(4, '0')}` 
    : `#${sale.id.slice(0, 8).toUpperCase()}`;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white rounded-[48px] shadow-2xl max-w-2xl w-full overflow-hidden animate-in zoom-in duration-300">
        <div className="px-10 py-10 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
            <div>
               <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Factura de Venta</h2>
               <div className="flex items-center space-x-4 mt-2">
                    <span className="text-xl font-black text-blue-600 uppercase tracking-widest">Recibo {displayId}</span>
                    <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(sale.created_at).toLocaleString()}</span>
               </div>
            </div>
            <button onClick={onClose} className="p-3 hover:bg-white rounded-2xl transition-all">
                <X className="w-8 h-8 text-slate-300" />
            </button>
        </div>

        <div className="p-10 max-h-[60vh] overflow-y-auto custom-scrollbar bg-white">
            <div className="grid grid-cols-2 gap-8 mb-10">
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente Factura</label>
                    <div className="font-black text-xl text-slate-900">{sale.customers?.name || 'Varios'}</div>
                </div>
                <div className="space-y-1 text-right">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado de Pago</label>
                    <div className={`font-black text-lg uppercase ${
                        sale.payment_method === 'credit' ? 'text-orange-500' : 'text-emerald-500'
                    }`}>
                        {sale.payment_method}
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Desglose de Artículos</label>
                <div className="divide-y divide-slate-100 border-t border-slate-100">
                    {loading ? (
                        <div className="py-20 text-center animate-pulse text-slate-300 font-black uppercase tracking-widest text-[10px]">Cargando ítems...</div>
                    ) : items.length === 0 ? (
                        <div className="py-20 text-center text-slate-300 font-bold uppercase tracking-widest text-[10px]">No se encontraron productos.</div>
                    ) : items.map((item) => (
                        <div key={item.id} className="py-6 flex justify-between items-center bg-white">
                            <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 shrink-0 overflow-hidden">
                                    {item.products?.image_url ? (
                                        <img src={item.products.image_url} alt={item.products.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <Package className="w-6 h-6" />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <div className="font-black text-slate-900 text-sm uppercase truncate">{item.products?.name}</div>
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                        <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase tracking-tighter whitespace-nowrap">
                                            {item.warehouses?.name}
                                        </span>
                                        {item.products?.brands?.name && (
                                            <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded uppercase tracking-tighter whitespace-nowrap">
                                                {item.products.brands.name}
                                            </span>
                                        )}
                                        {item.products?.product_models?.name && (
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{item.products.product_models.name}</span>
                                        )}
                                        {item.products?.color && (
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{item.products.color}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                <div className="text-sm font-black text-slate-900">{item.quantity} x {item.unit_price} BS</div>
                                <div className="text-lg font-black text-blue-600 tracking-tighter">{item.total.toFixed(2)} BS</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        <div className="p-10 bg-slate-50 border-t border-slate-100">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        sale.payment_method === 'credit' ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'
                    }`}>
                       <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Forma de Pago</div>
                        <div className="font-black text-slate-800 uppercase text-xs">{sale.payment_method}</div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Venta</div>
                    <div className="text-3xl font-black text-slate-900 tracking-tighter">{sale.total_amount.toFixed(2)} BS</div>
                </div>
            </div>

            <div className="flex space-x-4">
                <button className="flex-1 py-5 bg-slate-900 text-white rounded-[24px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all text-sm">
                    Imprimir Recibo
                </button>
                <button 
                    onClick={() => setShowVoidModal(true)}
                    className="p-5 bg-red-50 text-red-600 hover:bg-red-100 rounded-[24px] font-black uppercase tracking-widest transition-all active:scale-95"
                >
                    <Trash2 className="w-6 h-6" />
                </button>
            </div>
        </div>

        {/* Void Confirmation Modal */}
        {showVoidModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[10000] animate-in fade-in duration-200">
            <div className="bg-white rounded-[40px] shadow-2xl max-w-sm w-full p-10 text-center animate-in zoom-in duration-300">
                <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">¿Anular Venta?</h3>
                <p className="text-sm text-slate-500 font-medium mb-8">
                    Esta acción es irreversible. El stock volverá automáticamente a los depósitos y se cancelará cualquier deuda asociada.
                </p>
                <div className="flex flex-col space-y-3">
                    <button 
                        disabled={isVoiding}
                        onClick={handleVoidSale}
                        className="w-full py-5 bg-red-600 text-white rounded-[20px] font-black uppercase tracking-widest shadow-xl shadow-red-200 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {isVoiding ? 'Anulando...' : 'Sí, confirmar anulación'}
                    </button>
                    <button 
                        onClick={() => setShowVoidModal(false)}
                        className="w-full py-5 bg-slate-100 text-slate-500 rounded-[20px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
            </div>
        )}
      </div>
    </div>
  );
}
