'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/utils/supabase';
import { 
  Plus, 
  Package, 
  Trash2, 
  Edit2, 
  X, 
  Upload, 
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  Tags,
  Search,
  Filter
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface PriceTier {
  id?: string;
  min_quantity: number;
  price_per_unit: number;
}

interface Product {
  id: string;
  name: string;
  category_id: string | null;
  brand_id: string | null;
  model_id: string | null;
  brands: { name: string } | null;
  product_models: { name: string } | null;
  categories: { name: string } | null;
  color: string | null;
  image_url: string | null;
  cost_price: number;
  price_tiers: PriceTier[];
}

export default function ProductosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [modelId, setModelId] = useState('');
  const [color, setColor] = useState('');
  const [costPrice, setCostPrice] = useState(0);
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [priceTiers, setPriceTiers] = useState<PriceTier[]>([{ min_quantity: 1, price_per_unit: 0 }]);
  
  // Metadata Lists
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [brandsList, setBrandsList] = useState<any[]>([]);
  const [modelsList, setModelsList] = useState<any[]>([]);

  // Quick Add State
  const [quickAddType, setQuickAddType] = useState<'category' | 'brand' | 'model' | null>(null);
  const [quickAddName, setQuickAddName] = useState('');
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProducts();
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    const [catRes, brandRes, modelRes] = await Promise.all([
      supabase.from('categories').select('*').order('name'),
      supabase.from('brands').select('*').order('name'),
      supabase.from('product_models').select('*').order('name')
    ]);
    setCategoriesList(catRes.data || []);
    setBrandsList(brandRes.data || []);
    setModelsList(modelRes.data || []);
  };

  const handleQuickAdd = async () => {
    if (!quickAddName) return;
    setIsQuickAdding(true);
    
    try {
        let table = quickAddType === 'category' ? 'categories' : (quickAddType === 'brand' ? 'brands' : 'product_models');
        let data: any = { name: quickAddName };
        if (quickAddType === 'model') data.brand_id = brandId;

        const { data: inserted, error } = await supabase.from(table).insert([data]).select();
        if (error) throw error;

        const newId = inserted[0].id;
        if (quickAddType === 'category') {
            setCategoryId(newId);
        } else if (quickAddType === 'brand') {
            setBrandId(newId);
            setModelId('');
        } else if (quickAddType === 'model') {
            setModelId(newId);
        }

        await fetchMetadata();
        setQuickAddType(null);
        setQuickAddName('');
    } catch (err: any) {
        alert('Error: ' + err.message);
    } finally {
        setIsQuickAdding(false);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*, price_tiers(*), categories(name), brands(name), product_models(name)');

        console.log('DEBUG - PRODUCTOS DATA:', productsData);
        if (productsError) {
            console.error('DEBUG - ERROR:', productsError);
            throw productsError;
        }
        setProducts(productsData || []);
    } catch (err: any) {
        console.error(err);
        alert('Error al cargar productos: ' + err.message);
    } finally {
        setLoading(false);
    }
  };

  const handleAddTier = () => {
    setPriceTiers([...priceTiers, { min_quantity: 1, price_per_unit: 0 }]);
  };

  const handleRemoveTier = (index: number) => {
    setPriceTiers(priceTiers.filter((_, i) => i !== index));
  };

  const handleTierChange = (index: number, field: keyof PriceTier, value: number) => {
    const newTiers = [...priceTiers];
    newTiers[index] = { ...newTiers[index], [field]: value };
    setPriceTiers(newTiers);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const uploadImage = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}-${Date.now()}.${fileExt}`;
    const filePath = `product-images/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
        let finalImageUrl = imageUrl;

        // Upload image if a new file is selected
        if (imageFile) {
            finalImageUrl = await uploadImage(imageFile);
        }

        const productData = { 
            name, 
            category_id: categoryId || null,
            brand_id: brandId || null, 
            model_id: modelId || null, 
            color: color || null, 
            cost_price: costPrice,
            image_url: finalImageUrl || null
        };

        let productId = editingId;

        if (editingId) {
            await supabase.from('products').update(productData).eq('id', editingId);
            await supabase.from('price_tiers').delete().eq('product_id', editingId);
        } else {
            const { data, error } = await supabase.from('products').insert([productData]).select();
            if (error) throw error;
            productId = data[0].id;
        }

        if (productId) {
            const tiersToInsert = priceTiers.map(t => ({ ...t, product_id: productId }));
            await supabase.from('price_tiers').insert(tiersToInsert);
        }

        setShowModal(false);
        fetchProducts();
        resetForm();
    } catch (error: any) {
        alert('Error al guardar: ' + error.message);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setName(product.name);
    setCategoryId(product.category_id || '');
    setBrandId(product.brand_id || '');
    setModelId(product.model_id || '');
    setColor(product.color || '');
    setCostPrice(product.cost_price);
    setImageUrl(product.image_url || '');
    setPriceTiers(product.price_tiers && product.price_tiers.length > 0 
      ? product.price_tiers.sort((a,b) => a.min_quantity - b.min_quantity) 
      : [{ min_quantity: 1, price_per_unit: 0 }]);
    setShowModal(true);
  };

  const handleDelete = async (productId: string, productName: string) => {
    if (!confirm(`¿Estás seguro de eliminar "${productName}"? Esta acción no se puede deshacer.`)) return;
    
    try {
      // Delete price_tiers first (FK dependency)
      await supabase.from('price_tiers').delete().eq('product_id', productId);
      // Delete the product
      const { error } = await supabase.from('products').delete().eq('id', productId);
      if (error) throw error;
      fetchProducts();
    } catch (err: any) {
      alert('Error al eliminar: ' + err.message);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setCategoryId('');
    setBrandId('');
    setModelId('');
    setColor('');
    setCostPrice(0);
    setImageUrl('');
    setImageFile(null);
    setPreviewUrl(null);
    setPriceTiers([{ min_quantity: 1, price_per_unit: 0 }]);
  };

  return (
    <div className="space-y-8 pb-24">
      {/* Header Section */}
      <div className="bg-white p-8 md:p-10 rounded-[48px] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div className="flex items-center space-x-6">
            <div className="w-16 h-16 bg-blue-600 rounded-[24px] flex items-center justify-center text-white shadow-2xl shadow-blue-100">
                <Package className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Productos</h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Catálogo Global & Lista de Precios</p>
            </div>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="w-full md:w-auto flex items-center justify-center space-x-3 bg-slate-900 hover:bg-blue-600 text-white px-10 py-5 rounded-[24px] font-black shadow-2xl shadow-slate-200 transition-all active:scale-95 uppercase tracking-[0.2em] text-[10px]"
        >
          <Plus className="w-5 h-5" />
          <span>Nuevo Producto</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative group">
          <div className="absolute inset-y-0 left-8 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
              <Search className="w-5 h-5" />
          </div>
          <input 
            type="text"
            placeholder="Buscar por nombre, marca o color..."
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
            const count = products.filter(p => p.category_id === cat.id).length;
            if (count === 0) return null;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                className={cn(
                  "shrink-0 px-6 py-3 rounded-[20px] font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 border shadow-sm",
                  activeCategory === cat.id
                    ? "bg-blue-600 text-white border-blue-600 shadow-xl shadow-blue-100"
                    : "bg-white text-slate-500 border-slate-100 hover:border-blue-300"
                )}
              >
                {cat.name} ({count})
              </button>
            );
          })}
      </div>

      {/* Products by Category */}
      {(() => {
        const filtered = products.filter(p => {
          const matchSearch = searchTerm === '' || 
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.brands?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.color?.toLowerCase().includes(searchTerm.toLowerCase());
          const matchCategory = !activeCategory || p.category_id === activeCategory;
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
                  {searchTerm ? 'No se encontraron productos para esta búsqueda' : 'No hay productos registrados'}
                </p>
            </div>
          );
        }

        // Group by category
        const grouped: Record<string, Product[]> = {};
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

        return categoryOrder.map(catName => (
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
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Producto</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Costo</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Precios x Cantidad</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {grouped[catName].map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-all group">
                      <td className="px-8 py-5">
                        <div className="flex items-center space-x-5">
                          <div className="w-14 h-14 bg-slate-100 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center border border-slate-200 shadow-sm group-hover:scale-105 transition-transform">
                            {p.image_url ? (
                              <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-7 h-7 text-slate-300" />
                            )}
                          </div>
                          <div>
                            <div className="font-black text-slate-900 uppercase tracking-tight">{p.name}</div>
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              <span className="text-[9px] font-black bg-slate-50 text-slate-400 px-2 py-0.5 rounded-lg border border-slate-100 uppercase">{p.brands?.name || 'S/M'}</span>
                              {p.product_models?.name && <span className="text-[9px] font-bold text-slate-400 uppercase">[{p.product_models.name}]</span>}
                              {p.color && <span className="text-[9px] font-bold text-slate-300 uppercase">• {p.color}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className="font-black text-slate-900 text-sm tracking-tighter">{p.cost_price.toFixed(2)} BS</span>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex flex-wrap gap-2">
                          {p.price_tiers?.sort((a,b) => a.min_quantity - b.min_quantity).map((tier, idx) => (
                            <span key={idx} className="inline-flex items-center px-3 py-1.5 rounded-xl bg-slate-50 text-slate-700 text-[10px] font-black border border-slate-100 uppercase tracking-tighter">
                              {tier.min_quantity}+ un: <span className="text-blue-600 ml-1">{tier.price_per_unit.toFixed(2)} BS</span>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end space-x-3 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                          <button onClick={() => handleEdit(p)} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm active:scale-95">
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button onClick={() => handleDelete(p.id, p.name)} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-red-500 hover:border-red-200 transition-all shadow-sm active:scale-95">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
              {grouped[catName].map((p) => (
                <div key={p.id} className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm hover:shadow-xl active:bg-slate-50 transition-all">
                    <div className="flex items-start space-x-4 mb-5">
                        <div className="w-16 h-16 bg-slate-100 rounded-[20px] overflow-hidden shrink-0 flex items-center justify-center border border-slate-100 shadow-sm">
                          {p.image_url ? (
                            <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-7 h-7 text-slate-300" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-black text-slate-900 uppercase text-xs leading-tight mb-2 truncate">{p.name}</h3>
                            <div className="flex flex-wrap gap-1">
                                <span className="text-[8px] font-black bg-slate-50 text-slate-400 px-2 py-0.5 rounded-lg border border-slate-100 uppercase">{p.brands?.name || 'S/M'}</span>
                                {p.color && <span className="text-[8px] font-bold text-slate-300 uppercase">• {p.color}</span>}
                            </div>
                            <div className="mt-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Costo: <span className="text-slate-900">{p.cost_price.toFixed(2)} BS</span></div>
                        </div>
                    </div>

                    <div className="bg-slate-50/50 rounded-2xl p-3 mb-4">
                        <div className="grid grid-cols-2 gap-1.5">
                            {p.price_tiers?.sort((a,b) => a.min_quantity - b.min_quantity).map((tier, idx) => (
                                <div key={idx} className="bg-white px-3 py-2 rounded-xl border border-slate-100 flex justify-between items-center">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{tier.min_quantity}+</span>
                                    <span className="text-xs font-black text-blue-600 tracking-tighter">{tier.price_per_unit.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button 
                            onClick={() => handleEdit(p)}
                            className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center space-x-2 shadow-sm active:scale-95 transition-all"
                        >
                            <Edit2 className="w-4 h-4" />
                            <span>Editar</span>
                        </button>
                        <button 
                            onClick={() => handleDelete(p.id, p.name)}
                            className="flex-1 py-3 bg-white border border-slate-200 text-red-500 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center space-x-2 shadow-sm active:scale-95 transition-all"
                        >
                            <Trash2 className="w-4 h-4" />
                            <span>Borrar</span>
                        </button>
                    </div>
                </div>
              ))}
            </div>
          </div>
        ));
      })()}

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-900">
                {editingId ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 custom-scrollbar">
              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="sm:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre del Producto</label>
                  <input
                    required
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 font-bold placeholder:text-slate-300"
                    placeholder="Ej: Lana de Oveja Premium"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoría</label>
                    <button 
                        type="button"
                        onClick={() => setQuickAddType('category')}
                        className="text-[10px] font-black text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors"
                    >
                        + Respuesta Rápida
                    </button>
                  </div>
                  {quickAddType === 'category' ? (
                    <div className="flex space-x-2 animate-in slide-in-from-top-2">
                        <input 
                            autoFocus
                            className="flex-1 px-5 py-3 bg-white border-2 border-blue-200 rounded-2xl outline-none text-slate-900 font-bold" 
                            placeholder="Nombre de categoría..."
                            value={quickAddName}
                            onChange={e => setQuickAddName(e.target.value)}
                        />
                        <button type="button" onClick={handleQuickAdd} disabled={isQuickAdding} className="bg-blue-600 text-white px-5 rounded-2xl font-black shadow-lg shadow-blue-100 transition-all active:scale-95">✓</button>
                        <button type="button" onClick={() => setQuickAddType(null)} className="bg-slate-100 text-slate-500 px-5 rounded-2xl font-black transition-all active:scale-95">✕</button>
                    </div>
                  ) : (
                    <select
                        required
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 font-bold"
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                    >
                        <option value="">Seleccionar Categoría...</option>
                        {categoriesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Marca</label>
                    <button 
                        type="button"
                        onClick={() => setQuickAddType('brand')}
                        className="text-[10px] font-black text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors"
                    >
                        + Nueva
                    </button>
                  </div>
                  {quickAddType === 'brand' ? (
                    <div className="flex space-x-2 animate-in slide-in-from-top-2">
                        <input 
                            autoFocus
                            className="flex-1 px-4 py-3 bg-white border-2 border-blue-200 rounded-2xl outline-none text-sm text-slate-900 font-bold" 
                            placeholder="Marca..."
                            value={quickAddName}
                            onChange={e => setQuickAddName(e.target.value)}
                        />
                        <button type="button" onClick={handleQuickAdd} disabled={isQuickAdding} className="bg-blue-600 text-white px-4 rounded-xl font-bold shadow-lg shadow-blue-100 transition-all active:scale-95">✓</button>
                        <button type="button" onClick={() => setQuickAddType(null)} className="bg-slate-100 text-slate-500 px-4 rounded-xl font-bold transition-all active:scale-95">✕</button>
                    </div>
                  ) : (
                    <select
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 font-bold"
                        value={brandId}
                        onChange={(e) => { setBrandId(e.target.value); setModelId(''); }}
                    >
                        <option value="">Seleccionar Marca...</option>
                        {brandsList.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Modelo</label>
                    <button 
                        type="button"
                        disabled={!brandId}
                        onClick={() => setQuickAddType('model')}
                        className="text-[10px] font-black text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg disabled:opacity-30 transition-colors"
                    >
                        + Nuevo
                    </button>
                  </div>
                  {quickAddType === 'model' ? (
                    <div className="flex space-x-2 animate-in slide-in-from-top-2">
                        <input 
                            autoFocus
                            className="flex-1 px-4 py-3 bg-white border-2 border-blue-200 rounded-2xl outline-none text-sm text-slate-900 font-bold" 
                            placeholder="Modelo..."
                            value={quickAddName}
                            onChange={e => setQuickAddName(e.target.value)}
                        />
                        <button type="button" onClick={handleQuickAdd} disabled={isQuickAdding} className="bg-blue-600 text-white px-4 rounded-xl font-bold shadow-lg shadow-blue-100 transition-all active:scale-95">✓</button>
                        <button type="button" onClick={() => setQuickAddType(null)} className="bg-slate-100 text-slate-500 px-4 rounded-xl font-bold transition-all active:scale-95">✕</button>
                    </div>
                  ) : (
                    <select
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 font-bold disabled:opacity-50"
                        value={modelId}
                        disabled={!brandId}
                        onChange={(e) => setModelId(e.target.value)}
                    >
                        <option value="">Seleccionar Modelo...</option>
                        {modelsList.filter(m => m.brand_id === brandId).map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Color</label>
                  <input
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 font-bold"
                    placeholder="Ej: Rojo Carmesí"
                    value={color}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setColor(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Costo de Compra (BS)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 font-bold"
                    value={costPrice}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCostPrice(Number(e.target.value))}
                  />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Imagen del Producto</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all overflow-hidden group relative"
                  >
                    {previewUrl || imageUrl ? (
                        <>
                            <img src={previewUrl || imageUrl} alt="Preview" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="text-white font-black text-[10px] uppercase tracking-widest flex items-center bg-slate-900/60 px-6 py-3 rounded-2xl backdrop-blur-md">
                                    <Upload className="w-4 h-4 mr-2" /> Cambiar Imagen
                                </span>
                            </div>
                        </>
                    ) : (
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto text-slate-400 group-hover:text-blue-500 transition-colors">
                                <Upload className="w-8 h-8" />
                            </div>
                            <div className="text-sm font-bold text-slate-500">
                                <span className="text-blue-600">Haz clic</span> o arrastra una imagen
                            </div>
                            <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">PNG, JPG o WEBP (Máx 2MB)</div>
                        </div>
                    )}
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        accept="image/*" 
                        className="hidden" 
                    />
                  </div>
                </div>
              </div>

              {/* Price Tiers */}
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="font-black text-slate-900 uppercase tracking-tight flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                        <Tags className="w-5 h-5" />
                    </div>
                    <span>Precios de Venta Escalonados</span>
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddTier}
                    className="text-[10px] font-black text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-xl transition-all flex items-center space-x-2 uppercase tracking-widest border border-blue-100 shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Añadir Nivel</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {priceTiers.map((tier, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-slate-50/50 p-5 rounded-3xl border border-slate-100 shadow-sm animate-in slide-in-from-right-4 duration-300">
                      <div className="flex-1 w-full space-y-1">
                        <label className="text-[9px] uppercase font-black text-slate-400 tracking-widest ml-1">Desde Cantidad</label>
                        <input
                          type="number"
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-black"
                          value={tier.min_quantity}
                          onChange={(e) => handleTierChange(idx, 'min_quantity', Number(e.target.value))}
                        />
                      </div>
                      <div className="flex-1 w-full space-y-1">
                        <label className="text-[9px] uppercase font-black text-slate-400 tracking-widest ml-1">Precio Unitario (BS)</label>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-black"
                          value={tier.price_per_unit}
                          onChange={(e) => handleTierChange(idx, 'price_per_unit', Number(e.target.value))}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveTier(idx)}
                        disabled={priceTiers.length === 1}
                        className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl disabled:opacity-30 transition-all active:scale-95 self-end sm:self-center"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-8 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black uppercase text-xs tracking-widest rounded-[24px] transition-all active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-[2] py-5 bg-slate-900 hover:bg-blue-600 text-white font-black uppercase text-xs tracking-widest rounded-[24px] shadow-xl shadow-slate-200 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'Guardando...' : (editingId ? 'Actualizar Producto' : 'Crear Producto')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
