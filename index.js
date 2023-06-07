const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@clustermain.vdf6goj.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const classes = client.db("meloMusicDb").collection("musicClasses");
    const instructor = client.db("meloMusicDb").collection("instructor");
    const addClasses = client.db("meloMusicDb").collection("addClasses");

    app.get("/classes", async (req, res) => {
      const result = await classes.find().sort({ students: -1 }).toArray();
      res.send(result);
    });

    app.get("/instructor", async (req, res) => {
      const result = await instructor
        .find()
        .sort({ num_students: -1 })
        .toArray();
      res.send(result);
    });

    app.post("/addclasses", async (req, res) => {
      const classes = req.body;
      console.log(classes);
      const result = await addClasses.insertOne(classes);
      res.send(result);
    });

    app.patch("/addclasses/:id", async (req, res) => {
      const id = req.params.id;
      const status = req.body.status;
      const filter = { classID: id };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          status: status,
        },
      };
      const result = await addClasses.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Melo music server is on");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
