// functions/index.js

// 1. Use the v2 imports
const { onCall, HttpsError, onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2/options");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

// 2. Initialize Admin SDK
admin.initializeApp();
const db = admin.firestore();

// 3. Configure Global Options
setGlobalOptions({ maxInstances: 10 });

// 4. Setup Stripe
// Note: In production, use process.env.STRIPE_SECRET_KEY
const stripe = require("stripe")("sk_test_51SZ9q9DGN0M5SptbI9niREMslz1JWkUdVoxGS2avtm7cdEcHjsN0a7WprBrG1ybmZT8dSmdo4etu2X8iwKsKGqnf00PgmJ2ySy");
const endpointSecret = "whsec_NxmYNMOogj3x7GlWRvD0Vam3kO0uAdOi";

// --- 1. CREATE CHECKOUT SESSION (v2 Syntax) ---
// v2 uses 'request' object which contains both 'auth' and 'data'
exports.createCheckoutSession = onCall(async (request) => {
  // Check authentication directly on the request object
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated", 
      "You must be logged in."
    );
  }

  // In v2, the data passed from the client is in request.data
  const { priceId, tierName, successUrl, cancelUrl } = request.data;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        uid: request.auth.uid,
        tier: tierName,
      },
      // 2. ADD THIS (So it shows up on the Subscription in Dashboard)
      subscription_data: {
        metadata: {
          uid: request.auth.uid,
          tier: tierName,
        }
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return { url: session.url };
  } catch (error) {
    console.error("Stripe Error:", error);
    throw new HttpsError("internal", error.message);
  }
});

// --- 2. STRIPE WEBHOOK ---
exports.stripeWebhook = onRequest(async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
  } catch (err) {
    console.error(`Webhook Signature Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const uid = session.metadata.uid;
    // TYPO FIXED HERE (Removed the stray '3')
    const newTier = session.metadata.tier;

    console.log(`💰 Payment successful for user ${uid}. Upgrading to ${newTier}.`);

    try {
      await db.collection("users").doc(uid).set(
        { tier: newTier },
        { merge: true }
      );
    } catch (e) {
      console.error("Firestore update failed", e);
      return res.status(500).send("Database Update Failed");
    }
  }

  res.json({ received: true });
});