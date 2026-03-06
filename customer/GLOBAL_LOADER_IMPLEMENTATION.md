# Global Loader Implementation ✓

## Overview
Implemented a global loader component that displays across the entire app during loading or processing operations. The loader is managed through Zustand store and can be triggered from any component.

## Architecture

### 1. GlobalLoader Component
**Location**: `customer/src/components/GlobalLoader.tsx`

A reusable modal-based loader with:
- Full-screen semi-transparent overlay
- Centered loading spinner
- Optional custom message
- Dark theme styling matching app design
- Smooth fade animation

### 2. Loader Store
**Location**: `customer/src/store/index.ts`

Global state management using Zustand:
```typescript
interface LoaderStore {
  isLoading: boolean;
  message: string;
  showLoader: (message?: string) => void;
  hideLoader: () => void;
}
```

### 3. Root Integration
**Location**: `customer/app/_layout.tsx`

The GlobalLoader is integrated at the root level, making it available across all screens without needing to import it in each component.

## Usage

### Basic Usage

```typescript
import { useLoaderStore } from "../store";

function MyComponent() {
  const { showLoader, hideLoader } = useLoaderStore();

  const handleAction = async () => {
    showLoader("Processing...");
    
    try {
      await someAsyncOperation();
    } finally {
      hideLoader();
    }
  };
}
```

### With Default Message

```typescript
showLoader(); // Shows "Loading..." by default
```

### With Custom Message

```typescript
showLoader("Sending OTP...");
showLoader("Verifying payment...");
showLoader("Loading products...");
showLoader("Placing order...");
```

### Always Use try-finally

```typescript
// ✓ CORRECT - Ensures loader is hidden even if error occurs
const fetchData = async () => {
  showLoader("Fetching data...");
  try {
    const data = await api.getData();
    return data;
  } finally {
    hideLoader();
  }
};

// ✗ WRONG - Loader might stay visible if error occurs
const fetchData = async () => {
  showLoader("Fetching data...");
  const data = await api.getData();
  hideLoader(); // Won't execute if error thrown
  return data;
};
```

## Implementation Examples

### 1. ProductCatalog (Implemented)
**File**: `customer/src/screens/Home/ProductCatalog.tsx`

```typescript
const fetchProducts = async () => {
  try {
    if (!refreshing) {
      showLoader("Loading products...");
    }
    
    // Fetch products from Firestore
    const snap = await getDocs(q);
    // Process data...
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    hideLoader();
    setRefreshing(false);
  }
};
```

### 2. OTPAuth (Implemented)
**File**: `customer/src/screens/Auth/OTPAuth.tsx`

```typescript
const sendOTP = async (isResend = false) => {
  showLoader(isResend ? "Resending OTP..." : "Sending OTP...");
  
  try {
    // Send OTP logic
    setStep("otp");
    Alert.alert("OTP Sent", "Please enter the 6-digit OTP");
  } catch (error) {
    Alert.alert("Error", "Failed to send OTP");
  } finally {
    hideLoader();
  }
};

const verifyOTP = async () => {
  showLoader("Verifying OTP...");
  
  try {
    // Verify OTP and create/load user
    setUser(userProfile, userProfile.id);
    router.replace("/(tabs)/home");
  } catch (err) {
    Alert.alert("Login Failed", "Unable to verify OTP");
  } finally {
    hideLoader();
  }
};
```

## Recommended Usage Scenarios

### API Calls
```typescript
showLoader("Fetching data...");
showLoader("Saving changes...");
showLoader("Uploading image...");
```

### Authentication
```typescript
showLoader("Logging in...");
showLoader("Signing up...");
showLoader("Verifying OTP...");
showLoader("Resetting password...");
```

### Order Processing
```typescript
showLoader("Placing order...");
showLoader("Processing payment...");
showLoader("Confirming order...");
```

### Data Operations
```typescript
showLoader("Loading products...");
showLoader("Updating cart...");
showLoader("Applying coupon...");
showLoader("Calculating total...");
```

## Best Practices

