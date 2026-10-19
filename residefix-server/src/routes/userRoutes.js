const router = require('express').Router();
const ctrl = require('../controllers/userController');
const rules = require('../validators');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// Managers need the staff list to assign complaints.
router.get('/staff', authorize('manager', 'admin'), ctrl.listStaff);

// Everything else is admin only.
router.use(authorize('admin'));
router.get('/', rules.listUsers, validate, ctrl.listUsers);
router.get('/:id', rules.idParam, validate, ctrl.getUser);
router.put('/:id', rules.updateUser, validate, ctrl.updateUser);
router.patch('/:id', rules.updateUser, validate, ctrl.updateUser);
router.delete('/:id', rules.idParam, validate, ctrl.deleteUser);

module.exports = router;
