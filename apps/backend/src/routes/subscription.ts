import { Router } from 'express';
import { SubscriptionController } from '../controllers/subscription';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/products', authenticateToken, SubscriptionController.getProducts);
router.post('/create', authenticateToken, SubscriptionController.createCheckoutSession);
router.post('/create-payment-intent', authenticateToken, SubscriptionController.createPaymentIntent);
router.get('/status', authenticateToken, SubscriptionController.getSubscriptionStatus);
router.get('/current', authenticateToken, SubscriptionController.getCurrentSubscription);
router.post('/cancel', authenticateToken, SubscriptionController.cancelSubscription);
router.post('/reactivate', authenticateToken, SubscriptionController.reactivateSubscription);
router.post('/validate-promo', authenticateToken, SubscriptionController.validatePromoCode);
router.post('/redeem-promo', authenticateToken, SubscriptionController.redeemPromoCode);

export default router;