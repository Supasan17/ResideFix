const router = require('express').Router();
const ctrl = require('../controllers/authController');
const rules = require('../validators');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');

router.post('/register', authLimiter, rules.register, validate, ctrl.register);
router.post('/login', authLimiter, rules.login, validate, ctrl.login);
router.get('/me', protect, ctrl.me);
router.patch('/me', protect, rules.updateMe, validate, ctrl.updateMe);

module.exports = router;
