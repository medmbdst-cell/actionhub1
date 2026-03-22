import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

/**
 * Page de redirection intelligente vers le dashboard approprié selon le rôle
 * - super_admin → /super-admin
 * - admin → /admin
 * - responsable → /responsable
 * - collaborateur → /collaborateur
 */
export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user profile to determine role
  const { data: profile } = (await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()) as { data: { role: string } | null };

  const userRole = profile?.role;

  // Redirect to appropriate dashboard based on role
  switch (userRole) {
    case 'super_admin':
      redirect('/super-admin');
    case 'admin':
      redirect('/admin');
    case 'responsable':
      redirect('/responsable');
    case 'collaborateur':
      redirect('/collaborateur');
    default:
      redirect('/login');
  }
}
