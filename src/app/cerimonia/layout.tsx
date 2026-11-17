import { GuardaAdmin } from '@/components/admin/GuardaAdmin';

// A cerimônia é do admin: troca de senha pendente bloqueia como no painel.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <GuardaAdmin>{children}</GuardaAdmin>;
}
