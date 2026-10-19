const router = require('express').Router();
const { getStats } = require('../controllers/statsController');
const { protect } = require('../middleware/auth');

// Any logged-in user gets stats scoped to the complaints they can see.
router.get('/', protect, getStats);

module.exports = router;