### 1. Always Hide Loader
Use `try-finally` blocks to ensure loader is hidden even if errors occur:
```typescript
try {
  showLoader("Processing...");
  await operation();
} finally {
  hideLoader();
}
```

### 2. Meaningful Messages
Use descriptive messages that tell users what's happening:
```typescript
// ✓ Good
showLoader("Verifying payment...");
showLoader("Loading your orders...");

// ✗ Bad
showLoader("Please wait...");
showLoader("Loading...");
```

### 3. Don't Overuse
Don't show loader for very quick operations (<500ms):
```typescript
// ✗ Bad - Too fast, causes flicker
showLoader();
const cached = localStorage.getItem('data');
hideLoader();

// ✓ Good - Only for network operations
showLoader("Fetching latest data...");
const data = await api.fetch();
hideLoader();
```

### 4. Avoid Nested Loaders
Don't call `showLoader()` multiple times without hiding:
```typescript
// ✗ Bad
showLoader("Step 1...");
await step1();
showLoader("Step 2..."); // Previous loader still showing
await step2();

// ✓ Good
showLoader("Step 1...");
await step1();
hideLoader();

showLoader("Step 2...");
await step2();
hideLoader();
```

### 5. User Feedback
Combine with alerts/toasts for completion:
```typescript
showLoader("Placing order...");
try {
  await placeOrder();
  hideLoader();
  Alert.alert("Success", "Order placed successfully!");
} catch (error) {
  hideLoader();
  Alert.alert("Error", "Failed to place order");
}
```

## Styling

The loader uses the app's dark theme:
- Background overlay: `rgba(0, 0, 0, 0.7)`
- Container: `#0C1220` with border `#1C2A3E`
- Spinner color: `#10B981` (brand green)
- Text color: `#E8EDF8` (light gray)
- Border radius: `16px`
- Padding: `32px`

## Future Enhancements

1. **Progress Indicator**: Add percentage for long operations
   ```typescript
   showLoader("Uploading... 45%");
   ```

2. **Cancellable Operations**: Add cancel button
   ```typescript
   showLoader("Downloading...", { cancellable: true, onCancel: () => {} });
   ```

3. **Queue System**: Handle multiple simultaneous operations
   ```typescript
   // Show count of pending operations
   showLoader("Processing 3 items...");
   ```

4. **Custom Icons**: Different icons for different operations
   ```typescript
   showLoader("Uploading...", { icon: "upload" });
   showLoader("Downloading...", { icon: "download" });
   ```

5. **Timeout Warning**: Alert if operation takes too long
   ```typescript
   showLoader("Loading...", { timeout: 30000 });
   ```

## Files Modified/Created

- ✓ `customer/src/components/GlobalLoader.tsx` (created)
- ✓ `customer/src/store/index.ts` (added LoaderStore)
- ✓ `customer/app/_layout.tsx` (integrated GlobalLoader)
- ✓ `customer/src/screens/Home/ProductCatalog.tsx` (implemented)
- ✓ `customer/src/screens/Auth/OTPAuth.tsx` (implemented)

## Testing Checklist

### Basic Functionality
- [ ] Loader appears when `showLoader()` is called
- [ ] Loader disappears when `hideLoader()` is called
- [ ] Custom message displays correctly
- [ ] Default message shows when no message provided
- [ ] Overlay blocks interaction with background

### ProductCatalog
- [ ] Loader shows when first loading products
- [ ] Loader doesn't show during pull-to-refresh
- [ ] Loader hides after products load
- [ ] Loader hides even if error occurs

### OTPAuth
- [ ] "Sending OTP..." shows when sending OTP
- [ ] "Resending OTP..." shows when resending
- [ ] "Verifying OTP..." shows during verification
- [ ] Loader hides after success/error

### Edge Cases
- [ ] Multiple rapid calls don't cause issues
- [ ] Loader works across navigation
- [ ] Loader persists during screen transitions
- [ ] Loader doesn't block alerts/modals

---

**Status**: Complete and ready for use
**Last Updated**: March 6, 2026
