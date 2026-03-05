#!/bin/bash
# Setup Firebase Cloud Functions Configuration

echo "Setting up Firebase Cloud Functions environment variables..."

# Set Razorpay configuration
firebase functions:config:set \
  razorpay.key_id="rzp_test_RrTWQ4YTkNkbU5" \
  razorpay.key_secret="L4con8FCTF4BOVNvdSiKk78u" \
  razorpay.webhook_secret="YOUR_WEBHOOK_SECRET_HERE"

echo "✅ Razorpay configuration set!"

# View current configuration
echo ""
echo "Current configuration:"
firebase functions:config:get

echo ""
echo "⚠️  Remember to set your webhook secret!"
echo "Get it from: Razorpay Dashboard → Settings → Webhooks"
