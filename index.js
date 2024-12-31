const express = require('express');
const cors = require('cors');
const app = express();
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser');
require('dotenv').config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, Collection, ObjectId } = require('mongodb');

// middleWire
app.use(cors({
  origin: ['http://localhost:5173',
    'https://hotel-booking-65296.web.app',
    'https://hotel-booking-65296.firebaseapp.com'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' })
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'unauthorized access' })
    }
    req.user = decoded;

    next();
  })
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.yw20g.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");




    // rooms related apis
    const roomsCollection = client.db('roomsCollections').collection('rooms');
    const booked = client.db('roomsCollections').collection('bookedRooms');
    const reviews = client.db('roomsCollections').collection('reviews');


    // auth related apis
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '5hr' });

      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? "none" : 'strict',
        })
        .send({ success: true })
    })

    app.post('/logout', (req, res) => {
      res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', 
        sameSite: process.env.NODE_ENV === 'production' ? "none" : 'strict',
      })
        .send({ success: true })
    })


    // room apis-----
    app.get('/rooms', async (req, res) => {
      const cursor = roomsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get('/rooms/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await roomsCollection.findOne(query);
      res.send(result)
    })


    // booking related apis
    app.post('/bookedRooms', async (req, res) => {
      const bookedRooms = req.body;
      const result = await booked.insertOne(bookedRooms);
      res.send(result);
    })

    app.delete('/bookedRooms/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await booked.deleteOne(query);
      res.send(result)
    })

    app.patch('/bookedRooms/:id', async (req, res) => {
      const id = req.params.id; // Get booking ID from params
      const date = req.body.date
      const result = await booked.updateOne(
        { _id: new ObjectId(id) }, // Match by ID
        { $set: { date } }
      )
      res.send(result);
    })

    app.get('/bookedRooms/all', async (req, res) => {
      const result = await booked.find().toArray()
      res.send(result)
    })

    app.get('/bookedRooms', verifyToken, async (req, res) => {
      const email = req.query.email;
      const query = { booked_email: email };

      // token email !== query email
      if (req.user.email !== req.query.email) {
        return res.send(403).send({ message: 'forbidden access' })
      }

      const result = await booked.find(query).toArray();

      for (const bookedRooms of result) {
        const query1 = { _id: new ObjectId(bookedRooms.booked_id) }
        const rooms = await roomsCollection.findOne(query1);
        if (rooms) {
          bookedRooms.type = rooms.type,
            bookedRooms.pricePerNight = rooms.pricePerNight,
            bookedRooms.image = rooms.images

        }
      }
      res.send(result);
    })





    // review 
    app.post('/reviews', async (req, res) => {
      const { roomId, review, email, rating } = req.body;

      const result = await reviews.insertOne({ roomId, review, email, createdAt: new Date(), rating });
      res.send(result);
    })

    app.get('/reviews', async (req, res) => {
      const result = await reviews.find().sort({createdAt: - 1}).toArray()
      res.send(result)
    })


  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('server is running')
})

app.listen(port, () => {
  console.log(`server is running: ${port}`)
})