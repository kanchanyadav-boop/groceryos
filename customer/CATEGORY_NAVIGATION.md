# Category Navigation Feature

## Overview
Added a category-based navigation system similar to Blinkit/Zepto apps, allowing users to browse products by category.

## Features Implemented

### 1. Categories Tab
- New "Categories" tab in the bottom navigation bar
- Displays all product categories in a grid layout
- Each category shows:
  - Category emoji icon
  - Category name
  - Number of subcategories
  - Color-coded borders

### 2. Category Detail Screen
- Shows all products in a selected category
- Horizontal scrollable subcategory filter
- Grid layout (2 columns) for products
- Pull-to-refresh functionality
- Filter by subcategory

### 3. Navigation Flow
```
Home → Categories Tab → Select Category → View Products → Product Detail
```

## Files Created

1. `customer/src/screens/Home/CategoriesScreen.tsx`
   - Main categories grid screen
   - Shows all 11 grocery categories

2. `customer/src/screens/Home/CategoryProducts.tsx`
   - Category detail screen
   - Displays products filtered by category
   - Subcategory filtering

3. `customer/app/(tabs)/categories.tsx`
   - Tab route for categories screen

4. `customer/app/category/[category].tsx`
   - Dynamic route for category detail pages

## Files Modified

1. `customer/app/(tabs)/_layout.tsx`
   - Added "Categories" tab to bottom navigation
   - Changed "Shop" to "Home" for clarity

## Category Configuration

Categories are defined in `shared/categories.ts`:
- Fruits & Vegetables 🥬
- Dairy & Bakery 🥛
- Staples 🌾
- Snacks & Beverages 🍿
- Packaged Food 🥫
- Personal Care 🧴
- Household 🧹
- Meat, Fish & Eggs 🥚
- Frozen & Instant 🧊
- Baby Care 👶
- Pet Care 🐾

## Usage

Users can now:
1. Tap the "Categories" tab in the bottom navigation
2. Browse all available categories
3. Tap a category to see all products in that category
4. Filter by subcategory using the horizontal filter chips
5. Add products to cart directly from the category view

## Design Features

- Dark theme consistent with the app
- Color-coded category cards
- Smooth animations and transitions
- Floating cart button for quick checkout
- Pull-to-refresh on product lists
- Empty state handling
