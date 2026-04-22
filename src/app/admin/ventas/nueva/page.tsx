'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  User, 
  Warehouse, 
  CreditCard, 
  Banknote, 
  QrCode,
  CheckCircle2,
  X,
  History as HistoryIcon,
  Package,
  ArrowLeft,
  TrendingDown,
  ChevronRight,
  Minus,
  Plus as PlusIcon,
  UserPlus,
  Phone,
  MapPin,
  Loader2
} from 'lucide-react';
import Link from 'next/link';

import { cn } from '@/utils/cn';

interface Product {
  id: string;
  name: string;
  color: string | null;
  price_tiers: { min_quantity: number, price_per_unit: number }[];
  brands: { name: string } | null;
  categories: { name: string } | null;
  product_models: { name: string } | null;
  image_url: string | null;
}

interface CartItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
  warehouseId: string;
  warehouseName: string;
}

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<{ id: string, name: string }[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: string, name: string }[]>([]);
  const [globalInventory, setGlobalInventory] = useState<any[]>([]); // product_id -> warehouse_id -> quantity
  
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  
  // Qty & Warehouse Modal
  const [showQtyModal, setShowQtyModal] = useState(false);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [modalQty, setModalQty] = useState<string | number>(1);
  const [modalWarehouseId, setModalWarehouseId] = useState('');

  // New Customer Modal
  const [showCustModal, setShowCustModal] = useState(false);
  const [newCust, setNewCust] = useState({ name: '', phone: '', address: '' });
  const [isCreatingCust, setIsCreatingCust] = useState(false);
  
  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qr' | 'mixed' | 'credit'>('cash');
  const [cashAmount, setCashAmount] = useState(0);
  const [qrAmount, setQrAmount] = useState(0);
  const [initialPayment, setInitialPayment] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCheckoutMobile, setShowCheckoutMobile] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    const [pRes, cRes, wRes, invRes] = await Promise.all([
      supabase.from('products').select('*, price_tiers(*), categories(name), brands(name), product_models(name)'),
      supabase.from('customers').select('id, name').order('name'),
      supabase.from('warehouses').select('id, name').eq('is_active', true).order('name'),
      supabase.from('inventory').select('*')
    ]);
    setProducts(pRes.data || []);
    setCustomers(cRes.data || []);
    setWarehouses(wRes.data || []);
    setGlobalInventory(invRes.data || []);
    if (wRes.data && wRes.data.length > 0) {
        setSelectedWarehouse(wRes.data[0].id);
        setModalWarehouseId(wRes.data[0].id);
    }
  };

  const getProductStock = (productId: string, whId: string) => {
      return globalInventory.find(i => i.product_id === productId && i.warehouse_id === whId)?.quantity || 0;
  };

  const calculatePrice = (product: Product, quantity: number) => {
    const tiers = [...product.price_tiers].sort((a,b) => b.min_quantity - a.min_quantity);
    const tier = tiers.find(t => quantity >= t.min_quantity);
    return tier ? tier.price_per_unit : 0;
  };

  const handleProductClick = (product: Product) => {
    setActiveProduct(product);
    setModalQty(1);
    setModalWarehouseId(selectedWarehouse || warehouses[0]?.id || '');
    setShowQtyModal(true);
  };

  const confirmAddToCart = () => {
    if (!activeProduct || !modalWarehouseId) return;
    const qty = parseInt(modalQty.toString()) || 0;
    if (qty <= 0) return alert('La cantidad debe ser mayor a 0');

    const stock = getProductStock(activeProduct.id, modalWarehouseId);
    const existing = cart.find(item => item.id === activeProduct.id && item.warehouseId === modalWarehouseId);
    const currentInCart = existing?.quantity || 0;

    if (qty + currentInCart > stock) {
        return alert(`Stock insuficiente en el depósito seleccionado. Disponible: ${stock}`);
    }

    const warehouse = warehouses.find(w => w.id === modalWarehouseId);
    
    if (existing) {
        const newQty = existing.quantity + qty;
        const newPrice = calculatePrice(activeProduct, newQty);
        setCart(cart.map(item => 
            (item.id === activeProduct.id && item.warehouseId === modalWarehouseId) 
            ? { ...item, quantity: newQty, price: newPrice, total: newQty * newPrice } 
            : item
        ));
    } else {
        const price = calculatePrice(activeProduct, qty);
        setCart([...cart, {
            id: activeProduct.id,
            name: activeProduct.name,
            quantity: qty,
            price,
            total: qty * price,
            warehouseId: modalWarehouseId,
            warehouseName: warehouse?.name || 'Depósito'
        }]);
    }

    setShowQtyModal(false);
  };

  const removeFromCart = (id: string, warehouseId: string) => 
    setCart(cart.filter(item => !(item.id === id && item.warehouseId === warehouseId)));

  const updateQuantityInCart = (id: string, warehouseId: string, newQty: number) => {
    if (newQty < 1) return removeFromCart(id, warehouseId);
    const product = products.find(p => p.id === id);
    if (!product) return;
    
    const stock = getProductStock(id, warehouseId);
    if (newQty > stock) return alert('Sin stock suficiente en este depósito');

    const newPrice = calculatePrice(product, newQty);
    setCart(cart.map(item => (item.id === id && item.warehouseId === warehouseId) ? { ...item, quantity: newQty, price: newPrice, total: newQty * newPrice } : item));
  };

  const handleCreateCustomer = async () => {
    if (!newCust.name) return alert('El nombre es obligatorio');
    setIsCreatingCust(true);
    const { data, error } = await supabase.from('customers').insert([newCust]).select();
    if (error) {
        alert(error.message);
    } else {
        const created = data[0];
        setCustomers(prev => [...prev, created].sort((a,b) => a.name.localeCompare(b.name)));
        setSelectedCustomer(created.id);
        setShowCustModal(false);
        setNewCust({ name: '', phone: '', address: '' });
    }
    setIsCreatingCust(false);
  };

  const total = cart.reduce((acc, item) => acc + item.total, 0);

  const handleSubmit = async () => {
    if (cart.length === 0) return alert('El carrito está vacío');
    if ((paymentMethod === 'credit' || paymentMethod === 'mixed') && !selectedCustomer) {
        return alert('Debe seleccionar un cliente para ventas con deuda o pagos mixtos');
    }

    setIsSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase.from('sales').insert([{ 
        customer_id: selectedCustomer || null, 
        warehouse_id: selectedWarehouse || warehouses[0]?.id,
        total_amount: total, 
        payment_method: paymentMethod, 
        status: 'completed',
        seller_id: user?.id 
    }]).select();

    if (error) { alert(error.message); setIsSubmitting(false); return; }
    const saleId = data[0].id;
    const itemsWithWh = cart.map(item => ({ 
        sale_id: saleId, 
        product_id: item.id, 
        quantity: item.quantity, 
        unit_price: item.price, 
        total: item.total,
        warehouse_id: item.warehouseId
    }));
    await supabase.from('sale_items').insert(itemsWithWh);

    // Payments
    let amountPaid = 0;
    if (paymentMethod === 'mixed') {
        await supabase.from('payments').insert([{ sale_id: saleId, amount_cash: cashAmount, amount_qr: qrAmount }]);
        amountPaid = (Number(cashAmount) || 0) + (Number(qrAmount) || 0);
    } else if (paymentMethod === 'credit') {
        if (initialPayment > 0) await supabase.from('payments').insert([{ sale_id: saleId, amount_cash: initialPayment, amount_qr: 0 }]);
        amountPaid = Number(initialPayment) || 0;
    } else if (paymentMethod === 'cash') {
        await supabase.from('payments').insert([{ sale_id: saleId, amount_cash: total, amount_qr: 0 }]);
        amountPaid = total;
    } else if (paymentMethod === 'qr') {
        await supabase.from('payments').insert([{ sale_id: saleId, amount_cash: 0, amount_qr: total }]);
        amountPaid = total;
    }

    // Debt Ledger
    if (selectedCustomer && (paymentMethod === 'credit' || paymentMethod === 'mixed')) {
        const ledgerEntries = [
            { customer_id: selectedCustomer, amount: total, type: 'sale', reference_id: saleId, notes: `Venta #${saleId.slice(0,8)}` }
        ];
        if (amountPaid > 0) {
            ledgerEntries.push({ customer_id: selectedCustomer, amount: -amountPaid, type: 'payment', reference_id: saleId, notes: `Abono inicial venta #${saleId.slice(0,8)}` });
        }
        await supabase.from('debt_ledger').insert(ledgerEntries);
    }

    setCart([]); 
    setShowSuccess(true); 
    setIsSubmitting(false); 
    const { data: invUpdate } = await supabase.from('inventory').select('*');
    setGlobalInventory(invUpdate || []);
    setInitialPayment(0);
    setCashAmount(0);
    setQrAmount(0);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-6 antialiased bg-slate-50/50 -m-4 p-4 lg:-m-8 lg:p-8 min-h-screen relative">
        {/* Left: Products Grid */}
        <div className="flex-1 flex flex-col min-w-0">
            {/* Header Row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-8">
                <div className="flex items-center space-x-4">
                    <Link href="/admin/ventas" className="p-4 bg-white rounded-[20px] border border-slate-100 hover:bg-slate-50 transition-all shadow-sm group active:scale-95 shrink-0">
                        <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                    </Link>
                    <div className="sm:hidden">
                        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">Vender</h1>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Punto de Venta</p>
                    </div>
                </div>
                
                <div className="flex-1 bg-white p-5 rounded-[24px] border border-slate-100 flex items-center space-x-4 shadow-sm focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-blue-500 transition-all group">
                    <Search className="w-5 h-5 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Buscar producto..." 
                        className="flex-1 outline-none text-slate-900 font-black placeholder:text-slate-300 placeholder:font-black placeholder:uppercase placeholder:text-[10px] placeholder:tracking-widest text-sm" 
                        value={search} 
                        onChange={(e) => setSearch(e.target.value)} 
                    />
                </div>

                <div className="flex items-center bg-white border border-slate-100 rounded-[20px] px-6 py-5 space-x-3 shadow-sm">
                    <Warehouse className="w-4 h-4 text-blue-500" />
                    <select 
                        className="bg-transparent text-[10px] font-black text-slate-900 uppercase outline-none cursor-pointer tracking-widest" 
                        value={selectedWarehouse} 
                        onChange={e => setSelectedWarehouse(e.target.value)}
                    >
                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 pb-32">
                {filteredProducts.map(p => {
                    const totalStock = globalInventory.filter(i => i.product_id === p.id).reduce((acc, curr) => acc + curr.quantity, 0);
                    const inCart = cart.find(c => c.id === p.id);
                    return (
                        <button 
                            key={p.id} 
                            onClick={() => handleProductClick(p)} 
                            disabled={totalStock <= 0} 
                            className={cn(
                                "bg-white rounded-[28px] border-2 p-4 relative group transition-all duration-300 hover:shadow-2xl active:scale-[0.97] text-left",
                                totalStock <= 0 ? 'opacity-30 grayscale pointer-events-none border-slate-100' : '',
                                inCart ? 'border-blue-200 shadow-lg shadow-blue-50 ring-2 ring-blue-500/10' : 'border-slate-100 shadow-sm hover:border-blue-300'
                            )}
                        >
                            {inCart && (
                                <div className="absolute -top-2 -right-2 z-10 w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black text-xs shadow-lg shadow-blue-200 border-2 border-white">{inCart.quantity}</div>
                            )}
                            <div className="w-full aspect-square bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-[20px] flex items-center justify-center mb-4 overflow-hidden relative border border-slate-50">
                                {p.image_url ? (
                                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                ) : (
                                    <Package className="w-12 h-12 text-slate-200 group-hover:text-blue-200 transition-colors" />
                                )}
                                {totalStock > 0 && totalStock < 10 && (
                                    <div className="absolute top-2 right-2 bg-orange-500 text-white text-[7px] font-black px-2 py-1 rounded-lg uppercase shadow-lg">¡Bajo!</div>
                                )}
                            </div>
                            <div className="px-1">
                                <div className="text-[10px] font-black text-slate-900 uppercase truncate mb-1.5 leading-tight group-hover:text-blue-600 transition-colors">{p.name}</div>
                                <div className="flex flex-wrap gap-1 mb-3 min-h-[18px] overflow-hidden">
                                    {p.brands?.name && <span className="text-[6px] font-black bg-slate-50 text-slate-400 px-1.5 py-0.5 rounded-md uppercase border border-slate-100">{p.brands.name}</span>}
                                    {p.categories?.name && <span className="text-[6px] font-black bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md uppercase border border-blue-100">{p.categories.name}</span>}
                                </div>
                                <div className="flex justify-between items-end border-t border-slate-50 pt-3">
                                    <div className="flex flex-col">
                                        <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest">Stock</span>
                                        <span className={cn("text-[11px] font-black", totalStock < 10 ? 'text-orange-500' : 'text-slate-900')}>{totalStock}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm font-black text-blue-600 tracking-tighter">{p.price_tiers[0]?.price_per_unit.toFixed(2) || '0.00'}</span>
                                        <span className="text-[7px] font-black text-blue-300 ml-0.5 uppercase">BS</span>
                                    </div>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>

        {/* Right Sidebar: Checkout */}
        <div className={cn(
            "fixed inset-0 z-50 lg:relative lg:inset-auto lg:z-0 lg:flex lg:w-[400px] shrink-0 h-fit lg:sticky lg:top-8 transition-all duration-500 lg:translate-y-0",
            showCheckoutMobile ? "translate-y-0 opacity-100" : "translate-y-full lg:translate-y-0 opacity-0 lg:opacity-100"
        )}>
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md lg:hidden" onClick={() => setShowCheckoutMobile(false)} />
            <div className="relative w-full h-[92vh] mt-[8vh] lg:h-auto lg:mt-0 bg-white rounded-t-[36px] lg:rounded-[48px] border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-500">
                
                {/* Header */}
                <div className="px-5 py-4 lg:px-8 lg:py-6 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center shrink-0">
                   <div>
                       <h2 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">Tu Carrito</h2>
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Detalle de la venta</p>
                   </div>
                   <button onClick={() => setShowCheckoutMobile(false)} className="lg:hidden p-3 bg-white rounded-xl text-slate-400 shadow-sm"><X className="w-5 h-5" /></button>
                </div>

                {/* Customer Section */}
                <div className="px-5 py-3 lg:p-6 border-b border-slate-100 shrink-0 space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                            <User className="w-3.5 h-3.5 mr-2 text-blue-500" /> Cliente
                        </label>
                        <button 
                            onClick={() => setShowCustModal(true)} 
                            className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center hover:bg-blue-50 px-2 py-1 rounded-lg transition-all"
                        >
                            <UserPlus className="w-3 h-3 mr-2" /> Nuevo
                        </button>
                    </div>
                    <div className="relative group">
                        <select 
                            className="w-full pl-4 pr-10 py-3.5 lg:py-5 bg-slate-50 border border-slate-200 rounded-2xl lg:rounded-3xl text-xs font-black text-slate-900 uppercase outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 appearance-none transition-all cursor-pointer" 
                            value={selectedCustomer} 
                            onChange={(e) => setSelectedCustomer(e.target.value)}
                        >
                            <option value="">Consumidor Final / Varios...</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none rotate-90" />
                    </div>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto px-4 py-3 lg:p-6 space-y-3 bg-slate-50/20 scrollbar-hide">
                    {cart.length === 0 ? (
                        <div className="py-16 flex flex-col items-center justify-center text-slate-300">
                            <div className="w-16 h-16 bg-slate-50 rounded-[24px] flex items-center justify-center mb-4 text-slate-200 border border-slate-100">
                                <ShoppingCart className="w-8 h-8" />
                            </div>
                            <span className="text-[11px] font-black uppercase tracking-[0.2em] opacity-50">Carrito Vacío</span>
                            <p className="text-[10px] font-bold mt-1 opacity-40">Selecciona productos de la lista</p>
                        </div>
                    ) : cart.map(item => (
                        <div key={`${item.id}-${item.warehouseId}`} className="bg-white rounded-[20px] border border-slate-100 shadow-sm group animate-in slide-in-from-right-4 overflow-hidden">
                            {/* Top Row: Name + Delete */}
                            <div className="px-4 pt-3 pb-1.5 flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-black text-slate-900 uppercase leading-tight">{item.name}</div>
                                    <div className="flex items-center flex-wrap gap-1.5 mt-1">
                                        <span className="text-[7px] font-black bg-blue-600 text-white px-2 py-0.5 rounded-md uppercase tracking-wide">{item.warehouseName}</span>
                                        <span className="text-[9px] font-bold text-slate-400">×{item.quantity} = <span className="text-blue-600 font-black">{item.price.toFixed(2)} Bs</span> c/u</span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => removeFromCart(item.id, item.warehouseId)} 
                                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all shrink-0"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            {/* Bottom Row: Qty Controls + Total */}
                            <div className="px-4 pb-3 pt-1 flex items-center justify-between">
                                <div className="flex items-center bg-slate-50 rounded-xl p-0.5 border border-slate-100">
                                    <button onClick={() => updateQuantityInCart(item.id, item.warehouseId, item.quantity - 1)} className="w-8 h-8 flex items-center justify-center bg-white text-slate-900 rounded-lg shadow-sm hover:bg-red-50 hover:text-red-600 transition-all active:scale-90"><Minus className="w-3.5 h-3.5" /></button>
                                    <span className="w-9 text-center text-sm font-black text-slate-900">{item.quantity}</span>
                                    <button onClick={() => updateQuantityInCart(item.id, item.warehouseId, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center bg-white text-slate-900 rounded-lg shadow-sm hover:bg-blue-50 hover:text-blue-600 transition-all active:scale-90"><PlusIcon className="w-3.5 h-3.5" /></button>
                                </div>
                                <div className="text-right">
                                    <div className="text-base font-black text-slate-900 tracking-tighter leading-none">{item.total.toFixed(2)}</div>
                                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Bs Total</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Checkout Footer */}
                <div className="px-5 py-4 lg:p-8 bg-white border-t border-slate-100 mt-auto shadow-inner shrink-0">
                    <div className="flex justify-between items-end mb-4 lg:mb-6">
                        <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">Total de la Venta</span>
                            <div className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tighter mt-0.5">{total.toFixed(2)} <span className="text-sm text-slate-300">BS</span></div>
                        </div>
                        <div className="text-right">
                             <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{cart.length} productos</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 lg:gap-3 mb-4 lg:mb-6">
                        {[
                            { id: 'cash', icon: Banknote, color: 'emerald', label: 'Efectivo' },
                            { id: 'qr', icon: QrCode, color: 'cyan', label: 'QR' },
                            { id: 'mixed', icon: CreditCard, color: 'indigo', label: 'Mixto' },
                            { id: 'credit', icon: HistoryIcon, color: 'orange', label: 'Crédito' }
                        ].map((method: any) => (
                            <button 
                                key={method.id}
                                onClick={() => setPaymentMethod(method.id)} 
                                className={cn(
                                    "relative p-3 lg:p-4 rounded-2xl lg:rounded-3xl border transition-all flex flex-col items-center group",
                                    paymentMethod === method.id 
                                        ? `bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-200` 
                                        : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-white hover:border-slate-200'
                                )}
                            >
                                <method.icon className={cn("w-5 h-5 lg:w-6 lg:h-6", paymentMethod === method.id ? 'text-white' : 'text-slate-300 group-hover:text-slate-600')} />
                                <span className="text-[6px] lg:text-[7px] font-black uppercase mt-1.5 tracking-widest">{method.label}</span>
                            </button>
                        ))}
                    </div>

                    {paymentMethod === 'credit' && (
                        <div className="mb-4 lg:mb-6 animate-in slide-in-from-top-4 duration-300">
                            <label className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em] mb-1.5 block ml-2">Adelanto Inicial (Opcional)</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    className="w-full p-4 lg:p-6 bg-orange-50/50 border border-orange-100 rounded-2xl lg:rounded-[28px] font-black text-2xl lg:text-3xl text-orange-600 outline-none focus:ring-4 focus:ring-orange-500/10 placeholder:text-orange-200 tracking-tighter" 
                                    placeholder="0.00"
                                    value={initialPayment} 
                                    onChange={e => setInitialPayment(Math.min(Number(e.target.value), total))} 
                                />
                                <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-orange-300">BS</span>
                            </div>
                        </div>
                    )}

                    {paymentMethod === 'mixed' && (
                        <div className="mb-4 lg:mb-6 animate-in slide-in-from-top-4 duration-300 grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-2">Efectivo</label>
                                <input type="number" className="w-full p-3.5 lg:p-5 bg-emerald-50/50 border border-emerald-100 rounded-2xl font-black text-lg lg:text-xl text-emerald-700 outline-none focus:ring-4 focus:ring-emerald-500/10 tracking-tighter" value={cashAmount} onChange={e => setCashAmount(Number(e.target.value))} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-cyan-600 uppercase tracking-widest ml-2">QR</label>
                                <input type="number" className="w-full p-3.5 lg:p-5 bg-cyan-50/50 border border-cyan-100 rounded-2xl font-black text-lg lg:text-xl text-cyan-700 outline-none focus:ring-4 focus:ring-cyan-500/10 tracking-tighter" value={qrAmount} onChange={e => setQrAmount(Number(e.target.value))} />
                            </div>
                        </div>
                    )}

                    <button 
                        disabled={isSubmitting || cart.length === 0} 
                        onClick={handleSubmit} 
                        className={cn(
                            "w-full py-5 lg:py-6 rounded-2xl lg:rounded-[32px] font-black uppercase text-xs tracking-[0.3em] transition-all duration-500 flex items-center justify-center space-x-3",
                            showSuccess 
                                ? 'bg-emerald-500 text-white shadow-emerald-200' 
                                : 'bg-slate-900 text-white hover:bg-blue-600 shadow-2xl shadow-slate-300 active:scale-[0.98]',
                            isSubmitting && 'opacity-50 pointer-events-none'
                        )}
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : showSuccess ? (
                            <CheckCircle2 className="w-6 h-6 animate-bounce" />
                        ) : (
                            <>
                                <ShoppingCart className="w-5 h-5" />
                                <span>Finalizar Venta</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
      </div>

      {/* Floating Checkout Toggle (Mobile) */}
      {cart.length > 0 && !showCheckoutMobile && (
        <div className="lg:hidden fixed bottom-6 left-4 right-4 z-40 animate-in slide-in-from-bottom duration-500">
            <button onClick={() => setShowCheckoutMobile(true)} className="w-full bg-slate-900 text-white py-5 rounded-[24px] shadow-2xl shadow-slate-400/30 flex items-center justify-between px-8 active:scale-[0.98] transition-all">
                <div className="flex items-center space-x-3">
                    <div className="relative">
                        <ShoppingCart className="w-5 h-5" />
                        <div className="absolute -top-2 -right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-[8px] font-black">{cart.length}</div>
                    </div>
                    <span className="font-black text-[10px] uppercase tracking-widest">Ver Pedido</span>
                </div>
                <span className="font-black text-lg tracking-tighter">{total.toFixed(2)} <span className="text-xs opacity-60">BS</span></span>
            </button>
        </div>
      )}

      {/* Modal Selection */}
      {showQtyModal && activeProduct && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-[48px] shadow-2xl max-w-sm w-full p-10 animate-in zoom-in duration-300">
                  <div className="flex justify-between items-center mb-8">
                      <div>
                          <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Añadir Item</h4>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Configura tu pedido</p>
                      </div>
                      <button onClick={() => setShowQtyModal(false)} className="p-4 bg-slate-50 text-slate-300 hover:text-slate-600 rounded-2xl transition-colors"><X className="w-6 h-6" /></button>
                  </div>

                  <div className="flex items-center space-x-6 mb-10">
                      <div className="w-20 h-20 bg-slate-50 rounded-[28px] flex items-center justify-center border border-slate-100 text-slate-300 overflow-hidden shrink-0 shadow-inner">
                          {activeProduct.image_url ? <img src={activeProduct.image_url} className="w-full h-full object-cover" /> : <Package className="w-10 h-10" />}
                      </div>
                      <div className="min-w-0">
                          <div className="font-black text-slate-900 text-base uppercase truncate leading-none mb-2">{activeProduct.name}</div>
                          <div className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-tight border border-blue-100">
                              PU: {calculatePrice(activeProduct, parseInt(modalQty.toString()) || 0).toFixed(2)} BS
                          </div>
                      </div>
                  </div>

                  <div className="space-y-8 mb-10">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Cantidad a Vender</label>
                        <div className="flex items-center justify-center space-x-6 bg-slate-50 p-6 rounded-[32px] border border-slate-100 shadow-inner">
                            <button 
                                onClick={() => setModalQty(Math.max(1, (parseInt(modalQty.toString()) || 1) - 1))} 
                                className="w-14 h-14 bg-white text-slate-900 rounded-2xl flex items-center justify-center transition-all active:scale-90 shadow-lg border border-slate-100"
                            >
                                <Minus className="w-6 h-6" />
                            </button>
                            <input 
                                type="number" 
                                className="text-5xl font-black text-slate-900 w-28 text-center bg-transparent outline-none tracking-tighter" 
                                value={modalQty} 
                                onChange={(e) => setModalQty(e.target.value)} 
                            />
                            <button 
                                onClick={() => setModalQty((parseInt(modalQty.toString()) || 0) + 1)} 
                                className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center transition-all active:scale-90 shadow-xl shadow-slate-200"
                            >
                                <PlusIcon className="w-6 h-6" />
                            </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Seleccionar Depósito</label>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                            {warehouses.map(wh => {
                                const stock = getProductStock(activeProduct.id, wh.id);
                                const isSelected = modalWarehouseId === wh.id;
                                return (
                                    <button 
                                        key={wh.id} 
                                        onClick={() => setModalWarehouseId(wh.id)} 
                                        disabled={stock <= 0} 
                                        className={cn(
                                            "w-full flex justify-between items-center p-5 rounded-[24px] border transition-all duration-300",
                                            isSelected 
                                                ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-100 translate-x-1' 
                                                : 'bg-white border-slate-100 text-slate-500 hover:border-blue-200 hover:bg-blue-50/10',
                                            stock <= 0 && 'opacity-30 grayscale cursor-not-allowed'
                                        )}
                                    >
                                        <div className="flex items-center space-x-4">
                                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", isSelected ? 'bg-white/20' : 'bg-slate-50')}>
                                                <Warehouse className={cn("w-4 h-4", isSelected ? 'text-white' : 'text-slate-400')} />
                                            </div>
                                            <span className="text-[11px] font-black uppercase tracking-tight">{wh.name}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className={cn("text-[10px] font-black", isSelected ? 'text-white' : 'text-slate-900')}>{stock}</span>
                                            <span className={cn("text-[8px] font-bold block uppercase leading-none opacity-60", isSelected ? 'text-white' : 'text-slate-400')}>En Stock</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                      </div>
                  </div>

                  <button 
                    onClick={confirmAddToCart} 
                    className="w-full py-6 bg-slate-900 hover:bg-blue-600 text-white rounded-[28px] font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-slate-200 transition-all active:scale-[0.98] flex items-center justify-center space-x-3"
                  >
                      <ShoppingCart className="w-5 h-5" />
                      <span>Confirmar y Añadir</span>
                  </button>
              </div>
          </div>
      )}

      {/* Customer Modal */}
      {showCustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden">
                <div className="p-8 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                    <div><h3 className="text-xl font-black text-slate-900 uppercase">Nuevo Cliente</h3><p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Registro rápido</p></div>
                    <button onClick={() => setShowCustModal(false)} className="p-2 text-slate-400"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-8 space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Nombre</label>
                        <input 
                            type="text" 
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:border-blue-500 uppercase transition-all" 
                            value={newCust.name} 
                            onChange={e => setNewCust({...newCust, name: e.target.value})} 
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Teléfono</label>
                            <input 
                                type="text" 
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:border-blue-500 transition-all" 
                                value={newCust.phone} 
                                onChange={e => setNewCust({...newCust, phone: e.target.value})} 
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Dirección</label>
                            <input 
                                type="text" 
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:border-blue-500 uppercase transition-all" 
                                value={newCust.address} 
                                onChange={e => setNewCust({...newCust, address: e.target.value})} 
                            />
                        </div>
                    </div>
                    <button onClick={handleCreateCustomer} disabled={isCreatingCust} className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-[20px] uppercase text-xs tracking-widest shadow-xl shadow-blue-100 transition-all active:scale-95 disabled:opacity-50">
                        {isCreatingCust ? 'Guardando...' : 'Registrar y Seleccionar'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </>
  );
}
