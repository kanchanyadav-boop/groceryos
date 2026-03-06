// shared/storeUtils.ts
// Utility functions for store and pincode management

import { Store } from "./types";

/**
 * Find store that services a given pincode
 * @param pincode - 6-digit pincode
 * @param stores - Array of all stores
 * @returns Store that services the pincode, or null if not serviceable
 */
export function findStoreByPincode(pincode: string, stores: Store[]): Store | null {
  if (!pincode || pincode.length !== 6) {
    return null;
  }

  // Find active store that services this pincode
  const store = stores.find(
    s => s.isActive && s.serviceablePincodes.includes(pincode)
  );

  return store || null;
}

/**
 * Check if a pincode is serviceable by any store
 * @param pincode - 6-digit pincode
 * @param stores - Array of all stores
 * @returns true if pincode is serviceable
 */
export function isPincodeServiceable(pincode: string, stores: Store[]): boolean {
  return findStoreByPincode(pincode, stores) !== null;
}

/**
 * Get all serviceable pincodes across all active stores
 * @param stores - Array of all stores
 * @returns Array of unique pincodes
 */
export function getAllServiceablePincodes(stores: Store[]): string[] {
  const pincodes = new Set<string>();
  
  stores
    .filter(s => s.isActive)
    .forEach(store => {
      store.serviceablePincodes.forEach(pin => pincodes.add(pin));
    });

  return Array.from(pincodes).sort();
}

/**
 * Get store info for display
 * @param store - Store object
 * @returns Formatted store info
 */
export function getStoreDisplayInfo(store: Store) {
  return {
    name: store.name,
    address: `${store.address.line1}, ${store.address.line2 ? store.address.line2 + ', ' : ''}${store.address.city}, ${store.address.state} - ${store.address.pincode}`,
    phone: store.phone,
    email: store.email,
    hours: store.operatingHours 
      ? `${store.operatingHours.open} - ${store.operatingHours.close}`
      : null,
  };
}
