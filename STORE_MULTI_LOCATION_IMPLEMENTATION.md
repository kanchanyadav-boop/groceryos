# Multi-Store & Pincode Management Implementation

## Overview
Complete multi-store support with pincode-based serviceability, store-wise inventory, and intelligent order routing.

## Architecture Changes

### 1. Data Model Updates

#### Store (New Collection)
```typescript
{
  id: string
  name: string
  code: string  // STR001, STR002
  address: { line1, line2, city, state, pincode, location }
  phone: string
  email: string
  serviceablePincodes: string[]  // ["400001", "400002"]
  isActive: boolean
  operatingHours: { open: "09:00", close: "21:00" }
}
```

#### InventoryItem (Updated)
```typescript
{
  skuId: string
  storeId: string  // NEW: Links inventory to specific store
  quantity: number
  reserved: number
  available: number
}
```

#### Order (Updated)
```typescript
{
  userId: string
  storeId: string  // NEW: Auto-assigned based on delivery pincode
  agentId: string
  deliveryAddress: { pincode: string }
}
```

#### Agent (Updated)
```typescript
{
  name: string
  storeId: string  // NEW: Agent belongs to specific store
  status: "available" | "busy"
}
```

## Features

### 1. Admin - Store Management
**Location:** `/stores`

- Create/Edit/Delete stores
- Set store address and contact info
- Define serviceable pincodes (comma-separated)
- Set operating hours
- Activate/deactivate stores

### 2. Admin - Store-Wise Inventory
**Location:** `/inventory`

- Filter inventory by store
- Each product has separate stock per store
- Low stock alerts per store
- Restock operations per store

### 3. Customer App - Store Info
**Location:** Hamburger Menu → "Our Stores"

- View all active stores
- See store addresses and contact
- Check operating hours
- View serviceable pincodes

### 4. Customer App - Pincode Validation
**Location:** Address entry, Checkout

- Validate pincode during address creation
- Show error if pincode not serviceable
- Display assigned store info

### 5. Order Routing Logic

```
Customer places order
→ Extract delivery pincode
→ Find store servicing that pincode
→ Assign storeId to order
→ Filter available agents by storeId
→ Assign agent from same store
```

## Implementation Steps

### Phase 1: Core Setup ✓
- [x] Add Store type to shared/types.ts
- [x] Add STORES collection to config
- [x] Update InventoryItem with storeId
- [x] Update Order with storeId
- [x] Update Agent with storeId
- [x] Create storeUtils.ts helper functions

### Phase 2: Admin - Store Management ✓
- [x] Create StoreManagement.tsx page
- [x] Add route to admin App.tsx
- [x] CRUD operations for stores
- [x] Pincode management UI

### Phase 3: Admin - Inventory Updates
- [ ] Add store filter to Inventory page
- [ ] Update inventory queries to include storeId
- [ ] Show store name in inventory list
- [ ] Filter by store dropdown

### Phase 4: Order Creation Updates
- [ ] Auto-detect store from pincode in CreateOrder
- [ ] Show assigned store in order summary
- [ ] Validate pincode serviceability
- [ ] Filter products by store inventory

### Phase 5: Customer App Updates
- [ ] Create StoreLocator screen
- [ ] Add to hamburger menu
- [ ] Pincode validation in address form
- [ ] Show store info during checkout

### Phase 6: Dispatch Updates
- [ ] Filter agents by store
- [ ] Show store in order list
- [ ] Assign only same-store agents

## Database Migration

### For Existing Data:

1. **Create Default Store**
```javascript
{
  name: "Main Store",
  code: "STR001",
  serviceablePincodes: ["*"], // All pincodes
  isActive: true
}
```

2. **Update Existing Inventory**
```javascript
// Add storeId to all existing inventory items
db.collection('inventory').get().then(snapshot => {
  snapshot.forEach(doc => {
    doc.ref.update({ storeId: 'default-store-id' });
  });
});
```

3. **Update Existing Orders**
```javascript
// Add storeId to all existing orders
db.collection('orders').get().then(snapshot => {
  snapshot.forEach(doc => {
    doc.ref.update({ storeId: 'default-store-id' });
  });
});
```

4. **Update Existing Agents**
```javascript
// Add storeId to all existing agents
db.collection('agents').get().then(snapshot => {
  snapshot.forEach(doc => {
    doc.ref.update({ storeId: 'default-store-id' });
  });
});
```

## Benefits

✓ Support multiple physical store locations
✓ Accurate inventory per location
✓ Efficient order routing
✓ Better agent management
✓ Scalable for expansion
✓ Clear serviceability boundaries
✓ Improved customer experience

## Next Steps

1. Complete Phase 3-6 implementations
2. Create migration scripts
3. Test with multiple stores
4. Update Firestore rules
5. Add analytics per store
