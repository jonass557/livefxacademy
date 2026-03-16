import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Briefcase, 
  TrendingUp, 
  GraduationCap, 
  Link as LinkIcon, 
  MessageSquare, 
  ClipboardList, 
  Palmtree,
  Video,
  LogOut,
  ChevronLeft,
  ChevronRight,
  User,
  Menu,
  X
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useLanguageStore } from '../store/languageStore';

const ClientSidebar = ({ activeSection, setActiveSection, collapsed, setCollapsed, mobileOpen, setMobileOpen }) => {
  const { logout } = useAuthStore();
  const { t } = useLanguageStore();
  const navigate = useNavigate();

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: t('sidebar.dashboard') },
    { id: 'announcements', icon: Video, label: t('sidebar.announcements') },
    { id: 'services', icon: Briefcase, label: t('sidebar.services') },
    { id: 'trading', icon: TrendingUp, label: t('sidebar.tradingInfo') },
    { id: 'academy', icon: GraduationCap, label: t('sidebar.academy') },
    { id: 'broker', icon: LinkIcon, label: t('sidebar.broker') },
    { id: 'contact', icon: MessageSquare, label: t('sidebar.contact') },
    { id: 'consultation', icon: ClipboardList, label: t('sidebar.consultationForm') },
    { id: 'vacation', icon: Palmtree, label: t('sidebar.vacationProgram') },
  ];

  const handleMenuClick = (id) => {
    setActiveSection(id);
    if (setMobileOpen) setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      
      {/* Mobile Toggle Button */}
      <button
        className="fixed bottom-4 right-4 z-50 lg:hidden bg-primary text-primary-foreground p-3 rounded-full shadow-lg"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      <aside 
        className={`fixed left-0 top-16 h-[calc(100vh-4rem)] bg-card border-r transition-all duration-300 z-40
          ${collapsed ? 'w-16' : 'w-64'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className={`p-4 border-b ${collapsed ? 'flex justify-center' : ''}`}>
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <span className="font-semibold text-sm">Espace Élève</span>
            </div>
          )}
          {collapsed && (
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
          )}
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => handleMenuClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  isActive 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                } ${collapsed ? 'justify-center' : ''}`}
                title={collapsed ? item.label : ''}
              >
                <Icon className={`h-5 w-5 flex-shrink-0`} />
                {!collapsed && (
                  <span className="font-medium text-sm">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="p-2 border-t space-y-1">
          {/* Collapse Toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <>
                <ChevronLeft className="h-5 w-5" />
                <span className="font-medium text-sm">Réduire</span>
              </>
            )}
          </button>

          {/* Logout */}
          <button
            onClick={logout}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-destructive/10 text-destructive transition-all ${
              collapsed ? 'justify-center' : ''
            }`}
            title={collapsed ? t('sidebar.logout') : ''}
          >
            <LogOut className="h-5 w-5" />
            {!collapsed && (
              <span className="font-medium text-sm">{t('sidebar.logout')}</span>
            )}
          </button>
        </div>
      </div>
      </aside>
    </>
  );
};

export default ClientSidebar;
