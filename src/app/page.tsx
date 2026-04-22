import Link from 'next/link';
import { Package, ShoppingBag, Users, Warehouse } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-4xl w-full text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight">
            Sistema de Gestión <span className="text-blue-600">Lanas Mayorista</span>
          </h1>
          <p className="text-xl text-slate-600">
            Control de inventario multi-depósito, ventas escalonadas y gestión de créditos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
          <Link 
            href="/admin"
            className="group p-8 bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-blue-500 transition-all duration-300 flex flex-col items-center text-center space-y-4"
          >
            <div className="p-4 bg-blue-50 rounded-full group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Warehouse className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Administración</h2>
            <p className="text-slate-500">
              Gestiona depósitos, productos, vendedores y reportes de ventas.
            </p>
          </Link>

          <Link 
            href="/catalogo"
            className="group p-8 bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-green-500 transition-all duration-300 flex flex-col items-center text-center space-y-4"
          >
            <div className="p-4 bg-green-50 rounded-full group-hover:bg-green-600 group-hover:text-white transition-colors">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Catálogo Público</h2>
            <p className="text-slate-500">
              Link para clientes: Visualiza productos y realiza pedidos rápidos.
            </p>
          </Link>
        </div>

        <div className="pt-12 text-slate-400 text-sm">
          © 2026 Sistema Inventario Lanas - Conectado a Supabase
        </div>
      </div>
    </main>
  );
}
