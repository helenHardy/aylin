'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Admin client with Service Role (Bypasses RLS)
const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function adminUpdateUserPassword(userId: string, newPassword: string) {
  try {
    const { data, error } = await adminSupabase.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (error) {
        console.error('Error updating password:', error);
        return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function adminDeleteUser(userId: string) {
  try {
    // 1. Delete the profile (Cascades are usually handled in DB)
    // In our schema, profile is linked to auth.users with CASCADE on DELETE.
    // So deleting the auth user will delete the profile.
    
    const { error } = await adminSupabase.auth.admin.deleteUser(userId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath('/admin/usuarios');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function adminCreateUser(email: string, password: string, fullName: string, role: string) {
  try {
    const { data, error } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    });

    if (error) return { success: false, error: error.message };

    if (data.user && role !== 'seller') {
        await adminSupabase
            .from('profiles')
            .update({ role })
            .eq('id', data.user.id);
    }

    revalidatePath('/admin/usuarios');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
