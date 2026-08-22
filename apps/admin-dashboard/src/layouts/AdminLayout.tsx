import { Outlet, Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, File, FileText, Settings as SettingsIcon, LogOut, Image as ImageIcon, PanelsTopLeft, BookOpen, ShieldCheck, Puzzle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { API_URL } from '../lib/api';

export default function AdminLayout() {
  const navigate = useNavigate();
  const [siteName, setSiteName] = useState('HICCMS Admin');
  const [themeColor, setThemeColor] = useState('#2563eb');

  useEffect(() => {
    fetch(`${API_URL}/api/settings`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          if (data.data.site_name) setSiteName(data.data.site_name);
          if (data.data.theme_color) setThemeColor(data.data.theme_color);
        }
      })
      .catch(err => console.error(err));
  }, []);

  const handleLogout = async () => {
    // Clear client-side token cookie
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    // Call the logout endpoint
    await fetch(`${API_URL}/api/auth/logout`, { method: 'POST' });
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <span className="text-xl font-bold truncate" style={{ color: themeColor }}>
            {siteName}
          </span>
        </div>
        <nav className="p-4 space-y-1">
          <Link to="/" className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <LayoutDashboard className="w-5 h-5 mr-3" />
            Dashboard
          </Link>
          <Link to="/posts" className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <FileText className="w-5 h-5 mr-3" />
            Artikel
          </Link>
          <Link to="/pages" className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <File className="w-5 h-5 mr-3" />
            Halaman
          </Link>
          <Link to="/media" className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <ImageIcon className="w-5 h-5 mr-3" />
            Media
          </Link>
          <Link to="/appearance" className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <PanelsTopLeft className="w-5 h-5 mr-3" />
            Appearance
          </Link>
          <Link to="/settings" className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <SettingsIcon className="w-5 h-5 mr-3" />
            Pengaturan
          </Link>
          <Link to="/plugins" className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <Puzzle className="w-5 h-5 mr-3" />
            Plugin Manager
          </Link>
          <Link to="/help" className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <BookOpen className="w-5 h-5 mr-3" />
            Panduan
          </Link>
          <Link to="/account/security" className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <ShieldCheck className="w-5 h-5 mr-3" />
            Keamanan Akun
          </Link>
        </nav>
        <div className="absolute bottom-0 w-64 p-4 border-t border-gray-200">
          <button 
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-2 text-gray-700 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-end px-8">
          <div className="flex items-center space-x-3">
            <div 
              className="w-8 h-8 rounded-full text-white flex items-center justify-center font-bold"
              style={{ backgroundColor: themeColor }}
            >
              A
            </div>
            <span className="text-sm font-medium text-gray-700">Admin</span>
          </div>
        </header>
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
