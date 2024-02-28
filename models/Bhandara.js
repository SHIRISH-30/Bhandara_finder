const mongoose = require('mongoose');

const bhandaraSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  image: { 
    type: String, 
    required: true // Assuming the image is stored as a URL or a reference
  },
  date: { 
    type: Date, 
    required: true 
  },
  time: {
    type: String,
    enum: ['Morning', 'Afternoon', 'Evening'], // Restricts to specific times of day
    required: true
  },
  locationName: {
    type: String, // Add this field to store location name
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'], // Specifies the GeoJSON type
      required: true
    },
    coordinates: {
      type: [Number], // Stores longitude and latitude
      required: true
    }
  },
  
  googleMapLink: {
    type: String, // Optional URL to Google Maps
    required: false
  },
  description: { 
    type: String 
  }
});

// Index for geospatial queries, crucial for location-based operations
bhandaraSchema.index({ location: '2dsphere' });

const Bhandara = mongoose.model('Bhandara', bhandaraSchema);

module.exports = Bhandara;
