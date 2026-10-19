const router = require('express').Router();
const ctrl = require('../controllers/complaintController');
const rules = require('../validators');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');

// Every complaint route requires a logged-in user; finer checks happen in the controller.
router.use(protect);

router
  .route('/')
  .get(rules.listComplaints, validate, ctrl.listComplaints)
  .post(rules.createComplaint, validate, ctrl.createComplaint);

router
  .route('/:id')
  .get(rules.idParam, validate, ctrl.getComplaint)
  .put(rules.updateComplaint, validate, ctrl.updateComplaint)
  .patch(rules.updateComplaint, validate, ctrl.updateComplaint)
  .delete(rules.idParam, validate, ctrl.deleteComplaint);

router.post('/:id/comments', rules.addComment, validate, ctrl.addComment);
router.patch('/:id/status', rules.updateStatus, validate, ctrl.updateStatus);
router.patch(
  '/:id/assign',
  authorize('manager', 'admin'),
  rules.assignComplaint,
  validate,
  ctrl.assignComplaint
);

module.exports = router;
