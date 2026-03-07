// admin/src/pages/BarcodeProductImport.tsx
import { useState } from "react";
import { collection, doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { COLLECTIONS } from "../../shared/config";
import toast from "react-hot-toast";
import { Barcode, Search, Plus, Package, AlertCircle, CheckCircle } from "lucide-react";
import { friendlyError } from "../lib/errors";

interface OpenFoodFactsProduct {
  code: string;
  product: {
    product_name: string;
    brands: string;
    categories: string;
    image_url: string;
    quantity: string;
    nutriscore_grade?: string;
    ingredients_text?: string;
  };
}

interface ImportResult {
  barcode: string;
  name: string;
  status: 'success' | 'error' | 'exists';
  message: string;
}

export default function BarcodeProductImport() {
  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [productData, setProductData] = useState<any>(null);
  const [barcodeList, setBarcodeList] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);

  // Validate barcode format
  const validateBarcode = (code: string): { valid: boolean; type: string; message: string } => {
    const cleaned = code.replace(/[^0-9]/g, '');
    
    if (cleaned.length === 13) {
      return { valid: true, type: 'EAN-13', message: 'Valid EAN-13 barcode' };
    } else if (cleaned.length === 12) {
      return { valid: true, type: 'UPC-A', message: 'Valid UPC-A barcode' };
    } else if (cleaned.length === 8) {
      return { valid: true, type: 'EAN-8', message: 'Valid EAN-8 barcode' };
    } else if (cleaned.length >= 10 && cleaned.length <= 14) {
      return { valid: true, type: 'ISBN/Other', message: 'Valid barcode format' };
    } else {
      return { valid: false, type: 'Invalid', message: 'Invalid barcode length. Expected 8, 12, or 13 digits' };
    }
  };

  // Fetch product from Open Food Facts API
  const fetchProductByBarcode = async (code: string) => {
    try {
      // Validate barcode first
      const validation = validateBarcode(code);
      if (!validation.valid) {
        toast.error(validation.message);
        return null;
      }

      const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`);
      const data: OpenFoodFactsProduct = await response.json();
      
      if (data.product && data.product.product_name) {
        return {
          barcode: code,
          name: data.product.product_name || "Unknown Product",
          brand: data.product.brands || "",
          category: mapCategory(data.product.categories),
          imageUrl: data.product.image_url || "",
          quantity: data.product.quantity || "",
          description: data.product.ingredients_text || "",
          barcodeType: validation.type,
        };
      }
      return null;
    } catch (error) {
      console.error("Error fetching product:", error);
      return null;
    }
  };

  // Map Open Food Facts categories to our categories
  const mapCategory = (categories: string): string => {
    if (!categories) return "Groceries";
    const cat = categories.toLowerCase();
    
    if (cat.includes("dairy") || cat.includes("milk") || cat.includes("cheese")) return "Dairy & Bakery";
    if (cat.includes("fruit") || cat.includes("vegetable")) return "Fruits & Vegetables";
    if (cat.includes("beverage") || cat.includes("drink") || cat.includes("juice")) return "Beverages";
    if (cat.includes("snack") || cat.includes("biscuit") || cat.includes("cookie")) return "Snacks & Branded Foods";
    if (cat.includes("meat") || cat.includes("chicken") || cat.includes("fish")) return "Meat, Fish & Eggs";
    if (cat.includes("rice") || cat.includes("flour") || cat.includes("dal") || cat.includes("pulse")) return "Staples";
    if (cat.includes("oil") || cat.includes("ghee") || cat.includes("spice")) return "Oil, Ghee & Masala";
    if (cat.includes("clean") || cat.includes("detergent") || cat.includes("soap")) return "Cleaning & Household";
    if (cat.includes("personal") || cat.includes("beauty") || cat.includes("care")) return "Personal Care";
    if (cat.includes("baby") || cat.includes("infant")) return "Baby Care";
    
    return "Groceries";
  };

  // Search single barcode
  const handleSearch = async () => {
    if (!barcode.trim()) {
      toast.error("Please enter a barcode");
      return;
    }

    setLoading(true);
    setProductData(null);

    try {
      const data = await fetchProductByBarcode(barcode.trim());
      if (data) {
        setProductData(data);
        toast.success("Product found!");
      } else {
        toast.error("Product not found in database");
      }
    } catch (error) {
      toast.error("Failed to fetch product");
    }
    setLoading(false);
  };

  // Add product to Firestore
  const handleAddProduct = async () => {
    if (!productData) return;

    try {
      // Check if product already exists
      const existingDoc = await getDoc(doc(db, COLLECTIONS.PRODUCTS, productData.barcode));
      if (existingDoc.exists()) {
        toast.error("Product with this barcode already exists");
        return;
      }

      const slug = productData.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      
      await setDoc(doc(db, COLLECTIONS.PRODUCTS, productData.barcode), {
        name: productData.name,
        slug,
        category: productData.category,
        subcategory: "",
        price: 0, // To be set manually
        mrp: 0, // To be set manually
        unit: "pcs",
        description: productData.description,
        brand: productData.brand,
        gstRate: 5,
        barcode: productData.barcode,
        tags: [],
        imageUrls: productData.imageUrl ? [productData.imageUrl] : [],
        inStock: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Initialize inventory
      await setDoc(doc(db, COLLECTIONS.INVENTORY, productData.barcode), {
        skuId: productData.barcode,
        quantity: 0,
        reserved: 0,
        available: 0,
        lowStockThreshold: 10,
        updatedBy: "barcode-import",
        updatedAt: serverTimestamp(),
      });

      toast.success("Product added! Please update price in SKU Management");
      setProductData(null);
      setBarcode("");
    } catch (error: any) {
      toast.error(friendlyError(error, "Failed to import product. Please try again."));
    }
  };

  // Bulk import from barcode list
  const handleBulkImport = async () => {
    const barcodes = barcodeList
      .split("\n")
      .map(b => b.trim())
      .filter(Boolean);

    if (barcodes.length === 0) {
      toast.error("Please enter at least one barcode");
      return;
    }

    setBulkLoading(true);
    setImportResults([]);
    const results: ImportResult[] = [];

    for (const code of barcodes) {
      try {
        // Check if exists
        const existingDoc = await getDoc(doc(db, COLLECTIONS.PRODUCTS, code));
        if (existingDoc.exists()) {
          results.push({
            barcode: code,
            name: existingDoc.data().name,
            status: 'exists',
            message: 'Already exists'
          });
          continue;
        }

        // Fetch from API
        const data = await fetchProductByBarcode(code);
        if (!data) {
          results.push({
            barcode: code,
            name: 'Unknown',
            status: 'error',
            message: 'Not found in database'
          });
          continue;
        }

        // Add to Firestore
        const slug = data.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        
        await setDoc(doc(db, COLLECTIONS.PRODUCTS, code), {
          name: data.name,
          slug,
          category: data.category,
          subcategory: "",
          price: 0,
          mrp: 0,
          unit: "pcs",
          description: data.description,
          brand: data.brand,
          gstRate: 5,
          barcode: code,
          tags: [],
          imageUrls: data.imageUrl ? [data.imageUrl] : [],
          inStock: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        await setDoc(doc(db, COLLECTIONS.INVENTORY, code), {
          skuId: code,
          quantity: 0,
          reserved: 0,
          available: 0,
          lowStockThreshold: 10,
          updatedBy: "bulk-barcode-import",
          updatedAt: serverTimestamp(),
        });

        results.push({
          barcode: code,
          name: data.name,
          status: 'success',
          message: 'Imported successfully'
        });

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error: any) {
        results.push({
          barcode: code,
          name: 'Error',
          status: 'error',
          message: error.message
        });
      }
    }

    setImportResults(results);
    setBulkLoading(false);
    
    const successCount = results.filter(r => r.status === 'success').length;
    toast.success(`Imported ${successCount} products. Check results below.`);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-white text-2xl font-black flex items-center gap-2">
          <Barcode size={28} />
          Barcode Product Import
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Import products using barcodes from Open Food Facts database (2.9M+ products)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Single Barcode Search */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <Search size={20} />
            Single Product Import
          </h2>

          <div className="space-y-4">
            <div>
              <label className="text-gray-400 text-xs font-semibold uppercase mb-2 block">
                Enter Barcode
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="e.g., 8901030895326"
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="px-6 py-3 bg-emerald-500 text-black rounded-xl font-bold text-sm hover:bg-emerald-400 disabled:opacity-50"
                >
                  {loading ? "Searching..." : "Search"}
                </button>
              </div>
            </div>

            {productData && (
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-4">
                  {productData.imageUrl ? (
                    <img
                      src={productData.imageUrl}
                      alt={productData.name}
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gray-700 rounded-lg flex items-center justify-center">
                      <Package size={32} className="text-gray-600" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-white font-bold">{productData.name}</h3>
                    <p className="text-gray-400 text-sm">{productData.brand}</p>
                    <p className="text-gray-500 text-xs mt-1">
                      Category: {productData.category}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Barcode:</span>
                    <span className="text-white ml-2">{productData.barcode}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Quantity:</span>
                    <span className="text-white ml-2">{productData.quantity || "N/A"}</span>
                  </div>
                </div>

                {productData.description && (
                  <p className="text-gray-400 text-xs line-clamp-2">
                    {productData.description}
                  </p>
                )}

                <button
                  onClick={handleAddProduct}
                  className="w-full py-2.5 bg-emerald-500 text-black rounded-xl font-bold text-sm hover:bg-emerald-400 flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
                  Add to Catalog
                </button>
                <p className="text-gray-500 text-xs text-center">
                  Note: Price needs to be set manually in SKU Management
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Bulk Import */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <Package size={20} />
            Bulk Import
          </h2>

          <div className="space-y-4">
            <div>
              <label className="text-gray-400 text-xs font-semibold uppercase mb-2 block">
                Enter Barcodes (one per line)
              </label>
              <textarea
                value={barcodeList}
                onChange={(e) => setBarcodeList(e.target.value)}
                placeholder="8901030895326&#10;8901030895333&#10;8901030895340"
                rows={8}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 resize-none font-mono"
              />
            </div>

            <button
              onClick={handleBulkImport}
              disabled={bulkLoading}
              className="w-full py-3 bg-emerald-500 text-black rounded-xl font-bold text-sm hover:bg-emerald-400 disabled:opacity-50"
            >
              {bulkLoading ? "Importing..." : "Import All Products"}
            </button>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3">
              <p className="text-blue-400 text-xs flex items-start gap-2">
                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                <span>
                  Products will be imported with default prices (₹0). Update prices in SKU Management after import.
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Import Results */}
      {importResults.length > 0 && (
        <div className="mt-6 bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-white font-bold text-lg mb-4">Import Results</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {importResults.map((result, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-3 rounded-xl ${
                  result.status === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/30'
                    : result.status === 'exists'
                    ? 'bg-yellow-500/10 border border-yellow-500/30'
                    : 'bg-red-500/10 border border-red-500/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  {result.status === 'success' ? (
                    <CheckCircle size={16} className="text-emerald-400" />
                  ) : (
                    <AlertCircle size={16} className={result.status === 'exists' ? 'text-yellow-400' : 'text-red-400'} />
                  )}
                  <div>
                    <p className="text-white text-sm font-semibold">{result.name}</p>
                    <p className="text-gray-400 text-xs">Barcode: {result.barcode}</p>
                  </div>
                </div>
                <span
                  className={`text-xs font-semibold ${
                    result.status === 'success'
                      ? 'text-emerald-400'
                      : result.status === 'exists'
                      ? 'text-yellow-400'
                      : 'text-red-400'
                  }`}
                >
                  {result.message}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-800 flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
              <span className="text-gray-400">
                Success: {importResults.filter(r => r.status === 'success').length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-gray-400">
                Exists: {importResults.filter(r => r.status === 'exists').length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-gray-400">
                Failed: {importResults.filter(r => r.status === 'error').length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="text-white font-bold text-lg mb-3">How to Use</h2>
        <ol className="space-y-2 text-gray-400 text-sm list-decimal list-inside">
          <li>Enter a barcode or paste multiple barcodes (one per line)</li>
          <li>Click Search/Import to fetch product details from Open Food Facts</li>
          <li>Review the product information and add to your catalog</li>
          <li>Go to SKU Management to update prices and inventory</li>
          <li>Use barcode scanner apps on mobile to quickly scan products</li>
        </ol>
        <div className="mt-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
          <p className="text-emerald-400 text-xs">
            💡 Tip: You can use any barcode scanner app on your phone to scan products and copy the barcode numbers here.
          </p>
        </div>
      </div>
    </div>
  );
}
