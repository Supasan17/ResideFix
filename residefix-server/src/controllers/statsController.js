const Complaint = require('../models/Complaint');
const User = require('../models/User');
const Property = require('../models/Property');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/respond');
const { complaintScope } = require('../utils/access');
const { STATUSES, CATEGORIES, PRIORITIES } = require('../config/constants');

/** Turns [{_id: 'open', count: 3}] into { open: 3, ...every other key: 0 }. */
const toCounts = (rows, keys) => {
  const counts = Object.fromEntries(keys.map((k) => [k, 0]));
  rows.forEach((r) => {
    counts[r._id] = r.count;
  });
  return counts;
};

/**
 * GET /api/stats
 * Complaint counts by status, category and priority plus average resolution
 * time, scoped to what the current user can see. Admins also get totals of
 * users and properties.
 */
const getStats = asyncHandler(async (req, res) => {
  const match = await complaintScope(req.user);
  const HOUR = 1000 * 60 * 60;

  const [result] = await Complaint.aggregate([
    { $match: match },
    {
      $facet: {
        byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
        byCategory: [{ $group: { _id: '$category', count: { $sum: 1 } } }],
        byPriority: [{ $group: { _id: '$priority', count: { $sum: 1 } } }],
        total: [{ $count: 'count' }],
        resolution: [
          { $match: { resolvedAt: { $ne: null } } },
          {
            $group: {
              _id: null,
              avgMs: { $avg: { $subtract: ['$resolvedAt', '$createdAt'] } },
              count: { $sum: 1 },
            },
          },
        ],
        // Complaints created per day over the last 14 days, for the trend chart.
        last14Days: [
          { $match: { createdAt: { $gte: new Date(Date.now() - 14 * 24 * HOUR) } } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],
      },
    },
  ]);

  const resolution = result.resolution[0];
  const stats = {
    total: result.total[0]?.count || 0,
    byStatus: toCounts(result.byStatus, STATUSES),
    byCategory: toCounts(result.byCategory, CATEGORIES),
    byPriority: toCounts(result.byPriority, PRIORITIES),
    resolvedCount: resolution?.count || 0,
    // Rounded to one decimal place, null when nothing has been resolved yet.
    avgResolutionHours: resolution ? Math.round((resolution.avgMs / HOUR) * 10) / 10 : null,
    last14Days: result.last14Days.map((d) => ({ date: d._id, count: d.count })),
  };

  if (req.user.role === 'admin') {
    const [users, properties, roles] = await Promise.all([
      User.countDocuments(),
      Property.countDocuments(),
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    ]);
    stats.totals = { users, properties, byRole: toCounts(roles, ['resident', 'manager', 'admin']) };
  }

  ok(res, stats);
});

module.exports = { getStats };
