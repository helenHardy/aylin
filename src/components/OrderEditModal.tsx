'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { 
  X, 
  Package, 
  Trash2, 
  Plus, 
  Minus,
  Save,
  Loader2,
  Search,
  Check
} from 'lucide-react';

interface OrderEditModalProps {
  order: any;
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: () => void;
}

export default function OrderEditModal({ order, isOpen, onClose, onSaveSuccess }: OrderEditModalProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Search state
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (isOpen && order) {
      fetchItems();
    }
  }, [isOpen, order]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (search.length > 2) searchProducts();
      else setSearchResults([]);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sale_items')
      .select('*, products(name, price_tiers(*))')
      .eq('sale_id', order.id);
    
    if (!error) setItems(data || []);
    setLoading(false);
  };

  const searchProducts = async () => {
    setSearching(true);
    const { data, error } = await supabase
      .from('products')
      .select('*, price_tiers(*)')
      .ilike('name', `%${search}%`)
      .limit(5);
    
    if (!error) setSearchResults(data || []);
    setSearching(false);
  };

  const addProduct = (product: any) => {
    // Check if already in order
    const existing = items.find(i => i.product_id === product.id);
    if (existing) {
        updateQuantity(existing.id, 1);
    } else {
        const initialQty = 1;
        const tiers = [...(product.price_tiers || [])].sort((a,b) => b.min_quantity - a.min_quantity);
        const tier = tiers.find(t => initialQty >= t.min_quantity);
        const price = tier ? tier.price_per_unit : 0;
        
        const newItem = {
            id: `new-${Date.now()}`,
            product_id: product.id,
            quantity: initialQty,
            unit_price: price,
            total: price * initialQty,
            warehouse_id: order.warehouse_id || null, 
            products: product
        };
        setItems([...items, newItem]);
    }
    setSearch('');
    setSearchResults([]);
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const newQty = Math.max(1, item.quantity + delta);
        let newPrice = item.unit_price;
        if (item.products?.price_tiers) {
            const tiers = [...item.products.price_tiers].sort((a,b) => b.min_quantity - a.min_quantity);
            const tier = tiers.find(t => newQty >= t.min_quantity);
            if (tier) newPrice = tier.price_per_unit;
        }
        return { ...item, quantity: newQty, unit_price: newPrice, total: newPrice * newQty };
      }
      return item;
    }));
  };

  const removeItem = (itemId: string) => {
    if (items.length === 1) return alert('El pedido debe tener al menos un producto.');
    setItems(items.filter(i => i.id !== itemId));
  };

  const total = items.reduce((acc, item) => acc + item.total, 0);

  const handleSave = async () => {
    setSubmitting(true);
    try {
        // 1. Delete old items
        await supabase.from('sale_items').delete().eq('sale_id', order.id);

        // 2. Insert new items
        const { error: itemsErr } = await supabase.from('sale_items').insert(
            items.map(i => ({
                sale_id: order.id,
                product_id: i.product_id,
                quantity: i.quantity,
                unit_price: i.unit_price,
                total: i.total,
                warehouse_id: i.warehouse_id
            }))
        );

        if (itemsErr) throw itemsErr;

        // 3. Update sale total
        const { error: saleErr } = await supabase
            .from('sales')
            .update({ total_amount: total })
            .eq('id', order.id);

        if (saleErr) throw saleErr;

        onSaveSuccess();
        onClose();
    } catch (err: any) {
        alert('Error al guardar cambios: ' + err.message);
    } finally {
        setSubmitting(false);
    }
  };

  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-[40px] shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] animate-in zoom-in duration-300">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-[40px]">
          <div>
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Editar Pedido</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Cliente: {order.customers?.name}</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white rounded-2xl transition-all">
            <X className="w-6 h-6 text-slate-300" />
          </button>
        </div>

        {/* Product Search Bar */}
        <div className="p-6 bg-blue-50/50 border-b border-blue-100 relative">
            <div className="flex items-center bg-white rounded-2xl px-4 py-3 border border-blue-200 shadow-sm">
                <Search className="w-5 h-5 text-blue-400 mr-3" />
                <input 
                    type="text" 
                    placeholder="Agregar más productos..." 
                    className="bg-transparent outline-none flex-1 text-sm font-bold text-slate-900 placeholder:text-slate-300"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                {searching && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
            </div>

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
                <div className="absolute left-6 right-6 top-[calc(100%-8px)] bg-white rounded-2xl shadow-2xl border border-blue-100 z-10 overflow-hidden animate-in slide-in-from-top-2">
                    {searchResults.map(p => (
                        <button 
                            key={p.id}
                            onClick={() => addProduct(p)}
                            className="w-full p-4 flex items-center justify-between hover:bg-blue-50 transition-all text-left group"
                        >
                            <div className="flex items-center space-x-3">
                                <Package className="w-5 h-5 text-slate-300 group-hover:text-blue-500" />
                                <div>
                                    <p className="font-bold text-slate-900 text-sm">{p.name}</p>
                                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">
                                        Desde {p.price_tiers?.[0]?.price_per_unit || 0} BS
                                    </p>
                                </div>
                            </div>
                            <Plus className="w-4 h-4 text-blue-500" />
                        </button>
                    ))}
                </div>
            )}
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                <Loader2 className="w-10 h-10 animate-spin mb-4" />
                <p className="font-black uppercase tracking-widest text-xs">Cargando productos...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-6 bg-slate-50 rounded-3xl border border-slate-100 gap-4 transition-all">
                  <div className="flex items-center space-x-4 w-full sm:w-auto">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 shadow-sm shrink-0">
                      <Package className="w-6 h-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-black text-slate-800 uppercase text-xs sm:text-sm truncate">{item.products?.name}</h4>
                      <p className="text-[10px] font-bold text-blue-600 tracking-tight leading-none mt-1">{item.unit_price} BS / unidad</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between w-full sm:w-auto gap-4 sm:gap-6 border-t sm:border-t-0 pt-4 sm:pt-0 border-slate-100">
                    <div className="flex items-center bg-white rounded-2xl p-1 border border-slate-200 shadow-sm">
                      <button 
                        onClick={() => updateQuantity(item.id, -1)}
                        className="p-2 hover:bg-slate-50 rounded-xl transition-all text-slate-400 hover:text-slate-900"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-black text-slate-900 text-sm">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, 1)}
                        className="p-2 hover:bg-slate-50 rounded-xl transition-all text-slate-400 hover:text-slate-900"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="text-right flex-1 sm:flex-none">
                      <p className="text-sm sm:text-lg font-black text-slate-900 tracking-tighter">{(item.total).toFixed(2)} BS</p>
                    </div>

                    <button 
                      onClick={() => removeItem(item.id)}
                      className="p-3 text-slate-300 hover:text-red-500 transition-all shrink-0"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-8 bg-slate-900 text-white rounded-b-[40px] flex items-center justify-between">
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nuevo Total Estimado</p>
                <p className="text-3xl font-black tracking-tighter">{total.toFixed(2)} BS</p>
            </div>
            <div className="flex space-x-4">
                <button 
                    onClick={onClose}
                    className="px-8 py-4 bg-white/10 hover:bg-white/20 rounded-[20px] font-black uppercase text-xs tracking-widest transition-all"
                >
                    Cancelar
                </button>
                <button 
                    disabled={submitting}
                    onClick={handleSave}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-[20px] font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-900/20 transition-all active:scale-95 disabled:opacity-50"
                >
                    <Save className="w-4 h-4" />
                    <span>{submitting ? 'Guardando...' : 'Guardar Cambios'}</span>
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}
