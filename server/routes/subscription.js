const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// Subscription pricing (matching 12step-online model)
const SUBSCRIPTION_PLANS = {
    '1month': { price: 2000, duration: 30, name: '1 Month' },
    '2months': { price: 3500, duration: 60, name: '2 Months' },
    '3months': { price: 4500, duration: 90, name: '3 Months' }
};

// Get subscription plans
router.get('/plans', (req, res) => {
    res.json({
        success: true,
        plans: Object.keys(SUBSCRIPTION_PLANS).map(key => ({
            id: key,
            name: SUBSCRIPTION_PLANS[key].name,
            price: SUBSCRIPTION_PLANS[key].price / 100,
            duration: SUBSCRIPTION_PLANS[key].duration,
            features: [
                'Court-Ordered Proof of Attendance',
                'Immediate PDF Certificates',
                'Attendance Tracking',
                'Verification Support',
                'Access to All Meetings'
            ]
        }))
    });
});

// Create checkout session
router.post('/create-checkout', auth, async (req, res) => {
    try {
        const { planId } = req.body;

        if (!SUBSCRIPTION_PLANS[planId]) {
            return res.status(400).json({ error: 'Invalid plan selected' });
        }

        const plan = SUBSCRIPTION_PLANS[planId];

        // Create or retrieve Stripe customer
        let customerId = req.user.stripeCustomerId;

        if (!customerId) {
            const customer = await stripe.customers.create({
                email: req.user.email,
                metadata: {
                    userId: req.user._id.toString()
                }
            });
            customerId = customer.id;
            req.user.stripeCustomerId = customerId;
            await req.user.save();
        }

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: `AAVenture Subscription - ${plan.name}`,
                        description: 'Access to proof of attendance certificates and all features'
                    },
                    unit_amount: plan.price
                },
                quantity: 1
            }],
            mode: 'payment',
            success_url: `${process.env.BASE_URL || 'http://localhost:3000'}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.BASE_URL || 'http://localhost:3000'}/subscription`,
            metadata: {
                userId: req.user._id.toString(),
                planId: planId,
                duration: plan.duration.toString()
            }
        });

        res.json({
            success: true,
            sessionId: session.id,
            url: session.url
        });
    } catch (error) {
        console.error('Create checkout error:', error);
        res.status(500).json({ error: 'Server error creating checkout session' });
    }
});

// Webhook to handle successful payments
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;

        try {
            const userId = session.metadata.userId;
            const duration = parseInt(session.metadata.duration);

            const user = await User.findById(userId);
            if (user) {
                // Calculate expiry date
                const expiryDate = new Date();
                expiryDate.setDate(expiryDate.getDate() + duration);

                user.subscription = 'premium';
                user.subscriptionExpiry = expiryDate;
                await user.save();

                console.log(`Subscription activated for user ${userId} until ${expiryDate}`);
            }
        } catch (error) {
            console.error('Error processing webhook:', error);
        }
    }

    res.json({ received: true });
});

// Check subscription status
router.get('/status', auth, async (req, res) => {
    try {
        const hasActive = req.user.hasActiveSubscription();

        res.json({
            success: true,
            subscription: {
                type: req.user.subscription,
                isActive: hasActive,
                expiryDate: req.user.subscriptionExpiry,
                daysRemaining: hasActive ?
                    Math.ceil((req.user.subscriptionExpiry - new Date()) / (1000 * 60 * 60 * 24)) : 0
            }
        });
    } catch (error) {
        console.error('Get subscription status error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
