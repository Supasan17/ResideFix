// Runs before every test file: switch the app into test mode (disables
// request logging and rate limiting) and use a fixed JWT secret.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.MANAGER_SIGNUP_CODE = 'test-manager-code';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';
