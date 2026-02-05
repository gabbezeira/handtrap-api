import { Request, Response } from 'express';
import Stripe from 'stripe';
import * as admin from 'firebase-admin';
import { logger } from '../utils/logger';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-01-28.clover', // Use latest API version available in SDK
});

const db = admin.firestore();

export const createCheckoutSession = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) {
      return res.status(500).json({ error: 'Stripe configuration missing (Price ID)' });
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${req.headers.origin}/settings?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/settings`,
      client_reference_id: user.uid,
      metadata: {
        userId: user.uid,
      },
    });

    res.json({ url: session.url });
  } catch (error: any) {
    logger.error('Stripe checkout failed', error);
    res.status(500).json({ error: 'Failed to create checkout session', details: error.message });
  }
};

export const handleWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !endpointSecret) {
    return res.status(400).send('Missing Stripe signature or endpoint secret');
  }

  let event: Stripe.Event;

  try {
    // req.body must be RAW for signature verification
    // We assume app.ts is configured to pass raw body or we use a specific middleware
    event = stripe.webhooks.constructEvent((req as any).rawBody || req.body, sig, endpointSecret);
  } catch (err: any) {
    logger.error('Webhook signature verification failed', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutSessionCompleted(session);
      break;
    
    // Add other events like invoice.payment_failed if needed
    default:
      logger.info(`Unhandled event type: ${event.type}`);
  }

  res.send();
};

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId || session.client_reference_id;
  
  if (!userId) {
    logger.error('No userId found in session metadata');
    return;
  }

  logger.pay('Premium upgrade successful', { userId });

  // Update User in Firestore
  await db.collection('users').doc(userId).set({
    subscription: {
      plan: 'premium',
      status: 'active',
      startDate: new Date(),
      stripeCustomerId: session.customer,
      stripeSubscriptionId: session.subscription
    }
  }, { merge: true });
}

/**
 * Create a Stripe Billing Portal session for subscription management
 * Users can cancel, update payment method, view invoices, etc.
 */
export const createBillingPortalSession = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // Get user's Stripe customer ID from Firestore
    const userDoc = await db.collection('users').doc(user.uid).get();
    const userData = userDoc.data();
    const customerId = userData?.subscription?.stripeCustomerId;

    if (!customerId) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    // Create Billing Portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId as string,
      return_url: `${req.headers.origin}/decks`,
    });

    logger.info('Billing portal session created', { userId: user.uid });
    res.json({ url: portalSession.url });
  } catch (error: any) {
    logger.error('Failed to create billing portal session', error);
    res.status(500).json({ error: 'Failed to create billing portal session' });
  }
};
