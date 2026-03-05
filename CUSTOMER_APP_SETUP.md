# 📱 Customer App Setup Guide - Green's Supermarket

## Prerequisites

1. **Node.js** (v18 or higher)
2. **Expo CLI**: `npm install -g expo-cli`
3. **Expo Go App** on your phone:
   - iOS: https://apps.apple.com/app/expo-go/id982107779
   - Android: https://play.google.com/store/apps/details?id=host.exp.exponent

## Quick Start

### 1. Install Dependencies

```bash
cd customer
npm install
```

### 2. Start Development Server

```bash
npm start
```

This will open Expo DevTools in your browser and show a QR code.

### 3. Run on Your Phone

**Option A: Expo Go (Recommended for Testing)**
1. Open Expo Go app on your phone
2. Scan the QR code from the terminal/browser
3. App will load on your device

**Option B: Android Emulator**
```bash
npm run android
```

**Option C: iOS Simulator** (Mac only)
```bash
npm run ios
```

## App Features

### Authentication
- Phone number + OTP login
- Firebase Authentication integration
- Persistent login with AsyncStorage

### Home Screen
- Browse products by category
- Search functionality
- Add to cart
- View product details

### Cart & Checkout
- Review cart items
- Select delivery address
- Choose delivery slot (AM/PM)
- Payment options: UPI, Card, COD
- Razorpay integration

### Orders
- View order history
- Track order status
- Real-time updates
- Order details

### Profile
- Manage delivery addresses
- View order history
- Account settings

## Configuration

The app uses the shared Firebase config from `shared/config.ts`:
- Firebase project: groceryos-61a05
- Razorpay test key: rzp_test_RrTWQ4YTkNkbU5

## Testing Flow

1. **Login**
   - Enter phone number: +919999999999
   - Enter OTP: 123456 (test number configured in Firebase)

2. **Browse Products**
   - Add products from admin panel first
   - Products will appear in categories

3. **Place Order**
   - Add items to cart
   - Proceed to checkout
   - Select/add delivery address
   - Choose delivery slot
   - Select payment method
   - Place order

4. **Track Order**
   - View order in Orders tab
   - See real-time status updates

## Troubleshooting

### "Unable to resolve module"
```bash
cd customer
rm -rf node_modules
npm install
```

### "Firebase not initialized"
- Check that `shared/config.ts` has correct Firebase credentials
- Ensure Firebase project is set up

### "Expo Go not connecting"
- Make sure phone and computer are on same WiFi
- Try restarting Expo server: `r` in terminal

### "Location permission denied"
- Grant location permission in phone settings
- Needed for delivery address selection

## Building for Production

### Android APK
```bash
expo build:android
```

### iOS IPA (requires Apple Developer account)
```bash
expo build:ios
```

## App Structure

```
customer/
├── app/                    # Expo Router pages
│   ├── (auth)/            # Auth screens
│   ├── (tabs)/            # Main tab navigation
│   ├── cart.tsx           # Cart screen
│   ├── order-tracking/    # Order tracking
│   └── product/           # Product details
├── src/
│   ├── components/        # Reusable components
│   ├── lib/              # Firebase config
│   ├── screens/          # Screen components
│   └── store/            # Zustand state management
└── app.json              # Expo configuration
```

## Next Steps

1. Test phone authentication with real numbers
2. Add more products via admin panel
3. Test complete order flow
4. Configure push notifications
5. Test payment integration
6. Add Google Maps API key for address selection

## Support

For issues or questions:
- Email: support@greenssupermarket.com
- Check Firebase Console for errors
- Review Expo logs in terminal
