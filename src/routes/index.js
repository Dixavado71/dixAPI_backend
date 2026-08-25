import { Router } from 'express';
import { authRoutes } from '../modules/auth/index.js';
import companyRoutes from '../modules/companies/routes/index.js';
import { deliveryRoutes } from '../modules/delivery/index.js';
import couponRoutes from '../modules/coupons/routes/index.js';
import paymentEventRoutes from '../modules/payments/routes/index.js';
import catalogRoutes from '../modules/catalog/routes/index.js';
import promotionRoutes from '../modules/promotions/routes/index.js';
import customizationRoutes from '../modules/companies/routes/customization.js';
import communicationRoutes from '../modules/communications/routes/index.js';
import consentRoutes from '../modules/consent/routes/index.js';
import productRoutes from '../modules/products/routes/index.js';
import customerRoutes from '../modules/customers/routes/index.js';
import orderRoutes from '../modules/orders/routes/index.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/companies', companyRoutes);
router.use('/delivery', deliveryRoutes);
router.use('/coupons', couponRoutes);
router.use('/payments', paymentEventRoutes);
router.use('/catalog', catalogRoutes);
router.use('/customers', customerRoutes);
router.use('/orders', orderRoutes);
router.use('/promotions', promotionRoutes);
router.use('/company/customization', customizationRoutes);
router.use('/communications', communicationRoutes);
router.use('/consent', consentRoutes);
router.use('/products', productRoutes);

export default router;
