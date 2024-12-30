const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, Collection, ObjectId } = require('mongodb');

// middleWire
app.use(cors());
app.use(express.json());




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
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");


    // rooms related apis
    const roomsCollection = client.db('roomsCollections').collection('rooms');
    const booked = client.db('roomsCollections').collection('bookedRooms');
    const reviews = client.db('roomsCollections').collection('reviews');


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

    app.delete('/bookedRooms/:id', async(req, res) => {
     const id = req.params.id;
     const query = {_id: new ObjectId(id)};
     const result = await booked.deleteOne(query);
     res.send(result)
    })

    app.patch('/bookedRooms/:id', async(req, res) => {
      const  id  = req.params.id; // Get booking ID from params
      const  date  = req.body.date
      const result = await booked.updateOne(
        { _id: new ObjectId(id) }, // Match by ID
        { $set: { date } }
      )
      res.send(result);
    })

    app.get('/bookedRooms', async (req, res) => {
      const email = req.query.email;
      const query = { booked_email: email };
      const result = await booked.find(query).toArray();

      for (const bookedRooms of result) {
        const query1 = { _id: new ObjectId(bookedRooms.booked_id) }
        const rooms = await roomsCollection.findOne(query1);
        if (rooms){
          bookedRooms.type = rooms.type,
          bookedRooms.pricePerNight = rooms.pricePerNight,
          bookedRooms.image = rooms.images

        }
      }
      res.send(result);
    })


    // review 
    app.post('/reviews', async(req, res) => {
      const { roomId } = req.query;
      const query = { roomId };
      const result = await reviews.insertOne(query);
      res.send(result);
    })

    app.get('/reviews', async(req, res) => {
      const result = await reviews.find().toArray()
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