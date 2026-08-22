import type { FooterConfig, HeaderConfig, Menu, MenuLocation, MenuTarget } from '@hiccms/appearance-manager'
import { apiRequest } from './api'

interface Response<T> { success: boolean; data: T; message?: string }

export const appearanceApi = {
  menus: () => apiRequest<Response<Menu[]>>('/api/navigation'),
  createMenu: (body: { name: string; slug: string; location: MenuLocation }) => apiRequest<Response<{ id: string }>>('/api/navigation', { method: 'POST', body: JSON.stringify(body) }),
  deleteMenu: (id: string) => apiRequest(`/api/navigation/${id}`, { method: 'DELETE' }),
  addItem: (menuId: string, body: { label: string; url: string; target: MenuTarget; parentId?: string | null; sortOrder?: number }) => apiRequest<Response<{ id: string }>>(`/api/navigation/${menuId}/items`, { method: 'POST', body: JSON.stringify(body) }),
  updateItem: (id: string, body: Record<string, unknown>) => apiRequest(`/api/navigation/items/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteItem: (id: string) => apiRequest(`/api/navigation/items/${id}`, { method: 'DELETE' }),
  reorder: (menuId: string, items: { id: string }[]) => apiRequest(`/api/navigation/${menuId}/reorder`, { method: 'PUT', body: JSON.stringify({ items }) }),
  layout: () => apiRequest<Response<{ header: HeaderConfig; footer: FooterConfig }>>('/api/navigation/layout/sections'),
  updateHeader: (body: HeaderConfig) => apiRequest('/api/navigation/layout/header', { method: 'PUT', body: JSON.stringify(body) }),
  updateFooter: (body: FooterConfig) => apiRequest('/api/navigation/layout/footer', { method: 'PUT', body: JSON.stringify(body) }),
}
