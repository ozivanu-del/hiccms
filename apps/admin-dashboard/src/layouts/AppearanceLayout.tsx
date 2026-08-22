import { NavLink, Outlet } from 'react-router-dom'

const links = [['themes', 'Themes'], ['menus', 'Menus'], ['header', 'Header'], ['footer', 'Footer']]

export default function AppearanceLayout() {
  return <div className="space-y-6"><div><h1 className="text-2xl font-bold text-gray-900">Appearance</h1><p className="mt-1 text-gray-500">Kelola tema, navigasi, header, dan footer website.</p></div><nav className="flex gap-2 overflow-x-auto border-b border-gray-200 pb-3">{links.map(([path, label]) => <NavLink key={path} to={path} className={({ isActive }) => `whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium ${isActive ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{label}</NavLink>)}</nav><Outlet /></div>
}
