const mongoose = require('mongoose');

const userDetailSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  location: {
    type: String, // This will store the location as a string
    required: true,
  },
  geoLocation: { // GeoJSON Point
    type: {
      type: String, // Don't do `{ location: { type: String } }`
      enum: ['Point'], // 'location.type' must be 'Point'
      required: true,
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  },
});

// Ensure the geoLocation.coordinates index is created
userDetailSchema.index({ geoLocation: '2dsphere' });

const UserDetail = mongoose.model('UserDetail', userDetailSchema);

module.exports = UserDetail;
