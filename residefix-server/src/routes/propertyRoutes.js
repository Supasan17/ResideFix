const router = require('express').Router();
const ctrl = require('../controllers/propertyController');
const rules = require('../validators');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');

// Public list (used by the sign-up form to pick a property).
router.get('/', ctrl.listProperties);

// Staff-only routes. "/mine" is declared before "/:id" so it is not treated as an id.
router.get('/mine', protect, authorize('manager', 'admin'), ctrl.myProperties);
router.get('/:id', rules.idParam, validate, ctrl.getProperty);

router.post('/', protect, authorize('admin'), rules.createProperty, validate, ctrl.createProperty);
router.put('/:id', protect, authorize('manager', 'admin'), rules.updateProperty, validate, ctrl.updateProperty);
router.patch('/:id', protect, authorize('manager', 'admin'), rules.updateProperty, validate, ctrl.updateProperty);
router.delete('/:id', protect, authorize('admin'), rules.idParam, validate, ctrl.deleteProperty);

module.exports = router;
