'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { createClient } from '@supabase/supabase-js';
import { 
  Users, 
  Shield, 
  User, 
  Search, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  Edit2,
  Trash2,
  Key,
  X,
  Mail,
  Lock,
  UserPlus
} from 'lucide-react';

interface Profile {
  id: string;
  full_name: string;
  role: 'admin' | 'seller';
  created_at: string;
}

import { adminUpdateUserPassword, adminDeleteUser, adminCreateUser } from './actions';

export default function UsuariosPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    email: '',
    password: '',
    full_name: '',
    role: 'seller' as 'admin' | 'seller'
  });

  // Password Change State
  const [showPassModal, setShowPassModal] = useState(false);
  const [passData, setPassData] = useState({ id: '', name: '', newPassword: '' });

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentAdminId(user?.id || null);

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name', { ascending: true });

    if (error) console.error(error);
    else setProfiles(data || []);
    setLoading(false);
  };

  const handleOpenModal = (profile?: Profile) => {
    if (profile) {
      setIsEditing(true);
      setFormData({
        id: profile.id,
        email: '', 
        password: '',
        full_name: profile.full_name,
        role: profile.role
      });
    } else {
      setIsEditing(false);
      setFormData({
        id: '',
        email: '',
        password: '',
        full_name: '',
        role: 'seller'
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (isEditing) {
        const { error } = await supabase
          .from('profiles')
          .update({ 
            full_name: formData.full_name,
            role: formData.role
          })
          .eq('id', formData.id);

        if (error) throw error;
      } else {
        const result = await adminCreateUser(
            formData.email,
            formData.password,
            formData.full_name,
            formData.role
        );

        if (!result.success) throw new Error(result.error);
      }

      setShowModal(false);
      fetchProfiles();
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (profileId: string) => {
    if (profileId === currentAdminId) return alert('No puedes eliminarte a ti mismo.');
    if (!confirm('¿Estás seguro de eliminar este usuario? Se borrará su cuenta permanentemente.')) return;

    setLoading(true);
    const result = await adminDeleteUser(profileId);
    
    if (!result.success) alert('Error: ' + result.error);
    else fetchProfiles();
    setLoading(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passData.newPassword.length < 6) return alert('La contraseña debe tener al menos 6 caracteres.');
    
    setSubmitting(true);
    const result = await adminUpdateUserPassword(passData.id, passData.newPassword);
    
    if (result.success) {
        alert('Contraseña actualizada con éxito.');
        setShowPassModal(false);
        setPassData({ id: '', name: '', newPassword: '' });
    } else {
        alert('Error: ' + result.error);
    }
    setSubmitting(false);
  };

  const filteredProfiles = profiles.filter(p => 
    p.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-10 pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Gestión de Equipo</h1>
          <p className="text-slate-500 mt-1 font-medium italic">Administra el acceso y roles de tus colaboradores.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-[20px] font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-100 transition-all active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          <span>Nuevo Usuario</span>
        </button>
      </div>

      {/* Search & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
        <div className="md:col-span-3 bg-white p-3 rounded-2xl border border-slate-200 flex items-center space-x-3 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all shadow-sm">
            <Search className="w-5 h-5 text-slate-300" />
            <input 
                type="text" 
                placeholder="Busca por nombre..." 
                className="flex-1 outline-none text-slate-900 font-bold placeholder:text-slate-300 text-sm" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between shadow-xl">
            <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-blue-400" />
                <span className="text-xs font-black uppercase tracking-widest">Total</span>
            </div>
            <span className="text-2xl font-black">{profiles.length}</span>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] uppercase font-black text-slate-400 tracking-widest border-b border-slate-100">
                <th className="px-8 py-5">Colaborador</th>
                <th className="px-8 py-5">Rol & Permisos</th>
                <th className="px-8 py-5 hidden sm:table-cell">Antigüedad</th>
                <th className="px-8 py-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [1,2,3].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={4} className="px-8 py-6"><div className="h-6 bg-slate-100 rounded-full w-full"></div></td>
                  </tr>
                ))
              ) : filteredProfiles.length > 0 ? (
                filteredProfiles.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-8 py-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                          <User className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-lg leading-none mb-1">{p.full_name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">ID: {p.id.slice(0,8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className={`inline-flex items-center px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                        p.role === 'admin' 
                          ? 'bg-purple-50 text-purple-600 border border-purple-100' 
                          : 'bg-blue-50 text-blue-600 border border-blue-100'
                      }`}>
                        {p.role === 'admin' ? <Shield className="w-3 h-3 mr-2" /> : <User className="w-3 h-3 mr-2" />}
                        {p.role === 'admin' ? 'Administrador' : 'Vendedor'}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-slate-400 text-xs font-bold hidden sm:table-cell">
                      {new Date(p.created_at).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => {
                              setPassData({ id: p.id, name: p.full_name, newPassword: '' });
                              setShowPassModal(true);
                          }}
                          className="p-3 text-amber-500 hover:bg-amber-50 rounded-xl transition-all"
                          title="Cambiar Contraseña"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenModal(p)}
                          className="p-3 text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          disabled={p.id === currentAdminId}
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                    <td colSpan={4} className="px-8 py-20 text-center text-slate-300">
                        <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p className="font-black uppercase tracking-[0.2em] text-xs">No se encontraron usuarios</p>
                    </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Helper Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[32px] p-8 text-white flex items-center justify-between shadow-2xl shadow-blue-200">
        <div className="flex items-center space-x-6">
            <div className="p-4 bg-white/10 rounded-2xl">
                <AlertCircle className="w-8 h-8" />
            </div>
            <div>
                <h4 className="text-xl font-black uppercase tracking-tight">Panel de Administración Total</h4>
                <p className="text-blue-100 text-sm mt-1 max-w-md opacity-80">
                    Ahora puedes gestionar contraseñas y eliminar cuentas permanentemente de forma directa. Ten precaución con las eliminaciones, ya que son irreversibles.
                </p>
            </div>
        </div>
      </div>

      {/* User Modal (Create/Edit Profile) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase">{isEditing ? 'Editar Usuario' : 'Nuevo Integrante'}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Configuración de cuenta</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white rounded-xl transition-all">
                    <X className="w-5 h-5 text-slate-400" />
                </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
                {!isEditing && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 flex items-center"><Mail className="w-3 h-3 mr-2" /> Correo Electrónico</label>
                            <input 
                                type="email" 
                                required
                                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 outline-none focus:border-blue-500 transition-all"
                                value={formData.email}
                                onChange={e => setFormData({...formData, email: e.target.value})}
                                placeholder="empleado@lanas.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 flex items-center"><Lock className="w-3 h-3 mr-2" /> Contraseña Inicial</label>
                            <input 
                                type="password" 
                                required
                                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 outline-none focus:border-blue-500 transition-all"
                                value={formData.password}
                                onChange={e => setFormData({...formData, password: e.target.value})}
                                placeholder="Min. 6 caracteres"
                            />
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 flex items-center"><User className="w-3 h-3 mr-2" /> Nombre Completo</label>
                    <input 
                        type="text" 
                        required
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 outline-none focus:border-blue-500 transition-all uppercase"
                        value={formData.full_name}
                        onChange={e => setFormData({...formData, full_name: e.target.value})}
                        placeholder="Juan Perez"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 flex items-center"><Shield className="w-3 h-3 mr-2" /> Rol en el Sistema</label>
                    <select 
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
                        value={formData.role}
                        onChange={e => setFormData({...formData, role: e.target.value as any})}
                    >
                        <option value="seller">VENDEDOR (Acceso limitado)</option>
                        <option value="admin">ADMINISTRADOR (Acceso total)</option>
                    </select>
                </div>

                <button 
                    disabled={submitting}
                    type="submit"
                    className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-[20px] uppercase text-xs tracking-[0.2em] shadow-xl shadow-blue-100 transition-all active:scale-95 disabled:opacity-50"
                >
                    {submitting ? 'Procesando...' : isEditing ? 'Guardar Cambios' : 'Crear Acceso'}
                </button>
            </form>
          </div>
        </div>
      )}

      {/* Direct Password Change Modal */}
      {showPassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-amber-50 border-b border-amber-100 flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-black text-amber-900 uppercase">Cambiar Contraseña</h3>
                    <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mt-0.5">Usuario: {passData.name}</p>
                </div>
                <button onClick={() => setShowPassModal(false)} className="p-2 hover:bg-white rounded-xl transition-all">
                    <X className="w-5 h-5 text-amber-400" />
                </button>
            </div>
            
            <form onSubmit={handleChangePassword} className="p-8 space-y-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 flex items-center"><Lock className="w-3 h-3 mr-2" /> Nueva Contraseña</label>
                    <input 
                        type="password" 
                        required
                        autoFocus
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 outline-none focus:border-amber-500 transition-all"
                        value={passData.newPassword}
                        onChange={e => setPassData({...passData, newPassword: e.target.value})}
                        placeholder="Mínimo 6 caracteres"
                    />
                </div>

                <button 
                    disabled={submitting}
                    type="submit"
                    className="w-full py-5 bg-slate-900 hover:bg-black text-white font-black rounded-[20px] uppercase text-xs tracking-[0.2em] shadow-xl shadow-slate-200 transition-all active:scale-95 disabled:opacity-50"
                >
                    {submitting ? 'Cambiando...' : 'Actualizar Contraseña'}
                </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
