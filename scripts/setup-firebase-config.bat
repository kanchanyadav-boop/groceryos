@echo off
REM Setup Firebase Cloud Functions Configuration for Windows

echo Setting up Firebase Cloud Functions environment variables...

firebase functions:config:set razorpay.key_id="rzp_test_RrTWQ4YTkNkbU5" razorpay.key_secret="L4con8FCTF4BOVNvdSiKk78u" razorpay.webhook_secret="YOUR_WEBHOOK_SECRET_HERE"

echo.
echo ✅ Razorpay configuration set!
echo.
echo Current configuration:
firebase functions:config:get

echo.
echo ⚠️  Remember to set your webhook secret!
echo Get it from: Razorpay Dashboard → Settings → Webhooks
