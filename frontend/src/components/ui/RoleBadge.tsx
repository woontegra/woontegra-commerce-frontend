import type { UserRole } from '../../types/auth';

interface RoleBadgeProps {
  role: UserRole;
}

export default function RoleBadge({ role }: RoleBadgeProps) {
  const styles = {
    admin: {
      bg: 'bg-purple-100 dark:bg-purple-900/20',
      text: 'text-purple-700 dark:text-purple-400',
      label: 'Admin',
    },
    user: {
      bg: 'bg-blue-100 dark:bg-blue-900/20',
      text: 'text-blue-700 dark:text-blue-400',
      label: 'Kullanıcı',
    },
  } as const;

  const roleStyleKey: keyof typeof styles = role === 'USER' ? 'user' : 'admin';
  const style = styles[roleStyleKey];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}
