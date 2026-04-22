'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  BarChart3, 
  Warehouse, 
  Package, 
  ShoppingCart, 
  Users, 
  Truck, 
  ArrowLeftRight,
  LogOut,
  ChevronRight,
  Shield,
  User as UserIcon,
  Tags,
  ShoppingBag,
  History as HistoryIcon
} from 'lucide-react';
import { supabase } from '@/utils/supabase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const menuItems = [
  { icon: BarChart3, label: 'Resumen', href: '/admin', adminOnly: false },
  { icon: ShoppingCart, label: 'Vender Ahora', href: '/admin/ventas/nueva', adminOnly: false },
  { icon: ShoppingBag, label: 'Pedidos', href: '/admin/pedidos', adminOnly: false },
  { icon: HistoryIcon, label: 'Historial de Ventas', href: '/admin/ventas', adminOnly: false },
  { icon: Users, label: 'Clientes', href: '/admin/clientes', adminOnly: false },
  { icon: ArrowLeftRight, label: 'Inventario', href: '/admin/inventario', adminOnly: false },
  { icon: Package, label: 'Productos', href: '/admin/productos', adminOnly: true },
  { icon: ShoppingBag, label: 'Compras', href: '/admin/compras', adminOnly: true },
  { icon: Truck, label: 'Proveedores', href: '/admin/proveedores', adminOnly: true },
  { icon: Tags, label: 'Configuración de Catálogo', href: '/admin/configuracion', adminOnly: true },
  { icon: Warehouse, label: 'Depósitos', href: '/admin/depositos', adminOnly: true },
  { icon: UserIcon, label: 'Usuarios', href: '/admin/usuarios', adminOnly: true },
  { icon: Shield, label: 'Configuración Sistema', href: '/admin/sistema', adminOnly: true },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProfile();
  }, []);

  const getProfile = async () => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        
        if (user) {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          
          if (error && error.code === 'PGRST116') {
            setProfile({ full_name: user.email?.split('@')[0], role: 'seller' });
          } else {
            setProfile(data);
          }
        }
    } catch (err) {
        console.warn('Auth lock issue, retrying...', err);
    } finally {
        setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const filteredItems = menuItems.filter(item => {
    if (!profile) return !item.adminOnly;
    if (profile.role === 'admin') return true;
    return !item.adminOnly;
  });

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <aside className={cn(
        "fixed left-0 top-0 h-screen w-72 bg-white border-r border-slate-200 flex flex-col z-50 transition-transform duration-300 ease-in-out lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 border-b border-slate-100 mb-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
              L
            </div>
            <span className="font-bold text-xl text-slate-900 tracking-tight">Lanas Admin</span>
          </div>
          {/* Close button for mobile */}
          <button 
            onClick={onClose}
            className="lg:hidden p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {loading ? (
             <div className="space-y-4 px-4 py-8">
               {[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-slate-100 animate-pulse rounded-lg"></div>)}
             </div>
          ) : filteredItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (window.innerWidth < 1024) onClose?.();
                }}
                className={cn(
                  "group flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200",
                  isActive 
                    ? "bg-blue-50 text-blue-600 shadow-sm" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <div className="flex items-center space-x-3">
                  <item.icon className={cn("w-5 h-5", isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
                  <span className="font-semibold text-sm">{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-4 h-4" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 space-y-4">
          {profile && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-200 text-slate-400 shadow-sm">
                        {profile.role === 'admin' ? <Shield className="w-6 h-6 text-purple-600" /> : <UserIcon className="w-6 h-6 text-blue-600" />}
                    </div>
                    <div className="overflow-hidden">
                        <p className="font-bold text-sm text-slate-900 truncate">{profile.full_name}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {profile.role === 'admin' ? 'Administrador' : 'Vendedor'}
                        </p>
                    </div>
                </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100">
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all group"
            >
              <LogOut className="w-5 h-5 group-hover:text-red-600" />
              <span className="font-semibold text-sm">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
