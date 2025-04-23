import { Sidebar } from '../components/ui/navigation/Sidebar';
import { UserProfile } from '../components/ui/navigation/UserProfile';

// Use the existing template structure, with Warp-specific navigation items
const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: 'HomeIcon' },
  { name: 'Tasks', href: '/task-list', icon: 'ClipboardListIcon' },
  { name: 'Agents', href: '/agents', icon: 'UserGroupIcon' },
  { name: 'Settings', href: '/settings', icon: 'CogIcon' },
];


export function MainLayout({ children }) {
  // Keep the template's layout structure intact
  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-gray-900">
      <Sidebar navItems={navItems} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <UserProfile />
          <main className="flex-1 overflow-y-auto p-4">
          {children}

        </main>
      </div>
    </div>
  );
}