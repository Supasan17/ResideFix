const { app, request, startDb, stopDb, clearDb, createUser, createProperty, auth } = require('./helpers');

beforeAll(startDb);
afterAll(stopDb);
afterEach(clearDb);

describe('Properties API', () => {
  it('lists properties publicly', async () => {
    await createProperty({ name: 'Alpha Hostel' });
    const res = await request(app).get('/api/properties');
    expect(res.status).toBe(200);
    expect(res.body.data.map((p) => p.name)).toContain('Alpha Hostel');
  });

  it('only lets admins create properties', async () => {
    const { token: residentToken } = await createUser();
    const { token: adminToken } = await createUser({ role: 'admin' });
    const body = { name: 'New Place', type: 'apartment', address: '1 Main St' };

    await request(app).post('/api/properties').set(auth(residentToken)).send(body).expect(403);
    const res = await request(app).post('/api/properties').set(auth(adminToken)).send(body);
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('New Place');

    const bad = await request(app)
      .post('/api/properties')
      .set(auth(adminToken))
      .send({ ...body, type: 'castle' });
    expect(bad.status).toBe(400);
  });

  it('lets a manager edit only their own property', async () => {
    const manager = await createUser({ role: 'manager' });
    const mine = await createProperty({ manager: manager.user._id });
    const notMine = await createProperty();

    const ok = await request(app)
      .patch(`/api/properties/${mine._id}`)
      .set(auth(manager.token))
      .send({ address: '99 New Road' });
    expect(ok.status).toBe(200);
    expect(ok.body.data.address).toBe('99 New Road');

    await request(app)
      .patch(`/api/properties/${notMine._id}`)
      .set(auth(manager.token))
      .send({ address: 'x' })
      .expect(403);
  });
});

describe('Users API (admin)', () => {
  it('blocks non-admins', async () => {
    const { token } = await createUser({ role: 'manager' });
    await request(app).get('/api/users').set(auth(token)).expect(403);
  });

  it('lists, updates and deletes users', async () => {
    const admin = await createUser({ role: 'admin' });
    const target = await createUser({ name: 'Target Person' });

    const list = await request(app).get('/api/users?q=target').set(auth(admin.token));
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);

    const update = await request(app)
      .patch(`/api/users/${target.user._id}`)
      .set(auth(admin.token))
      .send({ role: 'manager' });
    expect(update.body.data.role).toBe('manager');

    await request(app).delete(`/api/users/${target.user._id}`).set(auth(admin.token)).expect(200);
    await request(app).delete(`/api/users/${admin.user._id}`).set(auth(admin.token)).expect(400);
  });

  it('lets managers fetch the staff list for assignment', async () => {
    const manager = await createUser({ role: 'manager' });
    await createUser({ role: 'resident' });
    const res = await request(app).get('/api/users/staff').set(auth(manager.token));
    expect(res.status).toBe(200);
    expect(res.body.data.every((u) => ['manager', 'admin'].includes(u.role))).toBe(true);
  });
});
