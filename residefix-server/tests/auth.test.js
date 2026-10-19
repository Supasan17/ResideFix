const { app, request, startDb, stopDb, clearDb, createUser, createProperty, auth } = require('./helpers');

beforeAll(startDb);
afterAll(stopDb);
afterEach(clearDb);

describe('POST /api/auth/register', () => {
  it('creates a resident and returns a token without the password', async () => {
    const property = await createProperty();
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test Resident',
      email: 'Resident@Example.com',
      password: 'secret123',
      property: property._id.toString(),
      roomNumber: '12',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user).toMatchObject({
      email: 'resident@example.com',
      role: 'resident',
      roomNumber: '12',
    });
    expect(res.body.data.user.property.name).toBe(property.name);
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('creates a manager when the correct manager code is given', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Boss',
      email: 'boss@example.com',
      password: 'secret123',
      managerCode: 'test-manager-code',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('manager');
  });

  it('rejects a wrong manager code', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Boss',
      email: 'boss@example.com',
      password: 'secret123',
      managerCode: 'nope',
    });
    expect(res.status).toBe(400);
  });

  it('validates input', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: '', email: 'not-an-email', password: '1' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors.map((e) => e.field)).toEqual(
      expect.arrayContaining(['name', 'email', 'password'])
    );
  });

  it('rejects a duplicate email', async () => {
    await createUser({ email: 'taken@example.com' });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Again', email: 'taken@example.com', password: 'secret123' });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with correct credentials', async () => {
    await createUser({ email: 'login@example.com', password: 'password123' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toEqual(expect.any(String));
  });

  it('rejects a wrong password with 401', async () => {
    await createUser({ email: 'login@example.com', password: 'password123' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'wrong-password' });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/incorrect/i);
  });
});

describe('GET/PATCH /api/auth/me', () => {
  it('requires a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects an invalid token', async () => {
    const res = await request(app).get('/api/auth/me').set(auth('garbage'));
    expect(res.status).toBe(401);
  });

  it('returns the current user', async () => {
    const { user, token } = await createUser({ name: 'Me Myself' });
    const res = await request(app).get('/api/auth/me').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(user._id.toString());
    expect(res.body.data.name).toBe('Me Myself');
  });

  it('updates the profile and changes the password', async () => {
    const { token } = await createUser({ email: 'pw@example.com', password: 'password123' });

    const bad = await request(app)
      .patch('/api/auth/me')
      .set(auth(token))
      .send({ currentPassword: 'wrong', newPassword: 'newpass123' });
    expect(bad.status).toBe(400);

    const res = await request(app)
      .patch('/api/auth/me')
      .set(auth(token))
      .send({ name: 'Renamed', currentPassword: 'password123', newPassword: 'newpass123' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Renamed');

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'pw@example.com', password: 'newpass123' });
    expect(login.status).toBe(200);
  });
});
