const { app, request, startDb, stopDb, clearDb, createUser, createProperty, auth } = require('./helpers');

beforeAll(startDb);
afterAll(stopDb);
afterEach(clearDb);

/** A property with its manager, two residents and an admin. */
async function setup() {
  const manager = await createUser({ role: 'manager' });
  const otherManager = await createUser({ role: 'manager' });
  const admin = await createUser({ role: 'admin' });
  const property = await createProperty({ manager: manager.user._id });
  const otherProperty = await createProperty({ manager: otherManager.user._id });
  const resident = await createUser({ property: property._id, roomNumber: '7' });
  const neighbour = await createUser({ property: property._id });
  return { manager, otherManager, admin, property, otherProperty, resident, neighbour };
}

const newComplaint = (overrides = {}) => ({
  title: 'Leaking pipe',
  description: 'Water is leaking under the sink',
  category: 'plumbing',
  priority: 'high',
  ...overrides,
});

async function submit(token, overrides) {
  const res = await request(app).post('/api/complaints').set(auth(token)).send(newComplaint(overrides));
  expect(res.status).toBe(201);
  return res.body.data;
}

describe('Complaints API', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/complaints');
    expect(res.status).toBe(401);
  });

  it('lets a resident submit a complaint using their profile property', async () => {
    const { resident, property } = await setup();
    const c = await submit(resident.token);

    expect(c).toMatchObject({ title: 'Leaking pipe', status: 'open', roomNumber: '7' });
    expect(c.property._id).toBe(property._id.toString());
    expect(c.resident._id).toBe(resident.user._id.toString());
    expect(c.statusHistory).toHaveLength(1);
  });

  it('validates complaint fields', async () => {
    const { resident } = await setup();
    const res = await request(app)
      .post('/api/complaints')
      .set(auth(resident.token))
      .send({ title: '', category: 'aliens', priority: 'whenever' });
    expect(res.status).toBe(400);
    expect(res.body.errors.map((e) => e.field)).toEqual(
      expect.arrayContaining(['title', 'description', 'category', 'priority'])
    );
  });

  it('shows residents only their own complaints', async () => {
    const { resident, neighbour } = await setup();
    await submit(resident.token, { title: 'Mine' });
    const theirs = await submit(neighbour.token, { title: 'Theirs' });

    const list = await request(app).get('/api/complaints').set(auth(resident.token));
    expect(list.status).toBe(200);
    expect(list.body.data.map((c) => c.title)).toEqual(['Mine']);

    const peek = await request(app).get(`/api/complaints/${theirs._id}`).set(auth(resident.token));
    expect(peek.status).toBe(404);
  });

  it('scopes managers to their own properties', async () => {
    const { resident, manager, otherManager } = await setup();
    await submit(resident.token);

    const mine = await request(app).get('/api/complaints').set(auth(manager.token));
    expect(mine.body.meta.total).toBe(1);

    const other = await request(app).get('/api/complaints').set(auth(otherManager.token));
    expect(other.body.meta.total).toBe(0);
  });

  it('filters, searches and paginates', async () => {
    const { resident, admin } = await setup();
    await submit(resident.token, { title: 'Wifi down', category: 'internet', priority: 'urgent' });
    await submit(resident.token, { title: 'Noisy party', category: 'noise', priority: 'low' });
    await submit(resident.token, { title: 'Dirty stairs', category: 'cleaning', priority: 'medium' });

    const byCategory = await request(app).get('/api/complaints?category=noise').set(auth(admin.token));
    expect(byCategory.body.data.map((c) => c.title)).toEqual(['Noisy party']);

    const search = await request(app).get('/api/complaints?q=wifi').set(auth(admin.token));
    expect(search.body.data.map((c) => c.title)).toEqual(['Wifi down']);

    const page = await request(app).get('/api/complaints?limit=2&page=2').set(auth(admin.token));
    expect(page.body.data).toHaveLength(1);
    expect(page.body.meta).toMatchObject({ page: 2, limit: 2, total: 3, pages: 2 });

    const sorted = await request(app).get('/api/complaints?sort=priority').set(auth(admin.token));
    expect(sorted.body.data.map((c) => c.priority)).toEqual(['urgent', 'medium', 'low']);

    const invalid = await request(app).get('/api/complaints?status=nonsense').set(auth(admin.token));
    expect(invalid.status).toBe(400);
  });

  it('lets the manager update status and records the timeline', async () => {
    const { resident, manager } = await setup();
    const c = await submit(resident.token);

    const res = await request(app)
      .patch(`/api/complaints/${c._id}/status`)
      .set(auth(manager.token))
      .send({ status: 'resolved', note: 'Pipe replaced' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('resolved');
    expect(res.body.data.resolvedAt).toBeTruthy();
    expect(res.body.data.statusHistory.map((h) => h.status)).toEqual(['open', 'resolved']);
    expect(res.body.data.statusHistory[1].note).toBe('Pipe replaced');
  });

  it('stops residents changing status except closing a resolved complaint', async () => {
    const { resident, manager } = await setup();
    const c = await submit(resident.token);

    const denied = await request(app)
      .patch(`/api/complaints/${c._id}/status`)
      .set(auth(resident.token))
      .send({ status: 'resolved' });
    expect(denied.status).toBe(403);

    await request(app)
      .patch(`/api/complaints/${c._id}/status`)
      .set(auth(manager.token))
      .send({ status: 'resolved' });

    const close = await request(app)
      .patch(`/api/complaints/${c._id}/status`)
      .set(auth(resident.token))
      .send({ status: 'closed' });
    expect(close.status).toBe(200);
    expect(close.body.data.status).toBe('closed');
  });

  it('prevents a manager from handling another property', async () => {
    const { resident, otherManager } = await setup();
    const c = await submit(resident.token);
    const res = await request(app)
      .patch(`/api/complaints/${c._id}/status`)
      .set(auth(otherManager.token))
      .send({ status: 'in-progress' });
    expect(res.status).toBe(404);
  });

  it('assigns a complaint to staff and moves it to in-progress', async () => {
    const { resident, manager, admin } = await setup();
    const c = await submit(resident.token);

    const res = await request(app)
      .patch(`/api/complaints/${c._id}/assign`)
      .set(auth(manager.token))
      .send({ assignedTo: admin.user._id.toString() });
    expect(res.status).toBe(200);
    expect(res.body.data.assignedTo._id).toBe(admin.user._id.toString());
    expect(res.body.data.status).toBe('in-progress');

    const toResident = await request(app)
      .patch(`/api/complaints/${c._id}/assign`)
      .set(auth(manager.token))
      .send({ assignedTo: resident.user._id.toString() });
    expect(toResident.status).toBe(400);

    const byResident = await request(app)
      .patch(`/api/complaints/${c._id}/assign`)
      .set(auth(resident.token))
      .send({ assignedTo: null });
    expect(byResident.status).toBe(403);
  });

  it('adds comments from the resident and the manager', async () => {
    const { resident, manager } = await setup();
    const c = await submit(resident.token);

    await request(app)
      .post(`/api/complaints/${c._id}/comments`)
      .set(auth(resident.token))
      .send({ text: 'Any update?' })
      .expect(201);
    const res = await request(app)
      .post(`/api/complaints/${c._id}/comments`)
      .set(auth(manager.token))
      .send({ text: 'Plumber is on the way' });

    expect(res.status).toBe(201);
    expect(res.body.data.comments.map((m) => m.text)).toEqual(['Any update?', 'Plumber is on the way']);
    expect(res.body.data.comments[1].author.role).toBe('manager');

    const empty = await request(app)
      .post(`/api/complaints/${c._id}/comments`)
      .set(auth(resident.token))
      .send({ text: '   ' });
    expect(empty.status).toBe(400);
  });

  it('lets a resident edit and withdraw only while open', async () => {
    const { resident, manager } = await setup();
    const c = await submit(resident.token);

    const edit = await request(app)
      .put(`/api/complaints/${c._id}`)
      .set(auth(resident.token))
      .send({ title: 'Leaking pipe (kitchen)' });
    expect(edit.status).toBe(200);
    expect(edit.body.data.title).toBe('Leaking pipe (kitchen)');

    await request(app)
      .patch(`/api/complaints/${c._id}/status`)
      .set(auth(manager.token))
      .send({ status: 'in-progress' });

    const lateEdit = await request(app)
      .put(`/api/complaints/${c._id}`)
      .set(auth(resident.token))
      .send({ title: 'Too late' });
    expect(lateEdit.status).toBe(400);

    const lateDelete = await request(app).delete(`/api/complaints/${c._id}`).set(auth(resident.token));
    expect(lateDelete.status).toBe(403);
  });

  it('lets an admin delete any complaint', async () => {
    const { resident, admin } = await setup();
    const c = await submit(resident.token);
    const res = await request(app).delete(`/api/complaints/${c._id}`).set(auth(admin.token));
    expect(res.status).toBe(200);
    const gone = await request(app).get(`/api/complaints/${c._id}`).set(auth(admin.token));
    expect(gone.status).toBe(404);
  });
});

describe('GET /api/stats', () => {
  it('returns counts by status and category with average resolution time', async () => {
    const { resident, manager, admin } = await setup();
    const a = await submit(resident.token, { category: 'plumbing' });
    await submit(resident.token, { category: 'noise' });
    await request(app)
      .patch(`/api/complaints/${a._id}/status`)
      .set(auth(manager.token))
      .send({ status: 'resolved' });

    const res = await request(app).get('/api/stats').set(auth(admin.token));
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(2);
    expect(res.body.data.byStatus).toMatchObject({ open: 1, resolved: 1, 'in-progress': 0, closed: 0 });
    expect(res.body.data.byCategory).toMatchObject({ plumbing: 1, noise: 1, electrical: 0 });
    expect(res.body.data.resolvedCount).toBe(1);
    expect(typeof res.body.data.avgResolutionHours).toBe('number');
    expect(res.body.data.totals.users).toBe(5);

    const residentStats = await request(app).get('/api/stats').set(auth(resident.token));
    expect(residentStats.body.data.totals).toBeUndefined();
  });
});
