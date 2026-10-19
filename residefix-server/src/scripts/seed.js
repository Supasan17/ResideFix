/**
 * Seed script: wipes the ResideFix collections and inserts sample data.
 * Run with `npm run seed`. All sample accounts use the password "password123".
 */
const mongoose = require('mongoose');
const config = require('../config/env');
const { connectDB } = require('../config/db');
const User = require('../models/User');
const Property = require('../models/Property');
const Complaint = require('../models/Complaint');

const PASSWORD = 'password123';
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n) => new Date(Date.now() - n * DAY);

async function seed() {
  await connectDB(config.mongoUri);

  console.log('Clearing existing data...');
  await Promise.all([User.deleteMany({}), Property.deleteMany({}), Complaint.deleteMany({})]);

  // Users are created one by one so the password-hashing pre-save hook runs.
  const createUser = (data) => User.create({ password: PASSWORD, ...data });

  const admin = await createUser({ name: 'Ayesha Admin', email: 'admin@residefix.com', role: 'admin', phone: '0771000000' });
  const managerA = await createUser({ name: 'Kasun Perera', email: 'manager@residefix.com', role: 'manager', phone: '0772000001' });
  const managerB = await createUser({ name: 'Nimali Silva', email: 'manager2@residefix.com', role: 'manager', phone: '0772000002' });

  const [hostel, apartment, boarding] = await Property.create([
    { name: 'Sunrise Student Hostel', type: 'hostel', address: '12 University Road, Colombo 03', manager: managerA._id },
    { name: 'Lakeview Apartments', type: 'apartment', address: '45 Lake Drive, Kandy', manager: managerB._id },
    { name: 'Green Leaf Boarding House', type: 'boarding-house', address: '7 Temple Lane, Galle', manager: managerA._id },
  ]);

  const resident1 = await createUser({ name: 'Tharindu Jayasinghe', email: 'resident@residefix.com', role: 'resident', phone: '0773000001', property: hostel._id, roomNumber: 'B-204' });
  const resident2 = await createUser({ name: 'Dilini Fernando', email: 'resident2@residefix.com', role: 'resident', phone: '0773000002', property: apartment._id, roomNumber: '3A' });
  const resident3 = await createUser({ name: 'Ravindu Wickramasinghe', email: 'resident3@residefix.com', role: 'resident', phone: '0773000003', property: boarding._id, roomNumber: '5' });

  /** Builds a complaint whose history and dates look like real activity. */
  const complaint = ({ resident, property, status, created, resolvedAfterDays, assignedTo, comments = [], ...rest }) => {
    const createdAt = daysAgo(created);
    const history = [{ status: 'open', changedBy: resident._id, note: 'Complaint submitted', at: createdAt }];
    let resolvedAt = null;

    if (status !== 'open') {
      history.push({ status: 'in-progress', changedBy: assignedTo || property.manager, note: 'Work started', at: new Date(createdAt.getTime() + 0.25 * DAY) });
    }
    if (status === 'resolved' || status === 'closed') {
      resolvedAt = new Date(createdAt.getTime() + resolvedAfterDays * DAY);
      history.push({ status: 'resolved', changedBy: assignedTo || property.manager, note: 'Issue fixed', at: resolvedAt });
    }
    if (status === 'closed') {
      history.push({ status: 'closed', changedBy: resident._id, note: 'Confirmed by resident', at: new Date(resolvedAt.getTime() + 0.5 * DAY) });
    }

    return {
      ...rest,
      resident: resident._id,
      property: property._id,
      roomNumber: resident.roomNumber,
      status,
      assignedTo: assignedTo || null,
      statusHistory: history,
      resolvedAt,
      comments: comments.map((c, i) => ({ author: c.author._id, text: c.text, createdAt: new Date(createdAt.getTime() + (i + 1) * 0.1 * DAY) })),
      createdAt,
      updatedAt: history[history.length - 1].at,
    };
  };

  const complaints = [
    complaint({ title: 'Bathroom tap keeps dripping', description: 'The cold water tap in the shared bathroom on the 2nd floor drips all night.', category: 'plumbing', priority: 'medium', status: 'resolved', created: 9, resolvedAfterDays: 2, resident: resident1, property: hostel, assignedTo: managerA._id, comments: [{ author: resident1, text: 'It is getting worse, there is now a puddle.' }, { author: managerA, text: 'Plumber booked for tomorrow morning.' }] }),
    complaint({ title: 'No Wi-Fi in block B', description: 'Wi-Fi has been down in block B since Monday evening. Cannot attend online lectures.', category: 'internet', priority: 'high', status: 'in-progress', created: 3, resident: resident1, property: hostel, assignedTo: managerA._id, comments: [{ author: managerA, text: 'ISP technician has been contacted.' }] }),
    complaint({ title: 'Broken study chair', description: 'The study chair in my room has a cracked leg and is unsafe to sit on.', category: 'furniture', priority: 'low', status: 'open', created: 1, resident: resident1, property: hostel }),
    complaint({ title: 'Corridor light not working', description: 'The light outside room B-210 has been off for two days, the corridor is very dark at night.', category: 'electrical', priority: 'urgent', status: 'closed', created: 14, resolvedAfterDays: 0.5, resident: resident1, property: hostel, assignedTo: managerA._id }),
    complaint({ title: 'Loud music after midnight', description: 'Neighbours in 3B play loud music after midnight on weekdays.', category: 'noise', priority: 'medium', status: 'open', created: 2, resident: resident2, property: apartment }),
    complaint({ title: 'Main gate lock broken', description: 'The main gate lock does not close properly, anyone can walk in at night.', category: 'security', priority: 'urgent', status: 'in-progress', created: 1, resident: resident2, property: apartment, assignedTo: managerB._id, comments: [{ author: managerB, text: 'Security guard posted at the gate until the lock is replaced.' }] }),
    complaint({ title: 'Garbage not collected', description: 'Garbage bins at the back entrance have not been emptied for a week.', category: 'cleaning', priority: 'high', status: 'resolved', created: 6, resolvedAfterDays: 1, resident: resident2, property: apartment, assignedTo: managerB._id }),
    complaint({ title: 'Kitchen sink blocked', description: 'The shared kitchen sink is blocked and water does not drain.', category: 'plumbing', priority: 'high', status: 'open', created: 0.3, resident: resident3, property: boarding }),
    complaint({ title: 'Ceiling fan making noise', description: 'Ceiling fan in room 5 rattles loudly at every speed.', category: 'electrical', priority: 'low', status: 'resolved', created: 11, resolvedAfterDays: 4, resident: resident3, property: boarding, assignedTo: managerA._id }),
    complaint({ title: 'Water heater not working', description: 'No hot water in the bathroom since yesterday.', category: 'other', priority: 'medium', status: 'in-progress', created: 2, resident: resident3, property: boarding, assignedTo: admin._id }),
  ];

  // Cast through the model (validation + defaults), then insert with the raw driver so the
  // hand-built dates are kept instead of being replaced by Mongoose's automatic timestamps.
  const docs = complaints.map((c) => new Complaint(c));
  await Promise.all(docs.map((d) => d.validate()));
  await Complaint.collection.insertMany(docs.map((d) => d.toObject({ depopulate: true })));

  console.log('\nSeed complete. Sample accounts (password: %s):', PASSWORD);
  console.table([
    { role: 'admin', email: admin.email },
    { role: 'manager', email: managerA.email, manages: 'Sunrise Student Hostel, Green Leaf Boarding House' },
    { role: 'manager', email: managerB.email, manages: 'Lakeview Apartments' },
    { role: 'resident', email: resident1.email, lives: hostel.name },
    { role: 'resident', email: resident2.email, lives: apartment.name },
    { role: 'resident', email: resident3.email, lives: boarding.name },
  ]);
}

seed()
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.connection.close());
