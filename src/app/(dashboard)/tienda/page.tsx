'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Product } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { ShoppingBag, Plus, Edit2, Trash2, X, Save, ShoppingCart, Package, Minus } from 'lucide-react'

const CATEGORIES = ['Pelotas', 'Paletas', 'Grips', 'Accesorios', 'Ropa', 'Otro']

interface ProductForm {
  name: string; category: string; price: number; stock: number; image_url: string; is_active: boolean
}
const defaultForm: ProductForm = { name: '', category: 'Pelotas', price: 0, stock: 0, image_url: '', is_active: true }

export default function TiendaPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [showModal, setShowModal] = useState(false)
  const [showSaleModal, setShowSaleModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<ProductForm>(defaultForm)
  const [saleProduct, setSaleProduct] = useState<Product | null>(null)
  const [saleQty, setSaleQty] = useState(1)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all')
  const supabase = createClient()

  const loadProducts = useCallback(async () => {
    const { data } = await supabase.from('products').select('*').order('category').order('name')
    setProducts(data || [])
  }, [])

  useEffect(() => { loadProducts() }, [loadProducts])

  function openCreate() { setEditingId(null); setForm(defaultForm); setShowModal(true) }
  function openEdit(p: Product) {
    setEditingId(p.id)
    setForm({ name: p.name, category: p.category, price: p.price, stock: p.stock, image_url: p.image_url || '', is_active: p.is_active })
    setShowModal(true)
  }

  async function handleSave() {
    setLoading(true)
    const data = { ...form, image_url: form.image_url || null }
    if (editingId) {
      await supabase.from('products').update(data).eq('id', editingId)
    } else {
      await supabase.from('products').insert(data)
    }
    setShowModal(false); setLoading(false); loadProducts()
  }

  async function handleDelete(id: number) {
    await supabase.from('products').delete().eq('id', id)
    setDeleteConfirm(null); loadProducts()
  }

  function openSale(p: Product) { setSaleProduct(p); setSaleQty(1); setShowSaleModal(true) }

  async function handleSale() {
    if (!saleProduct) return
    setLoading(true)
    const total = saleProduct.price * saleQty
    const today = new Date().toISOString().split('T')[0]

    await supabase.from('sales').insert({ product_id: saleProduct.id, quantity: saleQty, unit_price: saleProduct.price, total })
    await supabase.from('products').update({ stock: saleProduct.stock - saleQty }).eq('id', saleProduct.id)
    await supabase.from('cash_register').insert({ date: today, type: 'sale', concept: `Venta: ${saleQty}x ${saleProduct.name}`, amount: total })

    setShowSaleModal(false); setLoading(false); loadProducts()
  }

  const filtered = filter === 'all' ? products : products.filter(p => p.category === filter)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <ShoppingBag className="text-purple-400" size={32} /> Nueva Marina Shop
        </h1>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-6 py-3 bg-purple-500 hover:bg-purple-400 text-white font-bold rounded-xl text-lg transition-all shadow-lg shadow-purple-500/20">
          <Plus size={22} /> Nuevo Producto
        </button>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${filter === 'all' ? 'bg-purple-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
          Todos ({products.length})
        </button>
        {CATEGORIES.map(cat => {
          const count = products.filter(p => p.category === cat).length
          return count > 0 ? (
            <button key={cat} onClick={() => setFilter(cat)} className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${filter === cat ? 'bg-purple-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
              {cat} ({count})
            </button>
          ) : null
        })}
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((product) => (
          <div key={product.id} className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden hover:border-purple-500/50 transition-all">
            <div className="h-32 bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
              <Package size={48} className="text-purple-400/50" />
            </div>
            <div className="p-4 space-y-3">
              <div>
                <span className="text-xs text-purple-400 font-medium">{product.category}</span>
                <h3 className="text-white font-bold text-lg">{product.name}</h3>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-lime-400 font-bold text-xl">{formatCurrency(product.price)}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${product.stock > 5 ? 'bg-green-500/20 text-green-400' : product.stock > 0 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                  Stock: {product.stock}
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openSale(product)} disabled={product.stock <= 0}
                  className="flex-1 py-2.5 bg-green-500 hover:bg-green-400 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                  <ShoppingCart size={16} /> Vender
                </button>
                <button onClick={() => openEdit(product)} className="p-2.5 bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 rounded-xl transition-all"><Edit2 size={16} /></button>
                {deleteConfirm === product.id ? (
                  <div className="flex gap-1">
                    <button onClick={() => handleDelete(product.id)} className="px-3 py-1 bg-red-500 text-white rounded-xl text-sm">Sí</button>
                    <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1 bg-gray-600 text-white rounded-xl text-sm">No</button>
                  </div>
                ) : (
                  <button onClick={() => setDeleteConfirm(product.id)} className="p-2.5 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-xl transition-all"><Trash2 size={16} /></button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Product Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md border border-gray-700 shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">{editingId ? 'Editar Producto' : 'Nuevo Producto'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nombre *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white text-lg focus:ring-2 focus:ring-purple-400" placeholder="Nombre del producto" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Categoría</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-purple-400">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Precio (€)</label>
                  <input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-purple-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Stock</label>
                  <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-purple-400" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-700">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-xl font-medium">Cancelar</button>
              <button onClick={handleSave} disabled={loading || !form.name}
                className="flex-1 py-3 bg-purple-500 hover:bg-purple-400 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                <Save size={18} />{loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sale Modal */}
      {showSaleModal && saleProduct && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-sm border border-gray-700 shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">Registrar Venta</h2>
              <button onClick={() => setShowSaleModal(false)} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-center">
                <p className="text-white font-bold text-lg">{saleProduct.name}</p>
                <p className="text-lime-400 font-bold text-2xl mt-1">{formatCurrency(saleProduct.price)} c/u</p>
              </div>
              <div className="flex items-center justify-center gap-4">
                <button onClick={() => setSaleQty(Math.max(1, saleQty - 1))} className="p-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl"><Minus size={20} /></button>
                <span className="text-white text-3xl font-bold w-16 text-center">{saleQty}</span>
                <button onClick={() => setSaleQty(Math.min(saleProduct.stock, saleQty + 1))} className="p-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl"><Plus size={20} /></button>
              </div>
              <div className="text-center bg-gray-700/50 rounded-xl p-4">
                <p className="text-gray-400 text-sm">Total</p>
                <p className="text-lime-400 font-bold text-3xl">{formatCurrency(saleProduct.price * saleQty)}</p>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-700">
              <button onClick={() => setShowSaleModal(false)} className="flex-1 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-xl font-medium">Cancelar</button>
              <button onClick={handleSale} disabled={loading}
                className="flex-1 py-3 bg-green-500 hover:bg-green-400 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                <ShoppingCart size={18} />{loading ? 'Registrando...' : 'Confirmar Venta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
