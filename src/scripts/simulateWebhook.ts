
import axios from 'axios';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const SECRET = (process.env.STRIPE_WEBHOOK_SECRET || '').trim();
const PORT = process.env.PORT || 3000;
const USER_ID = process.argv[2]; // Pass the user ID as an argument

if (!SECRET) {
    console.error('❌ STRIPE_WEBHOOK_SECRET is missing in .env');
    process.exit(1);
}

if (!USER_ID) {
    console.error('❌ Usage: npm run simulate-webhook <USER_ID>');
    console.error('   Example: npm run simulate-webhook 123456789');
    process.exit(1);
}

const payload = {
  id: 'evt_test_webhook_' + Date.now(),
  object: 'event',
  api_version: '2026-01-28.clover',
  created: Math.floor(Date.now() / 1000),
  data: {
    object: {
      id: 'cs_test_' + Date.now(),
      object: 'checkout.session',
      client_reference_id: USER_ID,
      customer: 'cus_test_customer',
      subscription: 'sub_test_premium_plan',
      metadata: {
        userId: USER_ID
      },
      payment_status: 'paid',
      status: 'complete'
    }
  },
  type: 'checkout.session.completed',
  livemode: false,
};

// IMPORTANT: Use standard stringify without indentation for network transmission
// This must match exactly what is sent in the body
const payloadString = JSON.stringify(payload);
const timestamp = Math.floor(Date.now() / 1000);
const signaturePayload = `${timestamp}.${payloadString}`;

const signature = crypto
  .createHmac('sha256', SECRET)
  .update(signaturePayload)
  .digest('hex');

const header = `t=${timestamp},v1=${signature}`;

console.log(`🚀 Sending Webhook for User: ${USER_ID}`);
console.log(`Target: http://localhost:${PORT}/api/webhook`);

// Send raw string as body to ensure signature matches
axios.post(`http://localhost:${PORT}/api/webhook`, payloadString, {
    headers: {
        'Stripe-Signature': header,
        'Content-Type': 'application/json'
    }
}).then(res => {
    console.log('✅ Webhook Sent Successfully! Status:', res.status);
    console.log('User should now be Premium in Firestore.');
}).catch(err => {
    console.error('❌ Webhook Failed:', err.response?.data || err.message);
    if (err.response?.status === 400) {
        console.error('   Possible cause: Signature mismatch. Check if STRIPE_WEBHOOK_SECRET in .env matches what you used.');
    }
});
