import { SidebarContent } from './sidebar-content';

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden lg:flex w-64 flex-col border-r border-border">
      <SidebarContent />
    </aside>
  );
}
