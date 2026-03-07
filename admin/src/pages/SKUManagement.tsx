// admin/src/pages/SKUManagement.tsx
import { useState, useEffect, useRef } from "react";
import {
  collection, query, orderBy, limit, startAfter, getDocs,
  doc, setDoc, updateDoc, deleteDoc, serverTimestamp, where, writeBatch, QueryDocumentSnapshot
} from "firebase/firestore";
import { friendlyError } from "../lib/errors";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../lib/firebase";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Papa from "papaparse";
import toast from "react-hot-toast";
import { Product } from "../../shared/types";
import { COLLECTIONS } from "../../shared/config";
import { GROCERY_CATEGORIES, CATEGORY_LIST } from "../../shared/categories";
import { cleanFirestoreData } from "../lib/utils";
import { Plus, Upload, Edit, Trash2, Search, X, Package } from "lucide-react";

const PAGE_SIZE = 20;

const productSchema = z.object({
  name: z.string().min(2),
  category: z.string().min(1),
  subcategory: z.string().optional(),
  price: z.coerce.number().positive(),
  mrp: z.coerce.number().positive(),
  unit: z.string().min(1),
  description: z.string().optional(),
  brand: z.string().optional(),
  gstRate: z.coerce.number(),
  barcode: z.string().optional(),
  tags: z.string().optional(), // comma-separated
  weight: z.coerce.number().optional(),
});
type ProductForm = z.infer<typeof productSchema>;

