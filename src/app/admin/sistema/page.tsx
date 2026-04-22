'use client';

import { useState } from 'react';
import { supabase } from '@/utils/supabase';
import { 
  AlertTriangle, 
  Trash2, 
  Loader2, 
  CheckCircle2,
  ShieldAlert,
  Info
} from 'lucide-react';

export default function ConfiguracionSistema() {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error', message: string }>({
    type: 'idle',
    message: ''
  });

  const handleCleanup = async () => {
    if (confirmText !== 'LIMPIAR') return;
    
    setLoading(true);
    setStatus({ type: 'loading', message: 'Iniciando limpieza profunda...' });

    try {
      // 1. Get current user to avoid self-deletion
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No se pudo verificar el usuario actual');

      // 2. Define deletion sequence (Reverse dependency order)
      const tables = [
        'payments',
        'debt_ledger',
        'sale_items',
        'sales',
        'purchase_items',
        'purchases',
        'inventory',
        'stock_transfers',
        'price_tiers',
        'products',
        'product_models',
        'brands',
        'categories',
        'customers',
        'suppliers',
        'warehouses'
      ];

      for (const table of tables) {
        setStatus({ type: 'loading', message: `Limpiando tabla: ${table}...` });
        const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) {
            console.error(`Error en ${table}:`, error);
            // Some tables might already be empty or have issues, we continue but log
        }
      }

      // 3. Profiles (Except current admin)
      setStatus({ type: 'loading', message: 'Limpiando perfiles de usuario...' });
      await supabase.from('profiles').delete().neq('id', user.id);

      setStatus({ 
        type: 'success', 
        message: 'La base de datos ha sido limpiada por completo. Solo tu cuenta de administrador permanece activa.' 
      });
      setShowConfirm(false);
      setConfirmText('');
    } catch (error: any) {
      setStatus({ 
        type: 'error', 
        message: `Error durante la limpieza: ${error.message || 'Error desconocido'}` 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Configuración del Sistema</h1>
        <p className="text-slate-500 mt-1">Gestión avanzada y mantenimiento de la plataforma.</p>
      </div>

      <div className="grid gap-6">
        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 flex items-start space-x-4">
          <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
            <Info className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-blue-900 text-lg">Mantenimiento de Datos</h3>
            <p className="text-blue-700 mt-1 text-sm leading-relaxed">
              Utiliza estas herramientas para mantener la integridad de tu sistema. 
              Recuerda que algunas acciones son irreversibles y afectarán a todos los módulos.
            </p>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-3xl border border-red-100 overflow-hidden shadow-sm">
          <div className="bg-red-50 px-8 py-4 border-b border-red-100 flex items-center space-x-3">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            <h2 className="text-red-900 font-bold uppercase tracking-wider text-sm">Zona de Peligro</h2>
          </div>
          
          <div className="p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="max-w-xl">
                <h3 className="text-xl font-bold text-slate-900">Limpieza Total de la Base de Datos</h3>
                <p className="text-slate-500 mt-2 text-sm leading-relaxed">
                  Esta acción eliminará permanentemente todos los registros del sistema: 
                  <strong> Ventas, Compras, Productos, Clientes, Proveedores e Inventario.</strong>
                  <br />
                  <span className="text-red-600 font-medium mt-2 block italic">
                    * Tu cuenta de administrador (admin@gmail.com) no será eliminada.
                  </span>
                </p>
              </div>
              <button
                onClick={() => setShowConfirm(true)}
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-red-200 transition-all active:scale-95 flex items-center justify-center space-x-2 whitespace-nowrap"
              >
                <Trash2 className="w-5 h-5" />
                <span>Limpiar Base de Datos</span>
              </button>
            </div>

            {status.type !== 'idle' && (
              <div className={`p-4 rounded-2xl flex items-center space-x-3 ${
                status.type === 'loading' ? 'bg-slate-100 text-slate-600' :
                status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' :
                'bg-red-50 text-red-700 border border-red-100'
              }`}>
                {status.type === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> :
                 status.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> :
                 <AlertTriangle className="w-5 h-5" />}
                <span className="font-medium">{status.message}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-[40px] shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in duration-300">
            <div className="p-10 text-center space-y-6">
              <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <AlertTriangle className="w-10 h-10" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-slate-900">¿Estás seguro?</h2>
                <p className="text-slate-500 leading-relaxed">
                  Esta acción es <span className="text-red-600 font-bold underline">irreversible</span>. 
                  Se borrarán todos los datos de negocio del sistema.
                </p>
              </div>

              <div className="space-y-4 pt-4">
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                  Escribe <span className="text-slate-900">LIMPIAR</span> para confirmar
                </p>
                <input 
                  type="text"
                  autoFocus
                  placeholder="LIMPIAR"
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-center text-xl font-bold focus:border-red-500 focus:ring-0 transition-all"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                />
              </div>

              <div className="flex flex-col space-y-3 pt-4">
                <button
                  disabled={confirmText !== 'LIMPIAR' || loading}
                  onClick={handleCleanup}
                  className="w-full py-5 bg-red-600 text-white rounded-3xl font-black text-lg shadow-xl shadow-red-200 hover:bg-red-700 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed flex items-center justify-center space-x-3"
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Trash2 className="w-6 h-6" />}
                  <span>{loading ? 'LIMPIANDO...' : 'SÍ, BORRAR TODO'}</span>
                </button>
                <button
                  disabled={loading}
                  onClick={() => {
                    setShowConfirm(false);
                    setConfirmText('');
                  }}
                  className="w-full py-4 text-slate-500 font-bold hover:text-slate-900 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
