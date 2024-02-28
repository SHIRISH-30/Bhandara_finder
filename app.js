const express=require('express');
const app=express();
require('dotenv').config();
const mongoose=require('mongoose');
const path = require('path');
const axios = require('axios');
app.use(express.urlencoded({ extended: true }));
//ejs
// Set up EJS as the view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs')
//session 
const session=require('express-session');
app.use(session({
    secret: 'your-secret-key',
     resave: true,
     saveUninitialized: true,
      cookie:{
        maxAge:1000*60*60*24*7, //1 week
        }
}))
//nodemailer
const nodemailer = require('nodemailer');
//multer
app.use(express.static(path.join(__dirname,"public")));
const multer = require('multer');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/uploads/'); // Uploads will be stored in the 'uploads' directory
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

//port number
const PORT=process.env.PORT

const upload = multer({ storage: storage });
//UserDetailModel and BhandaraModel
const Bhandara=require('./models/Bhandara');
const UserDetail=require('./models/UserDetailSchema');
const { log } = require('console');
//mongo DB Connection 
const connectDB = async () => {
    try {
      const conn = await mongoose.connect(process.env.MONGODB_URI);
       
      console.log(`MongoDB connected: ${conn.connection.host}`);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  };
connectDB();

//listening to the PORT 
app.listen(PORT||8080,(req,res)=>{
    console.log(`SERVER IS RUNNING AT http://localhost:${PORT}`);
})

app.get('/',(req,res)=>{
    res.render('firstPage');
})
app.get("/login-otp",(req,res)=>{
    const email = req.session.email;
    res.render('login-otp',{email});
})
//otp generator
const generateOTP = () => Math.floor(100000 + Math.random() * 900000);
app.post('/send-otp',(req,res)=>{
    const email = req.body.email;
    const otp = generateOTP();

    // Save OTP and email in the session
    req.session.otp = otp;
    req.session.email = email;

    // Send OTP through email
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'shiroshetty30@gmail.com',
            pass: 'your password',
        },
    });

    const mailOptions = {
        from: 'shiroshetty30@gmail.com',
        to: email,
        subject: 'Authenication Using Email',
        text: `Your OTP is: ${otp}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
            return res.status(500).send('Error sending OTP through email');
        }

        console.log('Email sent: ' + info.response);
        res.redirect('/verify-otp');
    });
});

app.get('/verify-otp',(req,res)=>{
    res.render("verify-otp");
})


app.post('/verify-otp', (req, res) => {
    const enteredOTP = req.body.otp;
    const storedOTP = req.session.otp;
    console.log(enteredOTP,storedOTP);
   
    if(enteredOTP==storedOTP)
    {
        // Clear OTP and email from session after successful verification
          delete req.session.otp;
          delete req.session.email;
          res.redirect('/details');
    } 
    else {
        return res.status(400).send('Incorrect OTP. Please try again.');
    }
});

app.get('/details',(req,res)=>{
    res.render('details')
})

const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_TOKEN;
app.post('/details', async (req, res) => {
    const { name, location } = req.body;
  
    try {
      // Geocode the location using Mapbox
      const geocodeURL = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(location)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1`;
      const response = await axios.get(geocodeURL);
      const coordinates = response.data.features[0].geometry.coordinates;
  
      // Create a new UserDetail with the geocoded location
      const user = await UserDetail.create({
        name,
        location,
        geoLocation: {
          type: 'Point',
          coordinates, // Mapbox returns coordinates in [longitude, latitude] order
        },
      });
      req.session.user=user;
      res.status(201).render('home',{user});
    } catch (error) {
      console.error('Error saving user detail:', error);
      res.status(400).send('Error saving user detail');
    }
  });

//make a bhandara
app.get('/make',(req,res)=>{
    res.render('make-bhandara');
})

app.post('/make', upload.single('image'), async (req, res) => {
  const { name, date, time, location, locationName, googleMapLink, description } = req.body;
  console.log(location);
  const imagePath = req.file.filename;

  try {
    // Geocode the location using Mapbox
    const geocodeURL = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(location)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1`;
    const response = await axios.get(geocodeURL);
    const coordinates = response.data.features[0].geometry.coordinates;

    // Create a new Bhandara with the geocoded location and image path
    const bhandara = await Bhandara.create({
      name,
      image: imagePath,
      date,
      time,
      locationName, // Include locationName in the creation
      location: {
        type: 'Point',
        coordinates,
      },
      googleMapLink,
      description,
    });
    const user = req.session.user;

    res.status(201).render('home', { user });
  } catch (error) {
    console.error('Error saving Bhandara:', error);
    res.status(400).json({ error: 'Error saving Bhandara' });
  }
});


app.get("/discover",async(req,res)=>{
  const bhandara=await Bhandara.find({}).sort({ date: -1 });
  
  res.render("discover",{bhandara})

})

app.get("/details/:id",async(req,res)=>{
  const bhandaraData = await Bhandara.findById(req.params.id)
  const lastUser = await UserDetail.find({}).sort({ _id: -1 }).limit(1);
  const userData= lastUser[0];

  const location2=bhandaraData.locationName;
  const location1=userData.location;
  try {
    // Get coordinates for location 1
    const coordinates1 = await getCoordinates(location1);

    // Get coordinates for location 2
    const coordinates2 = await getCoordinates(location2);

    res.render('single-bhandara', { coordinates1, coordinates2 ,bhandaraData});
  } catch (error) {
    console.error('Error getting coordinates:', error.message);
    res.status(500).send('Error getting coordinates');
  }
  
})
async function getCoordinates(location) {
  const mapboxAccessToken = 'pk.eyJ1Ijoic2hpcmlzaDMwIiwiYSI6ImNsdDM5OXZvdzF0MGgybG81emthaWM5OXgifQ.SEbKaymIBb2DYuS85G1VTg'; // Replace with your Mapbox access token
  const geocodingApiUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(location)}.json?access_token=${mapboxAccessToken}`;

  const response = await axios.get(geocodingApiUrl);

  if (response.data.features.length > 0) {
    const coordinates = response.data.features[0].geometry.coordinates;
    return coordinates;
  } else {
    throw new Error(`Coordinates not found for location: ${location}`);
  }
}

