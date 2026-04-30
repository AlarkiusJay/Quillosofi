import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

const PRICES = {
  pro: 'price_1TIepOE2Z0ThEaioxK9RI8aC',
  unlimited: 'price_1TIepOE2Z0ThEaioeEpkUVed',
};

Deno.serve(async (req) => {
  try {
    const { plan, successUrl, cancelUrl } = await req.json();

    const priceId = PRICES[plan];
    if (!priceId) {
      return Response.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || 'https://zetrylgpt.base44.app/?upgrade=success',
      cancel_url: cancelUrl || 'https://zetrylgpt.base44.app/?upgrade=cancelled',
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        plan,
      },
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});