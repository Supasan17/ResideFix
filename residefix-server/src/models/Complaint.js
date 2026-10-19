const mongoose = require('mongoose');
const { CATEGORIES, PRIORITIES, STATUSES } = require('../config/constants');

const { ObjectId } = mongoose.Schema.Types;

// A message in the conversation between the resident and property staff.
const commentSchema = new mongoose.Schema(
  {
    author: { type: ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// One entry per status change, used to draw the timeline on the details page.
const statusEventSchema = new mongoose.Schema(
  {
    status: { type: String, enum: STATUSES, required: true },
    changedBy: { type: ObjectId, ref: 'User' },
    note: { type: String, trim: true, maxlength: 300, default: '' },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const complaintSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 120 },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: 2000,
    },
    category: { type: String, enum: CATEGORIES, required: true },
    priority: { type: String, enum: PRIORITIES, default: 'medium' },
    status: { type: String, enum: STATUSES, default: 'open' },
    images: { type: [String], default: [] },
    roomNumber: { type: String, trim: true, maxlength: 20, default: '' },
    resident: { type: ObjectId, ref: 'User', required: true },
    property: { type: ObjectId, ref: 'Property', required: true },
    assignedTo: { type: ObjectId, ref: 'User', default: null },
    comments: { type: [commentSchema], default: [] },
    statusHistory: { type: [statusEventSchema], default: [] },
    // Set when the complaint first becomes resolved/closed; drives the average resolution time stat.
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Indexes for the common list filters and the keyword search.
complaintSchema.index({ status: 1, category: 1, priority: 1 });
complaintSchema.index({ property: 1, createdAt: -1 });
complaintSchema.index({ resident: 1, createdAt: -1 });

// Every new complaint starts its timeline with an "open" entry.
complaintSchema.pre('save', function seedHistory(next) {
  if (this.isNew && this.statusHistory.length === 0) {
    this.statusHistory.push({ status: this.status, changedBy: this.resident, note: 'Complaint submitted' });
  }
  next();
});

complaintSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Complaint', complaintSchema);
