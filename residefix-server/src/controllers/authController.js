const User = require('../models/User');
const Property = require('../models/Property');
const config = require('../config/env');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/respond');
const { signToken } = require('../middleware/auth');

const PROPERTY_FIELDS = 'name type address';

/** Returns the user with their property populated, ready to send to the client. */
const loadProfile = (id) => User.findById(id).populate('property', PROPERTY_FIELDS);

/** Throws a 400 if a property id was supplied but does not exist. */
async function assertPropertyExists(propertyId) {
  if (propertyId && !(await Property.exists({ _id: propertyId }))) {
    throw ApiError.badRequest('Selected property does not exist');
  }
}

/**
 * POST /api/auth/register
 * Public sign-up. Creates a resident, or a manager when the correct
 * MANAGER_SIGNUP_CODE is supplied. Admins are only created by the seed script
 * or promoted by another admin.
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, property, roomNumber, managerCode } = req.body;

  if (await User.exists({ email })) throw ApiError.conflict('An account with this email already exists');
  await assertPropertyExists(property);

  let role = 'resident';
  if (managerCode) {
    if (!config.managerSignupCode || managerCode !== config.managerSignupCode) {
      throw ApiError.badRequest('Manager code is not correct');
    }
    role = 'manager';
  }

  const user = await User.create({
    name,
    email,
    password,
    phone,
    roomNumber,
    role,
    property: property || null,
  });

  created(res, { token: signToken(user._id), user: await loadProfile(user._id) }, 'Account created');
});

/** POST /api/auth/login */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');

  // Same message for both cases so attackers cannot tell which emails are registered.
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Email or password is incorrect');
  }

  ok(res, { token: signToken(user._id), user: await loadProfile(user._id) }, { message: 'Logged in' });
});

/** GET /api/auth/me */
const me = asyncHandler(async (req, res) => {
  ok(res, await loadProfile(req.user._id));
});

/**
 * PATCH /api/auth/me
 * Lets any user edit their own profile and change their password.
 * Role changes are deliberately not possible here.
 */
const updateMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  const { name, phone, roomNumber, property, currentPassword, newPassword } = req.body;

  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (roomNumber !== undefined) user.roomNumber = roomNumber;
  if (property !== undefined) {
    await assertPropertyExists(property);
    user.property = property || null;
  }

  if (newPassword) {
    if (!(await user.comparePassword(currentPassword || ''))) {
      throw ApiError.badRequest('Current password is incorrect');
    }
    user.password = newPassword;
  }

  await user.save();
  ok(res, await loadProfile(user._id), { message: 'Profile updated' });
});

module.exports = { register, login, me, updateMe };
