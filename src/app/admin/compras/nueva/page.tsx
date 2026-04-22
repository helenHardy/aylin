'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  Trash2, 
  Save, 
  Truck, 
  Warehouse,
  Package,
  CheckCircle2,
  CreditCard,
  ArrowRight,
  ShoppingBag
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/utils/cn';

interface CartItem {
  id: string;
  name: string;
  quantity: number;
  unit_cost: number;
  total: number;
}

export default function NuevaCompraPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'credit'>('paid');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Selector products search
  const [searchProduct, setSearchProduct] = useState('');

  useEffect(() => {
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    const [supRes, warRes, proRes] = await Promise.all([
      supabase.from('suppliers').select('*').order('name'),
      supabase.from('warehouses').select('*').order('name'),
      supabase.from('products').select('*, categories(name), brands(name), product_models(name)').order('name')
    ]);
    setSuppliers(supRes.data || []);
    setWarehouses(warRes.data || []);
    setProducts(proRes.data || []);
  };

  const addToCart = (product: any) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
        setCart(cart.map(item => 
            item.id === product.id ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unit_cost } : item
        ));
    } else {
        const suggestedCost = product.cost_price || 0;
        setCart([...cart, { 
            id: product.id, 
            name: product.name, 
            quantity: 1, 
            unit_cost: suggestedCost, 
            total: suggestedCost 
        }]);
    }
  };

  const updateItem = (id: string, field: 'quantity' | 'unit_cost', value: number) => {
    setCart(cart.map(item => {
        if (item.id === id) {
            const newItem = { ...item, [field]: value };
            newItem.total = newItem.quantity * newItem.unit_cost;
            return newItem;
        }
        return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const totalPurchase = cart.reduce((acc, item) => acc + item.total, 0);

  const handleSubmit = async () => {
    if (!supplierId || !warehouseId || cart.length === 0) {
        alert('Por favor completa todos los campos y añade al menos un producto.');
        return;
    }

    setIsSubmitting(true);
    try {
        // 1. Create Purchase
        const { data: purchase, error: pError } = await supabase
            .from('purchases')
            .insert([{
                supplier_id: supplierId,
                warehouse_id: warehouseId,
                total_amount: totalPurchase,
                payment_status: paymentStatus,
                amount_paid: paymentStatus === 'paid' ? totalPurchase : amountPaid,
                status: 'completed'
            }])
            .select()
            .single();

        if (pError) throw pError;

        // 3. Record in Debt Ledger if it's a Credit Purchase (only the pending amount)
        const pendingAmount = totalPurchase - (paymentStatus === 'paid' ? totalPurchase : amountPaid);
        
        if (paymentStatus === 'credit' && pendingAmount > 0) {
            const { error: dError } = await supabase.from('debt_ledger').insert([{
                supplier_id: supplierId,
                amount: pendingAmount,
                type: 'purchase',
                reference_id: purchase.id,
                notes: `Saldo pendiente compra #${purchase.id.slice(0, 8)}`
            }]);
            if (dError) throw dError;
        }

        // 2. Create Purchase Items
        const itemsToInsert = cart.map(item => ({
            purchase_id: purchase.id,
            product_id: item.id,
            quantity: item.quantity,
            unit_cost: item.unit_cost,
            total: item.total,
            warehouse_id: warehouseId
        }));

        const { error: iError } = await supabase.from('purchase_items').insert(itemsToInsert);
        if (iError) throw iError;

        // 3. (Optional) Record in Debt Ledger if needed
        // For now, inventory is handled by trigger automatically.

        setIsSuccess(true);
        setTimeout(() => router.push('/admin/compras'), 2000);
    } catch (err: any) {
        alert('Error: ' + err.message);
    } finally {
        setIsSubmitting(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchProduct.toLowerCase()) || 
    (p.brand && p.brand.toLowerCase().includes(searchProduct.toLowerCase()))
  );

  if (isSuccess) {
    return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-6 animate-in fade-in duration-500 px-6">
            <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-[28px] flex items-center justify-center border border-emerald-100">
                <CheckCircle2 className="w-12 h-12" />
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter text-center">¡Compra Registrada!</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">El stock ha sido actualizado</p>
        </div>
    );
  }

  return (
    <div className="space-y-8 pb-28 lg:pb-8">
      {/* Header */}
      <div className="bg-white p-6 md:p-10 rounded-[48px] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center space-x-5">
            <Link href="/admin/compras" className="p-4 bg-slate-50 border border-slate-100 rounded-[18px] text-slate-400 hover:text-slate-900 transition-colors shrink-0 active:scale-95">
                <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Nueva Compra</h1>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Registro de mercadería</p>
            </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || cart.length === 0}
          className="hidden lg:flex items-center space-x-3 bg-slate-900 hover:bg-emerald-600 text-white px-10 py-5 rounded-[24px] font-black transition-all active:scale-95 shadow-2xl shadow-slate-200 disabled:opacity-50 uppercase tracking-[0.2em] text-[10px]"
        >
          <Save className="w-5 h-5" />
          <span>{isSubmitting ? 'Guardando...' : 'Finalizar Compra'}</span>
        </button>
      </div>

      {/* Config Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm space-y-3">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Truck className="w-3.5 h-3.5" /> Proveedor
              </label>
              <select className="w-full bg-slate-50 border border-slate-100 rounded-[16px] px-5 py-4 outline-none font-black text-sm text-slate-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all appearance-none" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
          </div>
          <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm space-y-3">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Warehouse className="w-3.5 h-3.5" /> Depósito Destino
              </label>
              <select className="w-full bg-slate-50 border border-slate-100 rounded-[16px] px-5 py-4 outline-none font-black text-sm text-slate-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all appearance-none" value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
          </div>
          <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm space-y-3">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <CreditCard className="w-3.5 h-3.5" /> Estado de Pago
              </label>
              <div className="flex p-1.5 bg-slate-50 border border-slate-100 rounded-[16px]">
                  <button type="button" onClick={() => setPaymentStatus('paid')} className={cn("flex-1 py-3.5 rounded-[12px] font-black text-[10px] uppercase tracking-widest transition-all active:scale-95", paymentStatus === 'paid' ? 'bg-white text-emerald-600 shadow-sm border border-slate-100' : 'text-slate-400')}>
                      ✓ Pagado
                  </button>
                  <button type="button" onClick={() => setPaymentStatus('credit')} className={cn("flex-1 py-3.5 rounded-[12px] font-black text-[10px] uppercase tracking-widest transition-all active:scale-95", paymentStatus === 'credit' ? 'bg-orange-500 text-white shadow-lg shadow-orange-200' : 'text-slate-400')}>
                      A Crédito
                  </button>
              </div>
          </div>
      </div>

      {/* Credit Section */}
      {paymentStatus === 'credit' && (
          <div className="bg-slate-900 rounded-[32px] p-6 md:p-8 text-white shadow-2xl border border-orange-500/20 animate-in slide-in-from-bottom-4 duration-500 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl"></div>
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-orange-500 rounded-[14px] flex items-center justify-center shadow-lg shadow-orange-500/30"><CreditCard className="w-5 h-5" /></div>
                          <h4 className="text-lg font-black tracking-tight uppercase">Gestión de Abono</h4>
                      </div>
                      <p className="text-slate-400 text-xs font-bold max-w-xs">El saldo restante se registra como deuda con el proveedor.</p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                      <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-orange-400 uppercase tracking-widest block">Pago Ahora</label>
                          <div className="relative">
                              <input type="number" className="w-full sm:w-44 px-5 py-4 bg-slate-800 border-2 border-slate-700 rounded-2xl outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 font-black text-xl text-white transition-all text-center" value={amountPaid} onChange={e => setAmountPaid(parseFloat(e.target.value) || 0)} />
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-500 text-xs">BS</span>
                          </div>
                      </div>
                      <div className="hidden sm:flex items-center"><ArrowRight className="w-5 h-5 text-slate-600" /></div>
                      <div className="flex flex-col items-center sm:items-end p-5 bg-slate-800/50 rounded-2xl border border-slate-700">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Deuda</span>
                          <span className="text-2xl font-black text-orange-400 tracking-tighter">{(totalPurchase - amountPaid).toFixed(2)} <span className="text-xs">BS</span></span>
                      </div>
                  </div>
              </div>
              {totalPurchase > 0 && (
                <div className="mt-6 space-y-2">
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-500">
                        <span>Pagado: {((amountPaid / totalPurchase) * 100).toFixed(0)}%</span>
                        <span>Deuda: {(((totalPurchase - amountPaid) / totalPurchase) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
                        <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${(amountPaid / totalPurchase) * 100}%` }}></div>
                        <div className="h-full bg-orange-500 transition-all duration-700" style={{ width: `${((totalPurchase - amountPaid) / totalPurchase) * 100}%` }}></div>
                    </div>
                </div>
              )}
          </div>
      )}

      {/* Main: Catalog + Cart */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Product Catalog */}
        <div className="lg:col-span-3">
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-50 rounded-[14px] flex items-center justify-center text-emerald-600 border border-emerald-100"><Package className="w-5 h-5" /></div>
                        <div>
                            <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest">Agregar Productos</h3>
                            <p className="text-[9px] font-bold text-slate-400 mt-0.5">{products.length} disponibles</p>
                        </div>
                    </div>
                    <div className="relative group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                        <input type="text" placeholder="Buscar por nombre o marca..." className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-[18px] outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-bold text-sm text-slate-900 placeholder:text-slate-300 placeholder:font-black placeholder:uppercase placeholder:text-[9px] placeholder:tracking-widest transition-all" value={searchProduct} onChange={e => setSearchProduct(e.target.value)} />
                    </div>
                </div>
                <div className="p-4 max-h-[500px] lg:max-h-[600px] overflow-y-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {filteredProducts.map(p => {
                            const inCart = cart.find(c => c.id === p.id);
                            return (
                                <button key={p.id} onClick={() => addToCart(p)} className={cn("w-full text-left p-5 rounded-[20px] border-2 transition-all flex items-center gap-4 group active:scale-[0.98]", inCart ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30')}>
                                    <div className={cn("w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 transition-colors border", inCart ? 'bg-emerald-100 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-300 border-slate-100 group-hover:bg-emerald-50 group-hover:text-emerald-500')}>
                                        {inCart ? <span className="font-black text-sm">{inCart.quantity}</span> : <Plus className="w-5 h-5" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-black text-slate-900 text-xs uppercase leading-tight truncate group-hover:text-emerald-700 transition-colors">{p.name}</div>
                                        <div className="flex flex-wrap items-center gap-1 mt-1.5">
                                            {p.brands?.name && <span className="text-[7px] font-black bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-md uppercase">{p.brands.name}</span>}
                                            {p.categories?.name && <span className="text-[7px] font-black bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded-md uppercase">{p.categories.name}</span>}
                                        </div>
                                    </div>
                                    {p.cost_price > 0 && (
                                        <div className="text-right shrink-0">
                                            <div className="text-[7px] font-black text-slate-300 uppercase">Costo</div>
                                            <div className="text-sm font-black text-slate-600 tracking-tighter">{p.cost_price.toFixed(2)}</div>
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>

        {/* Cart Sidebar */}
        <div className="lg:col-span-2">
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden lg:sticky lg:top-4">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-900 rounded-[14px] flex items-center justify-center text-white"><ShoppingBag className="w-5 h-5" /></div>
                        <div>
                            <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest">Carrito</h3>
                            <p className="text-[9px] font-bold text-slate-400 mt-0.5">{cart.length} producto{cart.length !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                    {cart.length > 0 && <div className="px-4 py-2 bg-emerald-50 rounded-[12px] border border-emerald-100"><span className="font-black text-emerald-700 text-sm tracking-tighter">{totalPurchase.toFixed(2)} BS</span></div>}
                </div>
                <div className="max-h-[400px] lg:max-h-[500px] overflow-y-auto">
                    {cart.length === 0 ? (
                        <div className="py-16 text-center flex flex-col items-center px-8">
                            <div className="w-16 h-16 bg-slate-50 rounded-[20px] flex items-center justify-center text-slate-200 mb-4 border border-slate-100"><Package className="w-8 h-8" /></div>
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Selecciona productos del catálogo</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {cart.map(item => (
                                <div key={item.id} className="p-5 hover:bg-slate-50/50 transition-colors group/item">
                                    <div className="flex justify-between items-start mb-4">
                                        <h4 className="font-black text-slate-900 text-xs uppercase leading-tight flex-1 mr-3">{item.name}</h4>
                                        <button onClick={() => removeFromCart(item.id)} className="p-1.5 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover/item:opacity-100"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="space-y-1">
                                            <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Cant.</label>
                                            <input type="number" className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 font-black text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 text-center transition-all" value={item.quantity} min="1" onChange={e => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest">C/U</label>
                                            <input type="number" className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 font-black text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 text-center transition-all" value={item.unit_cost} step="0.01" onChange={e => updateItem(item.id, 'unit_cost', parseFloat(e.target.value) || 0)} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[7px] font-black text-emerald-500 uppercase tracking-widest">Total</label>
                                            <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5 font-black text-sm text-emerald-700 text-center">{item.total.toFixed(2)}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {cart.length > 0 && (
                    <div className="p-5 bg-slate-900 text-white">
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="text-[9px] font-black uppercase tracking-widest opacity-50">Total Compra</div>
                                <div className="text-2xl font-black tracking-tighter">{totalPurchase.toFixed(2)} <span className="text-xs opacity-50">BS</span></div>
                            </div>
                            <div className="text-right">
                                <div className="text-[9px] font-black uppercase tracking-widest opacity-50">Ítems</div>
                                <div className="text-2xl font-black tracking-tighter">{cart.reduce((a, c) => a + c.quantity, 0)}</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Floating Mobile Submit */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-xl border-t border-slate-100 z-50">
          <button onClick={handleSubmit} disabled={isSubmitting || cart.length === 0} className="w-full flex items-center justify-center space-x-3 bg-slate-900 hover:bg-emerald-600 text-white py-5 rounded-[20px] font-black shadow-2xl transition-all active:scale-95 disabled:opacity-50 uppercase tracking-[0.2em] text-[10px]">
            <Save className="w-5 h-5" />
            <span>{isSubmitting ? 'Guardando...' : `Finalizar — ${totalPurchase.toFixed(2)} BS`}</span>
          </button>
        </div>
      )}
    </div>
  );
}
