const mongoose = require('mongoose');
const { PROPERTY_TYPES } = require('../config/constants');

const propertySchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Property name is required'], trim: true, maxlength: 120 },
    type: { type: String, enum: PROPERTY_TYPES, required: true },
    address: { type: String, required: [true, 'Address is required'], trim: true, maxlength: 250 },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

propertySchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Property', propertySchema);
