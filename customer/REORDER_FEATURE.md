# Reorder Feature Documentation

## Overview
The Reorder tab allows customers to quickly reorder items they've purchased before, similar to Blinkit's "Order Again" feature.

## Features

### 1. Frequently Bought Section
- Shows items ordered 2 or more times
- Sorted by order frequency (most ordered first)
- Horizontal scrollable list
- Limited to top 20 items
- Displays order count badge

### 2. Previously Bought Section
- Shows all items from past orders
- Sorted by most recent order date
- Grid layout (2 columns)
- Shows how many times each item was ordered
- Includes items from all order statuses: delivered, confirmed, packed, dispatched

### 3. Smart Features
- Pull-to-refresh to update order history
- Real-time cart integration
- Add to cart directly from reorder screen
- Shows product availability status
- Displays current prices and discounts
- Floating cart button for quick checkout

### 4. User States

#### Not Logged In
- Shows login prompt
- Explains benefits of logging in
- Quick login button

#### No Orders Yet
- Shows empty state with shopping prompt
- Encourages first purchase
- Link to home/shop screen

#### Has Orders
- Shows personalized product recommendations
- Frequency-based sorting
- Recent order history

## Technical Implementation

### Data Flow
1. Fetches user's order history from Firestore
2. Extracts unique product IDs from order items
3. Counts order frequency for each product
4. Fetches current product details (prices, stock, images)
5. Combines order history with current product data
6. Sorts and displays in two sections

### Firestore Queries
```typescript
// Fetch orders
query(
  collection(db, "orders"),
  where("userId", "==", userId),
  where("status", "in", ["delivered", "confirmed", "packed", "dispatched"]),
  orderBy("createdAt", "desc"),
  limit(50)
)

// Fetch products (batched, max 10 per query)
query(
  collection(db, "products"),
  where("__name__", "in", productIds)
)
```

### Performance Optimizations
- Batched product queries (10 items per batch)
- Limited to last 50 orders
- Cached in component state
- Pull-to-refresh for manual updates
- Lazy loading with loader states

## User Experience

### Navigation Flow
```
Bottom Tab → Reorder → Product Card → Product Detail → Add to Cart
```

### Key Interactions
1. Tap product card → View product details
2. Tap "Add" button → Add to cart (qty: 1)
3. Tap +/- buttons → Adjust quantity
4. Pull down → Refresh order history
5. Tap cart button → View cart

## Design Features

### Visual Elements
- Dark theme consistent with app
- Product images with fallbacks
- Discount badges
- Out of stock overlays
- Order frequency indicators
- Section headers with counts

### Layout
- Horizontal scroll for frequently bought
- Grid layout for all items
- Floating cart button
- Responsive card sizing

## Edge Cases Handled

1. **No user logged in**: Shows login prompt
2. **No orders yet**: Shows empty state with CTA
3. **Product no longer available**: Shows "Unavailable" state
4. **Product out of stock**: Shows overlay and disabled add button
5. **Product price changed**: Shows current price
6. **Product deleted**: Skipped in display
7. **Large order history**: Limited to 50 most recent orders

## Future Enhancements

### Potential Features
1. Filter by category
2. Search within reorder items
3. "Buy again" quick action (add all items from a past order)
4. Personalized recommendations based on order patterns
5. Seasonal suggestions
6. Bundle deals for frequently bought together items
7. Order history timeline view
8. Export order history

### Analytics Opportunities
- Track reorder conversion rate
- Identify most reordered products
- Measure time between reorders
- Analyze reorder patterns by category

## Testing Checklist

- [ ] Login/logout flow
- [ ] Empty state display
- [ ] Product card interactions
- [ ] Add to cart functionality
- [ ] Quantity controls
- [ ] Pull-to-refresh
- [ ] Navigation to product details
- [ ] Cart button visibility
- [ ] Out of stock handling
- [ ] Price updates
- [ ] Image loading/fallbacks
- [ ] Frequency counting accuracy
- [ ] Sorting correctness

## Related Files

- `customer/src/screens/Home/ReorderScreen.tsx` - Main screen component
- `customer/app/(tabs)/reorder.tsx` - Tab route
- `customer/app/(tabs)/_layout.tsx` - Tab navigation config
- `shared/types.ts` - Order and Product types
- `customer/src/store/index.ts` - Cart and auth stores

## Dependencies

- Firebase Firestore (order and product queries)
- Zustand (cart and auth state)
- Expo Router (navigation)
- React Native (UI components)

## Configuration

No additional configuration required. The feature uses existing:
- Firestore collections (orders, products)
- Authentication state
- Cart functionality
- Navigation structure