export default function SKUManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
  });
  // Drive category/subcategory dropdowns from RHF — single source of truth
  const selectedCategory = watch("category", "");

  // ── Load products ──────────────────────────────────────────────────────────
  const loadProducts = async (reset = false) => {
    setLoading(true);
    try {
      let q = query(
        collection(db, COLLECTIONS.PRODUCTS),
        orderBy("createdAt", "desc"),
        limit(PAGE_SIZE)
      );
      if (!reset && lastDoc) q = query(q, startAfter(lastDoc));

      const snap = await getDocs(q);
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));

      setProducts(prev => reset ? docs : [...prev, ...docs]);
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (err: any) {
      toast.error(friendlyError(err, "Failed to load products. Please refresh."));
    }
    setLoading(false);
  };

  useEffect(() => { loadProducts(true); }, []);

  // ── Open modal ─────────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditProduct(null);
    reset({});
    setImageFile(null);
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditProduct(p);
    reset({
      name: p.name, category: p.category, subcategory: p.subcategory,
      price: p.price, mrp: p.mrp, unit: p.unit,
      description: p.description, brand: p.brand,
      gstRate: p.gstRate, barcode: p.barcode,
      tags: p.tags?.join(", "), weight: p.weight,
    });
    setShowModal(true);
  };

  // ── Save product ───────────────────────────────────────────────────────────
  const onSubmit = async (data: ProductForm) => {
    setSaving(true);
    try {
      let imageUrls = editProduct?.imageUrls || [];

      // Upload new image if selected
      if (imageFile) {
        const imgRef = ref(storage, `products/${Date.now()}_${imageFile.name}`);
        await uploadBytes(imgRef, imageFile);
        const url = await getDownloadURL(imgRef);
        imageUrls = [url, ...imageUrls.slice(0, 4)]; // keep max 5
      }

      const slug = data.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const rawPayload = {
        ...data,
        slug,
        tags: data.tags ? data.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        imageUrls,
        inStock: true,
        updatedAt: serverTimestamp(),
      };

      const payload = cleanFirestoreData(rawPayload);

      if (editProduct) {
        await updateDoc(doc(db, COLLECTIONS.PRODUCTS, editProduct.id), payload);
        toast.success("Product updated");
      } else {
        const newRef = doc(collection(db, COLLECTIONS.PRODUCTS));
        await setDoc(newRef, { ...payload, createdAt: serverTimestamp() });

        // Create a zero-stock inventory record for every active store so the
        // product immediately appears in the Inventory page (per-store, ready to restock).
        const storesSnap = await getDocs(
          query(collection(db, COLLECTIONS.STORES), where("isActive", "==", true))
        );
        if (!storesSnap.empty) {
          const invBatch = writeBatch(db);
          storesSnap.docs.forEach(storeDoc => {
            invBatch.set(doc(db, COLLECTIONS.INVENTORY, `${storeDoc.id}_${newRef.id}`), {
              skuId: newRef.id,
              storeId: storeDoc.id,
              quantity: 0,
              reserved: 0,
              available: 0,
              lowStockThreshold: 10,
              updatedBy: "admin",
              updatedAt: serverTimestamp(),
            });
          });
          await invBatch.commit();
        }
        toast.success("Product created — set stock levels in Inventory");
      }

      setShowModal(false);
      loadProducts(true);
    } catch (err: any) {
      toast.error(friendlyError(err, "Failed to save product. Please try again."));
    }
    setSaving(false);
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm("Archive this product?")) return;
    await updateDoc(doc(db, COLLECTIONS.PRODUCTS, id), { inStock: false, updatedAt: serverTimestamp() });
    toast.success("Product archived");
    loadProducts(true);
  };

  // ── CSV Bulk Import (batched writes — 250 products per Firestore batch) ──────
  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        const toastId = toast.loading(`Importing ${rows.length} products...`);
        let success = 0, failed = 0;

        // Each product = 2 writes (product + inventory).
        // Firestore batch limit = 500 ops → 250 products per batch.
        const CHUNK = 250;
        for (let i = 0; i < rows.length; i += CHUNK) {
          const chunk = rows.slice(i, i + CHUNK);
          const batch = writeBatch(db);
          try {
            chunk.forEach(row => {
              const newRef = doc(collection(db, COLLECTIONS.PRODUCTS));
              const slug = row.name?.toLowerCase().replace(/\s+/g, "-") || newRef.id;
              batch.set(newRef, {
                name: row.name || "", slug,
                category: row.category || "Uncategorised",
                subcategory: row.subcategory || "",
                price: parseFloat(row.price) || 0,
                mrp: parseFloat(row.mrp) || 0,
                unit: row.unit || "pcs",
                description: row.description || "",
                brand: row.brand || "",
                gstRate: parseFloat(row.gstRate) || 5,
                barcode: row.barcode || "",
                tags: row.tags ? row.tags.split(",").map((t: string) => t.trim()) : [],
                imageUrls: [],
                inStock: true,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
              batch.set(doc(db, COLLECTIONS.INVENTORY, newRef.id), {
                skuId: newRef.id, quantity: parseInt(row.quantity) || 0,
                reserved: 0, available: parseInt(row.quantity) || 0,
                lowStockThreshold: 10, updatedBy: "csv-import",
                updatedAt: serverTimestamp(),
              });
              success++;
            });
            await batch.commit();
          } catch {
            failed += chunk.length;
            success -= chunk.length;
          }
        }

        toast.dismiss(toastId);
        toast.success(`Imported ${success} products${failed ? `, ${failed} failed` : ""}`);
        loadProducts(true);
        if (csvInputRef.current) csvInputRef.current.value = "";
      },
    });
  };

  const filtered = search
    ? products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()))
    : products;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-black">SKU Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your product catalog · {products.length} products loaded</p>
        </div>
        <div className="flex gap-3">
          <input ref={csvInputRef} type="file" accept=".csv" onChange={handleCSVImport} className="hidden" />
          <button onClick={() => csvInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 text-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-700 transition-colors">
            <Upload size={15} /> Import CSV
          </button>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-black rounded-xl text-sm font-bold hover:bg-emerald-400 transition-colors">
            <Plus size={15} /> Add Product
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search products by name or category..."
          className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 text-sm"
        />
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              {["Product", "Category", "Price", "MRP", "Unit", "GST", "Stock", "Actions"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <tr key={p.id} className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors ${i % 2 === 0 ? "" : "bg-gray-900/50"}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {p.imageUrls?.[0]
                      ? <img src={p.imageUrls[0]} alt={p.name} className="w-9 h-9 rounded-lg object-cover" />
                      : <div className="w-9 h-9 bg-gray-800 rounded-lg flex items-center justify-center"><Package size={16} className="text-gray-600" /></div>
                    }
                    <div>
                      <div className="text-white text-sm font-semibold">{p.name}</div>
                      <div className="text-gray-500 text-xs">{p.brand}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-400 text-sm">{p.category}</td>
                <td className="px-4 py-3 text-emerald-400 text-sm font-bold">₹{p.price}</td>
                <td className="px-4 py-3 text-gray-500 text-sm line-through">₹{p.mrp}</td>
                <td className="px-4 py-3 text-gray-400 text-sm">{p.unit}</td>
                <td className="px-4 py-3 text-gray-400 text-sm">{p.gstRate}%</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${p.inStock ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                    {p.inStock ? "In Stock" : "Out"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(p)} className="p-1.5 text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"><Edit size={14} /></button>
                    <button onClick={() => handleDelete(p.id)} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {loading && (
          <div className="py-12 text-center text-gray-600 text-sm">Loading products...</div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="py-12 text-center text-gray-600 text-sm">No products found</div>
        )}

        {hasMore && !search && (
          <div className="p-4 text-center">
            <button onClick={() => loadProducts(false)} className="text-emerald-500 text-sm font-semibold hover:text-emerald-400">
              Load more
            </button>
          </div>
        )}
      </div>

      {/* ── Add/Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h2 className="text-white font-black text-lg">{editProduct ? "Edit Product" : "Add New Product"}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-gray-400 text-xs font-semibold uppercase mb-1 block">Product Name *</label>
                  <input {...register("name")} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" />
                  {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="text-gray-400 text-xs font-semibold uppercase mb-1 block">Category *</label>
                  <select
                    {...register("category")}
                    onChange={(e) => {
                      setValue("category", e.target.value, { shouldValidate: true });
                      setValue("subcategory", ""); // clear subcategory when category changes
                    }}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Select Category</option>
                    {CATEGORY_LIST.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs font-semibold uppercase mb-1 block">Subcategory</label>
                  <select
                    {...register("subcategory")}
                    disabled={!selectedCategory}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                  >
                    <option value="">Select Subcategory</option>
                    {selectedCategory && GROCERY_CATEGORIES[selectedCategory as keyof typeof GROCERY_CATEGORIES]?.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-gray-400 text-xs font-semibold uppercase mb-1 block">Selling Price (₹) *</label>
                  <input {...register("price")} type="number" step="0.01" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs font-semibold uppercase mb-1 block">MRP (₹) *</label>
                  <input {...register("mrp")} type="number" step="0.01" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" />
                </div>

                <div>
                  <label className="text-gray-400 text-xs font-semibold uppercase mb-1 block">Unit *</label>
                  <select {...register("unit")} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500">
                    <option value="kg">kg</option>
                    <option value="g">g (grams)</option>
                    <option value="litre">litre</option>
                    <option value="ml">ml</option>
                    <option value="pcs">pcs</option>
                    <option value="dozen">dozen</option>
                    <option value="pack">pack</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs font-semibold uppercase mb-1 block">GST Rate (%)</label>
                  <select {...register("gstRate")} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500">
                    <option value={0}>0%</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                  </select>
                </div>

                <div>
                  <label className="text-gray-400 text-xs font-semibold uppercase mb-1 block">Brand</label>
                  <input {...register("brand")} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs font-semibold uppercase mb-1 block">Barcode</label>
                  <input {...register("barcode")} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" />
                </div>

                <div className="col-span-2">
                  <label className="text-gray-400 text-xs font-semibold uppercase mb-1 block">Tags (comma-separated)</label>
                  <input {...register("tags")} placeholder="dairy, fresh, organic" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" />
                </div>

                <div className="col-span-2">
                  <label className="text-gray-400 text-xs font-semibold uppercase mb-1 block">Description</label>
                  <textarea {...register("description")} rows={3} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 resize-none" />
                </div>

                <div className="col-span-2">
                  <label className="text-gray-400 text-xs font-semibold uppercase mb-1 block">Product Image</label>
                  <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-gray-700 file:text-gray-300 hover:file:bg-gray-600" />
                  {editProduct?.imageUrls?.[0] && !imageFile && (
                    <img src={editProduct.imageUrls[0]} alt="Current" className="mt-2 h-20 rounded-lg object-cover" />
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 bg-gray-800 text-gray-300 rounded-xl font-semibold text-sm hover:bg-gray-700">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 bg-emerald-500 text-black rounded-xl font-bold text-sm hover:bg-emerald-400 disabled:opacity-50">
                  {saving ? "Saving..." : editProduct ? "Update Product" : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
