/**
 * Shared test utilities: an in-memory MongoDB per test file plus helpers to
 * create users/properties and get a JWT for them.
 */
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Property = require('../src/models/Property');
const { signToken } = require('../src/middleware/auth');

let mongod;

async function startDb() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}

async function stopDb() {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongod) await mongod.stop();
}

async function clearDb() {
  const collections = Object.values(mongoose.connection.collections);
  await Promise.all(collections.map((c) => c.deleteMany({})));
}

let counter = 0;

/** Creates a user directly in the database and returns { user, token }. */
async function createUser(overrides = {}) {
  counter += 1;
  const user = await User.create({
    name: `User ${counter}`,
    email: `user${counter}@test.com`,
    password: 'password123',
    role: 'resident',
    ...overrides,
  });
  return { user, token: signToken(user._id) };
}

function createProperty(overrides = {}) {
  counter += 1;
  return Property.create({
    name: `Property ${counter}`,
    type: 'hostel',
    address: `${counter} Test Street`,
    ...overrides,
  });
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

module.exports = { app, request, startDb, stopDb, clearDb, createUser, createProperty, auth };
