'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { 
  ShoppingBag, 
  Search, 
  Package, 
  CheckCircle2,
  X,
  Phone,
  User as UserIcon,
  ShoppingCart,
  ChevronRight,
  Filter,
  ArrowRight,
  Minus,
  Plus,
  Heart,
  Loader2
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  category_id: string | null;
  brand_id: string | null;
  color: string | null;
  image_url: string | null;
  brands?: { name: string } | null;
  categories?: { name: string } | null;
  price_tiers: { min_quantity: number, price_per_unit: number }[];
}

interface CartItem {
    id: string;
    name: string;
    quantity: number | string;
    price: number;
}

export default function CatalogoPublico() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showOrderModal, setShowOrderModal] = useState(false);
  
  // Quick Quantity Selection
  const [showQtyModal, setShowQtyModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quickQty, setQuickQty] = useState<string | number>(1);

  // Client info for order
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Filter Categories/Brands
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string>('');

  useEffect(() => {
    fetchProducts();
    fetchFilters();
  }, []);

  const fetchFilters = async () => {
    const [catRes, brandRes] = await Promise.all([
      supabase.from('categories').select('*').order('name'),
      supabase.from('brands').select('*').order('name')
    ]);
    setCategories(catRes.data || []);
    setBrands(brandRes.data || []);
  };

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*, price_tiers(*), brands(name), categories(name)');
    
    if (!error) setProducts(data || []);
    setLoading(false);
  };

  const getTieredPrice = (product: Product, quantity: number) => {
    const tiers = [...product.price_tiers].sort((a,b) => b.min_quantity - a.min_quantity);
    const tier = tiers.find(t => quantity >= t.min_quantity);
    return tier ? tier.price_per_unit : 0;
  };

  const handleQuickAdd = (product: Product) => {
    setSelectedProduct(product);
    setQuickQty(1);
    setShowQtyModal(true);
  };

  const confirmQuickAdd = () => {
    if (!selectedProduct) return;
    const qty = parseInt(quickQty.toString()) || 1;
    const existing = cart.find(i => i.id === selectedProduct.id);
    const existingQty = existing ? (typeof existing.quantity === 'string' ? parseInt(existing.quantity) || 0 : existing.quantity) : 0;
    const newQty = existingQty + qty;
    const price = getTieredPrice(selectedProduct, newQty);
    
    if (existing) {
        setCart(cart.map(i => i.id === selectedProduct.id ? { ...i, quantity: newQty, price } : i));
    } else {
        setCart([...cart, { id: selectedProduct.id, name: selectedProduct.name, quantity: qty, price }]);
    }
    setShowQtyModal(false);
  };

  const updateCartQuantity = (id: string, delta: number) => {
      const product = products.find(p => p.id === id);
      if (!product) return;
      setCart(cart.map(item => {
          if (item.id === id) {
              const currentQty = typeof item.quantity === 'string' ? (parseInt(item.quantity) || 0) : item.quantity;
              const newQty = Math.max(0, currentQty + delta);
              if (newQty === 0) return null;
              const newPrice = getTieredPrice(product, newQty);
              return { ...item, quantity: newQty, price: newPrice };
          }
          return item;
      }).filter(Boolean) as CartItem[]);
  };

  const total = cart.reduce((acc, i) => {
      const qty = typeof i.quantity === 'string' ? (parseInt(i.quantity) || 0) : i.quantity;
      return acc + (i.price * qty);
  }, 0);

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { data: customerData } = await supabase.from('customers').insert([
        { name: clientName, phone: clientPhone }
    ]).select();

    const customerId = customerData?.[0]?.id;

    const { data: saleData } = await supabase.from('sales').insert([{
        customer_id: customerId,
        total_amount: total,
        status: 'pending'
    }]).select();

    const saleId = saleData?.[0]?.id;

    if (saleId) {
        const items = cart.map(i => {
            const qty = typeof i.quantity === 'string' ? (parseInt(i.quantity) || 0) : i.quantity;
            return {
                sale_id: saleId,
                product_id: i.id,
                quantity: qty,
                unit_price: i.price,
                total: i.price * qty
            };
        });
        await supabase.from('sale_items').insert(items);
    }

    setIsSubmitting(false);
    setSuccess(true);
    setCart([]);
    setTimeout(() => {
        setSuccess(false);
        setShowOrderModal(false);
    }, 4000);
  };

  const filtered = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory ? p.category_id === selectedCategory : true;
    const matchesBrand = selectedBrand ? p.brand_id === selectedBrand : true;
    return matchesSearch && matchesCategory && matchesBrand;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] selection:bg-blue-100 pb-24 lg:pb-0">
      {/* Dynamic Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">NICO LANAS</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Catálogo Premium</p>
            </div>
          </div>

          <div className="hidden md:flex items-center bg-slate-100/50 border border-slate-200 px-4 py-2.5 rounded-2xl w-96 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
            <Search className="w-4 h-4 text-slate-400 mr-2" />
            <input 
                type="text" 
                placeholder="Buscar por nombre o color..." 
                className="bg-transparent text-sm outline-none w-full text-slate-900 font-medium"
                value={search}
                onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-4">
              <button 
                onClick={() => setShowOrderModal(true)}
                className="relative p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all group shadow-sm"
              >
                <ShoppingCart className="w-6 h-6 text-slate-600 group-hover:text-blue-600" />
                {cart.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-white animate-in zoom-in">
                        {cart.length}
                    </span>
                )}
              </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
        {/* Mobile Search */}
        <div className="md:hidden mb-8">
            <div className="flex items-center bg-white border border-slate-200 px-4 py-4 rounded-3xl shadow-sm">
                <Search className="w-5 h-5 text-slate-400 mr-3" />
                <input 
                    type="text" 
                    placeholder="¿Qué estás buscando?" 
                    className="bg-transparent text-base outline-none w-full text-slate-900 font-medium"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>
        </div>

        {/* Hero Section */}
        <div className="mb-12 space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-tight">
                        Colección <span className="text-blue-600">2026</span>
                    </h2>
                    <p className="text-slate-500 font-medium mt-2 max-w-lg">
                        Explora nuestra variedad de lanas de alta calidad. Haz tu pedido y coordina el pago por WhatsApp.
                    </p>
                </div>
                
                <div className="flex items-center space-x-2 text-sm font-bold text-slate-400 overflow-x-auto pb-2 scrollbar-hide">
                    <Filter className="w-4 h-4 mr-2" />
                    <button 
                        onClick={() => setSelectedCategory('')}
                        className={`px-5 py-2.5 rounded-full transition-all whitespace-nowrap ${!selectedCategory ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-500'}`}
                    >
                        Todos
                    </button>
                    {categories.map(c => (
                        <button 
                            key={c.id}
                            onClick={() => setSelectedCategory(c.id)}
                            className={`px-5 py-2.5 rounded-full transition-all whitespace-nowrap ${selectedCategory === c.id ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-500'}`}
                        >
                            {c.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Brand Chips */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-hide">
                <span className="text-[10px] font-black uppercase text-slate-300 tracking-widest mr-2 whitespace-nowrap">Marcas:</span>
                {brands.map(b => (
                    <button 
                        key={b.id}
                        onClick={() => setSelectedBrand(selectedBrand === b.id ? '' : b.id)}
                        className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all border whitespace-nowrap ${selectedBrand === b.id ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                    >
                        {b.name}
                    </button>
                ))}
            </div>
        </div>

        {/* Product Grid */}
        {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-8">
                {[1,2,3,4,5,6,7,8,9,10].map(i => (
                    <div key={i} className="aspect-[3/4] bg-white rounded-[32px] animate-pulse border border-slate-100"></div>
                ))}
            </div>
        ) : filtered.length === 0 ? (
            <div className="py-24 text-center">
                <div className="w-20 h-20 bg-slate-100 rounded-[30px] flex items-center justify-center mx-auto mb-6 text-slate-300">
                    <Package className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-black text-slate-900">Sin resultados</h3>
                <p className="text-slate-500 mt-2">Intenta con otros filtros o términos de búsqueda.</p>
            </div>
        ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-8">
                {filtered.map(p => (
                    <div key={p.id} className="group bg-white rounded-[32px] overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 border border-slate-100 flex flex-col h-full">
                      <div className="aspect-[1/1] md:aspect-[4/5] bg-[#F1F5F9] relative overflow-hidden">
                        {p.image_url ? (
                            <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <Package className="w-12 h-12" />
                            </div>
                        )}
                        
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                            <button 
                                onClick={() => handleQuickAdd(p)}
                                className="w-full py-3 bg-white text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500"
                            >
                                Seleccionar Cantidad
                            </button>
                        </div>

                        <div className="absolute top-4 left-4">
                            <span className="bg-white/90 backdrop-blur shadow-sm px-3 py-1 rounded-full text-[9px] font-black text-slate-900 uppercase tracking-widest">
                                {p.categories?.name || 'Lana'}
                            </span>
                        </div>
                      </div>

                      <div className="p-4 md:p-6 flex-1 flex flex-col">
                        <div className="flex-1">
                            <h3 className="font-bold text-sm md:text-base text-slate-900 leading-snug group-hover:text-blue-600 transition-colors uppercase tracking-tight">{p.name}</h3>
                            <p className="text-[10px] md:text-xs font-medium text-slate-400 mt-1 mb-4">{p.color} • {p.brands?.name}</p>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-slate-50">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Desde</span>
                                <span className="text-xl font-black text-blue-600">{p.price_tiers?.[0]?.price_per_unit || 0} BS</span>
                            </div>
                            <button 
                                onClick={() => handleQuickAdd(p)}
                                className="w-full mt-4 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                            >
                                Añadir Pedido
                            </button>
                        </div>
                      </div>
                    </div>
                ))}
            </div>
        )}
      </main>

      {/* Quick Quantity Modal */}
      {showQtyModal && selectedProduct && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-[40px] shadow-2xl max-w-sm w-full p-8 animate-in zoom-in duration-300">
                  <div className="flex justify-between items-center mb-6">
                      <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">Cantidad</h4>
                      <button onClick={() => setShowQtyModal(false)} className="p-2 text-slate-300"><X /></button>
                  </div>

                  <div className="flex items-center space-x-4 mb-8">
                      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center border border-slate-100 text-slate-300 overflow-hidden">
                          {selectedProduct.image_url ? (
                              <img src={selectedProduct.image_url} className="w-full h-full object-cover" />
                          ) : <Package className="w-8 h-8" />}
                      </div>
                      <div>
                          <div className="font-black text-slate-900 text-sm uppercase leading-tight">{selectedProduct.name}</div>
                          <div className="text-xs font-bold text-blue-600">Precio actual: {getTieredPrice(selectedProduct, parseInt(quickQty.toString()) || 0)} BS</div>
                      </div>
                  </div>

                  <div className="flex items-center justify-center space-x-8 mb-8">
                      <button 
                        onClick={() => setQuickQty(Math.max(1, (parseInt(quickQty.toString()) || 1) - 1))}
                        className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-all"
                      >
                        <Minus className="w-6 h-6" />
                      </button>
                      <input 
                        type="number" 
                        className="text-4xl font-black text-slate-900 w-24 text-center bg-transparent outline-none border-b-4 border-slate-100 focus:border-blue-600 transition-all py-2"
                        value={quickQty}
                        onChange={(e) => setQuickQty(e.target.value)}
                        onBlur={() => { if (!quickQty) setQuickQty(1); }}
                      />
                      <button 
                        onClick={() => setQuickQty((parseInt(quickQty.toString()) || 0) + 1)}
                        className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-all"
                      >
                        <Plus className="w-6 h-6" />
                      </button>
                  </div>

                  {/* PRICE TIERS INSIDE MODAL */}
                  <div className="bg-slate-50 rounded-3xl p-6 mb-8">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Tabla de descuentos</p>
                      <div className="space-y-2">
                          {selectedProduct.price_tiers.sort((a,b) => a.min_quantity - b.min_quantity).map((t, idx) => {
                              const isActive = (parseInt(quickQty.toString()) || 0) >= t.min_quantity;
                              return (
                                  <div key={idx} className={`flex justify-between items-center p-2 rounded-xl transition-all ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-500'}`}>
                                      <span className={`text-[11px] font-bold ${isActive ? 'text-white' : 'text-slate-400'}`}>{t.min_quantity}+ unidades</span>
                                      <span className="font-black text-sm">{t.price_per_unit} BS</span>
                                  </div>
                              );
                          })}
                      </div>
                  </div>

                  <button 
                    onClick={confirmQuickAdd}
                    className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-100 transition-all active:scale-95"
                  >
                    Confirmar Añadir
                  </button>
              </div>
          </div>
      )}

      {/* Floating Mobile Cart Indicator */}
      {cart.length > 0 && (
          <div className="fixed bottom-6 left-6 right-6 z-50 md:hidden animate-in slide-in-from-bottom-10 duration-500">
              <button 
                onClick={() => setShowOrderModal(true)}
                className="w-full bg-blue-600 text-white py-5 rounded-[28px] shadow-2xl shadow-blue-300 flex items-center justify-between px-8"
              >
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                        <ShoppingCart className="w-6 h-6" />
                        <span className="absolute -top-2 -right-2 bg-white text-blue-600 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">
                            {cart.length}
                        </span>
                    </div>
                    <span className="font-black text-sm uppercase tracking-widest">Ver mi pedido</span>
                  </div>
                  <div className="flex items-center font-black">
                      <span className="text-lg">{total.toFixed(2)} BS</span>
                      <ArrowRight className="w-5 h-5 ml-2" />
                  </div>
              </button>
          </div>
      )}

      {/* Modal Pedido */}
      {showOrderModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-0 md:p-4 animate-in fade-in duration-300">
              <div className="bg-white md:rounded-[48px] shadow-2xl max-w-5xl w-full h-full md:h-[85vh] overflow-y-auto md:overflow-hidden flex flex-col md:flex-row animate-in slide-in-from-bottom-8 duration-500">
                  {/* Summary Side */}
                  <div className="w-full md:flex-[1.2] bg-slate-50/50 p-8 md:p-12 md:overflow-y-auto flex flex-col shrink-0 md:shrink">
                    <div className="flex items-center justify-between mb-10">
                        <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Tu Carrito</h3>
                        <button onClick={() => setShowOrderModal(false)} className="md:hidden p-3 bg-white rounded-2xl shadow-sm text-slate-400"><X className="w-6 h-6" /></button>
                    </div>
                    
                    {cart.length === 0 ? (
                        <div className="flex-1 py-12 flex flex-col items-center justify-center text-slate-300 space-y-4">
                            <ShoppingCart className="w-16 h-16" />
                            <p className="font-bold uppercase tracking-widest text-xs">Tu carrito está vacío</p>
                            <button onClick={() => setShowOrderModal(false)} className="text-blue-600 font-black uppercase text-[10px] tracking-widest mt-4 underline">Volver al catálogo</button>
                        </div>
                    ) : (
                        <div className="space-y-4 flex-1">
                            {cart.map(i => (
                                <div key={i.id} className="flex justify-between items-center bg-white p-4 md:p-5 rounded-3xl border border-slate-100 shadow-sm group">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-14 h-14 md:w-16 md:h-16 bg-slate-100 rounded-2xl flex items-center justify-center border border-slate-100 text-slate-300 shrink-0">
                                            <Package className="w-7 h-7 md:w-8 md:h-8" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-black text-slate-900 text-xs md:text-sm uppercase tracking-tight truncate">{i.name}</div>
                                            <div className="text-[10px] md:text-xs text-blue-600 font-bold">{i.price} BS / unidad</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3 md:space-x-4">
                                        <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-100">
                                            <button onClick={() => updateCartQuantity(i.id, -1)} className="p-1.5 hover:bg-white rounded-lg text-slate-400 transition-colors"><Minus className="w-4 h-4" /></button>
                                            <input 
                                                type="number" 
                                                className="w-10 md:w-12 text-center bg-transparent font-black text-slate-900 text-sm outline-none"
                                                value={i.quantity}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    const num = parseInt(val) || 0;
                                                    const currentQty = typeof i.quantity === 'string' ? (parseInt(i.quantity) || 0) : i.quantity;
                                                    updateCartQuantity(i.id, num - currentQty);
                                                }}
                                            />
                                            <button onClick={() => updateCartQuantity(i.id, 1)} className="p-1.5 hover:bg-white rounded-lg text-slate-400 transition-colors"><Plus className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="pt-8 border-t border-slate-100 mt-8 mb-4 md:mb-0">
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total del Pedido</p>
                                <p className="text-4xl font-black text-slate-900 tracking-tighter">{total.toFixed(2)} BS</p>
                            </div>
                            <p className="hidden sm:block text-[10px] font-bold text-slate-400 text-right max-w-[120px] leading-tight italic">
                                * Los precios pueden variar según la cantidad final.
                            </p>
                        </div>
                    </div>
                  </div>

                  {/* Checkout Side */}
                  <div className="w-full md:flex-1 p-8 md:p-12 bg-white border-t md:border-t-0 md:border-l border-slate-100 flex flex-col justify-center relative shrink-0 md:shrink">
                      <button onClick={() => setShowOrderModal(false)} className="hidden md:flex absolute top-10 right-10 p-3 hover:bg-slate-50 rounded-2xl transition-all text-slate-300">
                        <X className="w-8 h-8" />
                      </button>

                      {success ? (
                          <div className="text-center py-12 space-y-8 animate-in zoom-in duration-500">
                              <div className="flex justify-center">
                                  <div className="w-24 h-24 bg-green-100 text-green-600 rounded-[40px] flex items-center justify-center animate-bounce shadow-xl shadow-green-100">
                                      <CheckCircle2 className="w-14 h-14" />
                                  </div>
                              </div>
                              <div className="space-y-2">
                                <h3 className="text-3xl font-black text-slate-900 tracking-tight">¡Pedido Recibido!</h3>
                                <p className="text-slate-500 font-medium">Hemos registrado tus datos. En unos minutos nos contactaremos contigo por WhatsApp.</p>
                              </div>
                              <button onClick={() => setShowOrderModal(false)} className="w-full py-5 bg-slate-900 text-white rounded-[24px] font-black uppercase text-xs tracking-widest shadow-2xl transition-all active:scale-95">Regresar al catálogo</button>
                          </div>
                      ) : (
                          <form onSubmit={handleOrder} className="space-y-8 md:space-y-10 py-4 md:py-0">
                              <div className="space-y-3">
                                  <h3 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Datos de Entrega</h3>
                                  <p className="text-slate-500 font-medium text-sm">Ingresa tus datos reales para que podamos enviarte el catálogo completo y precios mayoristas.</p>
                              </div>

                              <div className="space-y-6">
                                  <div className="group">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block group-focus-within:text-blue-600 transition-colors">Nombre Completo</label>
                                      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-3xl px-6 py-4 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-50 transition-all">
                                          <UserIcon className="w-5 h-5 text-slate-400 mr-4" />
                                          <input 
                                              required
                                              className="bg-transparent outline-none w-full text-slate-900 font-black placeholder:text-slate-300 placeholder:font-normal" 
                                              placeholder="Escribe tu nombre..."
                                              value={clientName}
                                              onChange={e => setClientName(e.target.value)}
                                          />
                                      </div>
                                  </div>
                                  <div className="group">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block group-focus-within:text-blue-600 transition-colors">WhatsApp / Teléfono</label>
                                      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-3xl px-6 py-4 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-50 transition-all">
                                          <Phone className="w-5 h-5 text-slate-400 mr-4" />
                                          <input 
                                              required
                                              className="bg-transparent outline-none w-full text-slate-900 font-black placeholder:text-slate-300 placeholder:font-normal" 
                                              placeholder="Nro de celular para contacto..."
                                              value={clientPhone}
                                              onChange={e => setClientPhone(e.target.value)}
                                          />
                                      </div>
                                  </div>
                              </div>

                              <div className="pt-4">
                                <button 
                                    type="submit"
                                    disabled={isSubmitting || cart.length === 0}
                                    className="w-full py-6 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs tracking-[0.2em] rounded-3xl shadow-2xl shadow-blue-200 transition-all active:scale-95 flex items-center justify-center space-x-3"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <span>Finalizar Pedido</span>
                                            <ChevronRight className="w-5 h-5" />
                                        </>
                                    )}
                                </button>
                                <p className="text-center text-[10px] font-bold text-slate-400 mt-6 uppercase tracking-wider pb-4 md:pb-0">
                                    Seguridad 100% Protegida • Pedido sin compromiso
                                </p>
                              </div>
                          </form>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
