'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { 
  ArrowLeftRight, 
  Warehouse, 
  Package, 
  AlertTriangle, 
  ArrowRight,
  Plus,
  History as HistoryIcon,
  Search,
  X,
  CheckCircle2,
  Calendar,
  FileText,
  ChevronDown,
  Tags
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface WarehouseData { id: string; name: string; }
interface ProductData { 
    id: string; 
    name: string; 
    color: string | null;
    brands: { name: string } | null;
    categories: { name: string } | null;
    product_models: { name: string } | null;
}
interface InventoryData { product_id: string; warehouse_id: string; quantity: number; }

export default function InventarioPage() {
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([]);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [inventory, setInventory] = useState<InventoryData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Form states
  const [selectedProductId, setSelectedProductId] = useState('');
  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [transferList, setTransferList] = useState<{ productId: string, name: string, quantity: number }[]>([]);
  
  // Search state for main view
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  // Search state for modal
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [wRes, pRes, iRes, catRes] = await Promise.all([
      supabase.from('warehouses').select('id, name').eq('is_active', true).order('name'),
      supabase.from('products').select('id, name, color, brands(name), categories(name), product_models(name)').order('name'),
      supabase.from('inventory').select('*'),
      supabase.from('categories').select('*').order('name')
    ]);

    setWarehouses(wRes.data || []);
    setProducts((pRes.data as any) || []);
    setInventory(iRes.data || []);
    setCategoriesList(catRes.data || []);
    setLoading(false);
  };

  const getStock = (productId: string, warehouseId: string) => {
    return inventory.find(i => i.product_id === productId && i.warehouse_id === warehouseId)?.quantity || 0;
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    const { data, error } = await supabase
        .from('stock_transfers')
        .select('*, products(name, color, brands(name)), from:from_warehouse_id(name), to:to_warehouse_id(name)')
        .order('created_at', { ascending: false })
        .limit(50);
    
    if (!error) setHistory(data || []);
    setLoadingHistory(false);
  };

  const addToTransferList = () => {
    if (!selectedProductId || quantity <= 0) return;
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    // Check if already in list
    const existing = transferList.find(item => item.productId === selectedProductId);
    if (existing) {
        setTransferList(transferList.map(item => 
            item.productId === selectedProductId ? { ...item, quantity: item.quantity + quantity } : item
        ));
    } else {
        setTransferList([...transferList, { productId: selectedProductId, name: product.name, quantity }]);
    }
    setQuantity(0);
  };

  const removeFromTransferList = (index: number) => {
    setTransferList(transferList.filter((_, i) => i !== index));
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromWarehouseId || !toWarehouseId || transferList.length === 0) return;
    if (fromWarehouseId === toWarehouseId) return alert('Depósitos deben ser distintos');
    
    setIsSubmitting(true);
    
    try {
        for (const item of transferList) {
            const { error } = await supabase.rpc('transfer_stock', {
                p_product_id: item.productId,
                p_from_warehouse_id: fromWarehouseId,
                p_to_warehouse_id: toWarehouseId,
                p_quantity: item.quantity
            });
            if (error) throw new Error(`Error en el producto ${item.name}: ${error.message}`);
        }

        setShowTransferModal(false);
        setTransferList([]);
        setQuantity(0);
        fetchData();
    } catch (err: any) {
        alert(err.message || 'Error en el traspaso');
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !fromWarehouseId || quantity === 0) return;
    
    setIsSubmitting(true);
    try {
        const { error } = await supabase.rpc('adjust_inventory', {
            p_product_id: selectedProductId,
            p_warehouse_id: fromWarehouseId,
            p_quantity_change: quantity,
            p_notes: notes
        });

        if (error) throw error;

        setShowAdjustModal(false);
        setQuantity(0);
        setNotes('');
        fetchData();
    } catch (err: any) {
        alert(err.message || 'Error en el ajuste');
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 pb-24">
      {/* Header Section */}
      <div className="bg-white p-8 md:p-10 rounded-[48px] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div className="flex items-center space-x-6">
            <div className="w-16 h-16 bg-slate-900 rounded-[24px] flex items-center justify-center text-white shadow-2xl shadow-slate-200">
                <Warehouse className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Stock</h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Inventario Global & Traspasos</p>
            </div>
        </div>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <button
            onClick={() => { fetchHistory(); setShowHistoryModal(true); }}
            className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-slate-50 hover:bg-slate-100 text-slate-700 px-6 py-5 rounded-[24px] font-black transition-all active:scale-95 uppercase text-[10px] tracking-widest border border-slate-100"
          >
            <HistoryIcon className="w-4 h-4 text-blue-500" />
            <span>Historial</span>
          </button>
          <button
            onClick={() => setShowTransferModal(true)}
            className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-slate-900 hover:bg-blue-600 text-white px-6 py-5 rounded-[24px] font-black shadow-2xl shadow-slate-200 active:scale-95 transition-all uppercase text-[10px] tracking-widest"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Transferir</span>
          </button>
          <button
            onClick={() => setShowAdjustModal(true)}
            className="w-full md:w-auto flex items-center justify-center space-x-2 bg-orange-600 hover:bg-orange-700 text-white px-8 py-5 rounded-[24px] font-black shadow-2xl shadow-orange-100 active:scale-95 transition-all uppercase text-[10px] tracking-widest"
          >
            <Plus className="w-4 h-4" />
            <span>Ajustar</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative group">
          <div className="absolute inset-y-0 left-8 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
              <Search className="w-5 h-5" />
          </div>
          <input 
            type="text"
            placeholder="Buscar producto, marca o modelo..."
            className="w-full bg-white border border-slate-100 rounded-[32px] py-6 pl-20 pr-8 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-slate-900 shadow-sm placeholder:text-slate-300 placeholder:font-black placeholder:uppercase placeholder:text-[10px] placeholder:tracking-widest"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
      </div>

      {/* Category Filter Tabs */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none -mx-2 px-2">
          <button
            onClick={() => setActiveCategory(null)}
            className={cn(
              "shrink-0 px-6 py-3 rounded-[20px] font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 border shadow-sm",
              activeCategory === null
                ? "bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-200"
                : "bg-white text-slate-500 border-slate-100 hover:border-slate-300"
            )}
          >
            Todos ({products.length})
          </button>
          {categoriesList.map(cat => {
            const count = products.filter(p => p.categories?.name === cat.name).length;
            if (count === 0) return null;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(activeCategory === cat.name ? null : cat.name)}
                className={cn(
                  "shrink-0 px-6 py-3 rounded-[20px] font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 border shadow-sm",
                  activeCategory === cat.name
                    ? "bg-blue-600 text-white border-blue-600 shadow-xl shadow-blue-100"
                    : "bg-white text-slate-500 border-slate-100 hover:border-blue-300"
                )}
              >
                {cat.name} ({count})
              </button>
            );
          })}
      </div>

      {/* Main Content: Grouped by Category */}
      {(() => {
        const filtered = products.filter(p => {
          const matchSearch = searchTerm === '' || 
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.brands?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.product_models?.name?.toLowerCase().includes(searchTerm.toLowerCase());
          const matchCategory = !activeCategory || p.categories?.name === activeCategory;
          return matchSearch && matchCategory;
        });

        if (loading) {
          return (
            <div className="space-y-6">
              {[1,2,3].map(i => <div key={i} className="h-32 bg-white animate-pulse rounded-[32px] border border-slate-100"></div>)}
            </div>
          );
        }

        if (filtered.length === 0) {
          return (
            <div className="bg-white rounded-[40px] border border-slate-100 py-20 text-center flex flex-col items-center">
                <Search className="w-10 h-10 text-slate-200 mb-4" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {searchTerm ? 'No se encontraron productos' : 'No hay productos en inventario'}
                </p>
            </div>
          );
        }

        // Group by category
        const grouped: Record<string, ProductData[]> = {};
        filtered.forEach(p => {
          const catName = p.categories?.name || 'Sin Categoría';
          if (!grouped[catName]) grouped[catName] = [];
          grouped[catName].push(p);
        });

        const categoryOrder = Object.keys(grouped).sort((a, b) => {
          if (a === 'Sin Categoría') return 1;
          if (b === 'Sin Categoría') return -1;
          return a.localeCompare(b);
        });

        return (
          <div className="space-y-10">
            {categoryOrder.map(catName => (
              <div key={catName} className="space-y-4">
                {/* Category Header */}
                <div className="flex items-center gap-4 px-2">
                  <div className="w-10 h-10 bg-blue-50 rounded-[14px] flex items-center justify-center text-blue-500 border border-blue-100">
                    <Tags className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">{catName}</h2>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{grouped[catName].length} producto{grouped[catName].length !== 1 ? 's' : ''}</p>
                  </div>
                </div>

                {/* Desktop Table */}
                <div className="hidden lg:block bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Producto</th>
                          {warehouses.map(w => (
                            <th key={w.id} className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-l border-slate-50">
                              {w.name}
                            </th>
                          ))}
                          <th className="px-8 py-5 text-[10px] font-black text-slate-900 uppercase tracking-widest text-center border-l border-slate-100 bg-slate-50/80">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {grouped[catName].map(p => {
                          let totalStock = 0;
                          return (
                            <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                              <td className="px-8 py-5 font-bold text-slate-900 border-r border-slate-50">
                                <div className="flex flex-col">
                                  <span className="font-black text-slate-800 uppercase text-xs tracking-tight group-hover:text-blue-600 transition-colors">{p.name}</span>
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {p.brands?.name && <span className="text-[7px] font-black bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-md uppercase border border-slate-200/50">{p.brands.name}</span>}
                                    {p.color && <span className="text-[7px] font-bold text-slate-300 uppercase">• {p.color}</span>}
                                  </div>
                                </div>
                              </td>
                              {warehouses.map(w => {
                                const stock = getStock(p.id, w.id);
                                totalStock += stock;
                                return (
                                  <td key={w.id} className="px-8 py-5 text-center">
                                    <span className={cn(
                                      "px-4 py-2 rounded-xl font-black text-xs transition-all",
                                      stock <= 5 ? 'bg-red-50 text-red-600 border border-red-100 shadow-sm' : 'bg-white text-slate-600 border border-slate-100'
                                    )}>
                                      {stock}
                                    </span>
                                  </td>
                                );
                              })}
                              <td className="px-8 py-5 text-center font-black text-slate-900 bg-slate-50/30 border-l border-slate-100 text-lg tracking-tighter">
                                {totalStock}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile Cards */}
                <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {grouped[catName].map(p => (
                    <div key={p.id} className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group">
                      <div className="flex justify-between items-start mb-5">
                        <div className="w-12 h-12 bg-slate-50 rounded-[18px] flex items-center justify-center text-slate-300 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors border border-slate-100">
                          <Package className="w-6 h-6" />
                        </div>
                        <div className="text-right">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total</span>
                          <span className="text-2xl font-black text-slate-900 tracking-tighter">
                            {warehouses.reduce((acc, w) => acc + getStock(p.id, w.id), 0)}
                          </span>
                        </div>
                      </div>

                      <div className="mb-5">
                        <h3 className="font-black text-slate-900 uppercase text-xs tracking-tight leading-tight group-hover:text-blue-600 transition-colors mb-2">{p.name}</h3>
                        <div className="flex flex-wrap gap-1">
                          {p.brands?.name && <span className="text-[7px] font-black bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-md uppercase border border-slate-200/50">{p.brands.name}</span>}
                          {p.color && <span className="text-[7px] font-bold text-slate-300 uppercase">• {p.color}</span>}
                        </div>
                      </div>

                      <div className="mt-auto pt-5 border-t border-slate-50 grid grid-cols-2 gap-3">
                        {warehouses.map(w => {
                          const stock = getStock(p.id, w.id);
                          return (
                            <div key={w.id} className={cn(
                              "p-3 rounded-2xl border transition-all flex flex-col items-center",
                              stock <= 5 ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'
                            )}>
                              <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1 truncate w-full text-center">{w.name}</span>
                              <span className={cn("text-xs font-black", stock <= 5 ? 'text-red-600' : 'text-slate-900')}>{stock}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-0 md:p-4 z-[100] animate-in fade-in duration-300">
          <div className="bg-white md:rounded-[48px] shadow-2xl max-w-lg w-full h-full md:h-auto overflow-hidden animate-in slide-in-from-bottom-8 duration-500 flex flex-col">
            <div className="px-8 md:px-10 py-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
              <div>
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Traspasar</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Mover mercadería entre depósitos</p>
              </div>
              <button onClick={() => { setShowTransferModal(false); setTransferList([]); }} className="p-4 bg-white rounded-2xl text-slate-300 hover:text-slate-600 transition-colors shadow-sm">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 md:p-10 custom-scrollbar space-y-8">
                <form id="transfer-form" onSubmit={handleTransfer} className="space-y-8">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Producto a Mover</label>
                        <div className="relative">
                            <input 
                                type="text"
                                placeholder="Escribe nombre, marca o modelo..."
                                className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-3xl text-slate-900 font-black uppercase text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300 placeholder:font-normal"
                                value={productSearch || (products.find(p => p.id === selectedProductId)?.name || '')}
                                onFocus={() => { setShowProductDropdown(true); setProductSearch(''); }}
                                onChange={(e) => {
                                    setProductSearch(e.target.value);
                                    setShowProductDropdown(true);
                                }}
                            />
                            <Search className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 pointer-events-none" />

                            {showProductDropdown && (
                                <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-200 rounded-[32px] shadow-2xl max-h-[300px] overflow-y-auto z-[60] py-4 animate-in fade-in slide-in-from-top-4 duration-300 custom-scrollbar">
                                    {products
                                        .filter(p => 
                                            p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                                            p.brands?.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
                                            p.product_models?.name?.toLowerCase().includes(productSearch.toLowerCase())
                                        )
                                        .slice(0, 15)
                                        .map(p => (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedProductId(p.id);
                                                    setProductSearch(p.name);
                                                    setShowProductDropdown(false);
                                                }}
                                                className="w-full text-left px-8 py-4 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                                            >
                                                <div className="font-black text-slate-900 text-xs uppercase tracking-tight">{p.name}</div>
                                                <div className="flex items-center space-x-2 mt-1">
                                                    {p.brands?.name && <span className="text-[8px] font-black text-blue-600 uppercase">{p.brands.name}</span>}
                                                    {p.color && <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{p.color}</span>}
                                                </div>
                                            </button>
                                        ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Depósito Origen</label>
                            <select 
                                required
                                className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-3xl text-slate-900 font-black uppercase text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                                value={fromWarehouseId}
                                onChange={(e) => setFromWarehouseId(e.target.value)}
                            >
                                <option value="">Seleccionar...</option>
                                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Depósito Destino</label>
                            <select 
                                required
                                className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-3xl text-slate-900 font-black uppercase text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                                value={toWarehouseId}
                                onChange={(e) => setToWarehouseId(e.target.value)}
                            >
                                <option value="">Seleccionar...</option>
                                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Cantidad</label>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1">
                                <input 
                                    type="number"
                                    min="1"
                                    className="w-full px-8 py-6 bg-slate-50 border border-slate-200 rounded-3xl font-black text-4xl text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all tracking-tighter"
                                    value={quantity}
                                    onChange={(e) => setQuantity(Number(e.target.value))}
                                />
                                {selectedProductId && fromWarehouseId && (
                                    <div className="flex items-center mt-3 ml-2 space-x-2">
                                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Disponible: <span className="text-blue-600">{getStock(selectedProductId, fromWarehouseId)} UNID.</span></span>
                                    </div>
                                )}
                            </div>
                            <button 
                                type="button"
                                onClick={addToTransferList}
                                disabled={!selectedProductId || quantity <= 0}
                                className="sm:w-20 bg-slate-900 text-white rounded-3xl flex items-center justify-center hover:bg-blue-600 transition-all active:scale-90 shadow-xl shadow-slate-200 disabled:opacity-50 h-20 sm:h-auto"
                            >
                                <Plus className="w-8 h-8" />
                            </button>
                        </div>
                    </div>

                    {transferList.length > 0 && (
                        <div className="space-y-4 animate-in slide-in-from-top-4 duration-500">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Ítems para Transferir</label>
                            <div className="space-y-2">
                                {transferList.map((item, idx) => (
                                    <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between group shadow-sm">
                                        <div className="min-w-0 flex-1 pr-4">
                                            <div className="font-black text-slate-900 text-[10px] uppercase truncate tracking-tight">{item.name}</div>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <div className="bg-white px-4 py-1.5 rounded-xl border border-slate-100 font-black text-slate-900 text-sm shadow-sm">{item.quantity}</div>
                                            <button type="button" onClick={() => removeFromTransferList(idx)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><X className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </form>
            </div>

            <div className="p-8 md:p-10 border-t border-slate-100 bg-white shrink-0">
                <button 
                  form="transfer-form"
                  type="submit" 
                  disabled={isSubmitting || transferList.length === 0} 
                  className="w-full py-6 bg-slate-900 hover:bg-blue-600 text-white rounded-[28px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-slate-200 active:scale-95 transition-all text-[10px] disabled:opacity-50"
                >
                  {isSubmitting ? 'Procesando...' : `Confirmar Traspaso de ${transferList.length} ítems`}
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-0 md:p-4 z-[100] animate-in fade-in duration-300">
          <div className="bg-white md:rounded-[48px] shadow-2xl max-w-lg w-full h-full md:h-auto overflow-hidden animate-in slide-in-from-bottom-8 duration-500 flex flex-col">
            <div className="px-10 py-10 bg-orange-50/50 border-b border-orange-100 flex justify-between items-center shrink-0">
              <div>
                  <h2 className="text-2xl font-black text-orange-900 uppercase tracking-tighter">Ajustar</h2>
                  <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mt-1">Corrección manual de stock</p>
              </div>
              <button onClick={() => setShowAdjustModal(false)} className="p-4 bg-white rounded-2xl text-orange-300 hover:text-orange-600 transition-colors shadow-sm">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleAdjust} className="p-10 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Producto</label>
                  <select 
                    required
                    className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-3xl text-slate-900 font-black uppercase text-xs outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all appearance-none cursor-pointer"
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                  >
                    <option value="">Seleccionar...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Depósito</label>
                  <select 
                    required
                    className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-3xl text-slate-900 font-black uppercase text-xs outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all appearance-none cursor-pointer"
                    value={fromWarehouseId}
                    onChange={(e) => setFromWarehouseId(e.target.value)}
                  >
                    <option value="">Seleccionar...</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Cambio de Cantidad</label>
                <div className="flex items-center gap-4">
                    <input 
                        type="number"
                        required
                        className="flex-1 px-8 py-6 bg-slate-50 border border-slate-200 rounded-3xl font-black text-4xl text-slate-900 outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all tracking-tighter"
                        placeholder="Ej: -5 ó +5"
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                    />
                    <div className={cn(
                        "w-20 h-20 rounded-[28px] flex flex-col items-center justify-center border font-black text-[8px] uppercase tracking-widest transition-all",
                        quantity < 0 ? 'bg-red-50 text-red-600 border-red-100 shadow-xl shadow-red-50' : 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-xl shadow-emerald-50'
                    )}>
                        {quantity < 0 ? 'Resta' : 'Suma'}
                    </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Motivo / Notas</label>
                <textarea 
                  className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-3xl text-slate-900 font-bold outline-none h-32 resize-none placeholder:font-normal placeholder:text-slate-300"
                  placeholder="Ej: Merma por daño, error de conteo..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting || quantity === 0} 
                className="w-full py-6 bg-orange-600 hover:bg-orange-700 text-white rounded-[28px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-orange-100 active:scale-95 transition-all text-[10px] disabled:opacity-50"
              >
                {isSubmitting ? 'Procesando...' : 'Aplicar Ajuste de Stock'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-0 md:p-4 z-[100] animate-in fade-in duration-300">
          <div className="bg-white md:rounded-[48px] shadow-2xl max-w-4xl w-full h-full md:h-[80vh] overflow-hidden animate-in slide-in-from-bottom-8 duration-500 flex flex-col">
            <div className="px-8 md:px-12 py-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Movimientos</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-3">Últimos traspasos y ajustes</p>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="p-4 bg-white hover:bg-slate-100 rounded-2xl text-slate-300 transition-colors shadow-sm">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 md:p-12 overflow-y-auto flex-1 custom-scrollbar space-y-4">
                {loadingHistory ? (
                    <div className="py-20 text-center animate-pulse text-slate-300 font-black uppercase tracking-widest text-[10px]">Cargando historial...</div>
                ) : history.length === 0 ? (
                    <div className="py-20 text-center flex flex-col items-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center text-slate-200 mb-6 border border-slate-100">
                            <HistoryIcon className="w-10 h-10" />
                        </div>
                        <span className="text-[10px] font-black uppercase text-slate-300 tracking-widest">No hay registros</span>
                    </div>
                ) : (
                    history.map((h) => (
                        <div key={h.id} className="p-6 bg-white rounded-[32px] border border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between hover:shadow-xl transition-all duration-300 group gap-6">
                            <div className="flex items-center space-x-5">
                                <div className={cn(
                                    "w-14 h-14 rounded-[22px] flex items-center justify-center shadow-inner border border-white shrink-0",
                                    h.to_warehouse_id ? 'bg-blue-50 text-blue-500' : 'bg-orange-50 text-orange-500'
                                )}>
                                    {h.to_warehouse_id ? <ArrowLeftRight className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                                </div>
                                <div className="min-w-0">
                                    <div className="font-black text-slate-900 text-sm md:text-base uppercase tracking-tight truncate leading-tight group-hover:text-blue-600 transition-colors">
                                        {h.products?.name}
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        {h.products?.brands?.name && <span className="text-[7px] font-black bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-md uppercase border border-slate-200/50">{h.products.brands.name}</span>}
                                        <div className="flex items-center text-[8px] font-black text-slate-300 uppercase tracking-widest">
                                            <Calendar className="w-3 h-3 mr-1.5" />
                                            {new Date(h.created_at).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="w-full md:w-auto flex items-center justify-between md:justify-end gap-10 bg-slate-50/50 md:bg-transparent p-4 md:p-0 rounded-2xl border border-slate-100 md:border-0">
                                <div className="flex items-center space-x-6">
                                    <div className="flex flex-col md:items-end">
                                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">{h.to_warehouse_id ? 'Desde' : 'Depósito'}</span>
                                        <span className="text-xs font-black text-slate-600">{h.from?.name}</span>
                                    </div>
                                    {h.to_warehouse_id && (
                                        <>
                                            <ArrowRight className="w-4 h-4 text-slate-300" />
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Hacia</span>
                                                <span className="text-xs font-black text-slate-600">{h.to?.name}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                                <div className={cn(
                                    "text-2xl font-black tracking-tighter shrink-0",
                                    h.quantity < 0 ? 'text-red-500' : 'text-emerald-600'
                                )}>
                                    {h.quantity > 0 && h.to_warehouse_id === null ? '+' : ''}{h.quantity} <span className="text-[10px] text-slate-300 uppercase tracking-widest ml-1">UNID.</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
