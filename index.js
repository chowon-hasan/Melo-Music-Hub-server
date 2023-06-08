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
    const studentsCollection = client
      .db("meloMusicDb")
      .collection("allStudents");

    // GETITING ALL THE CLASSES DATA FROM DB
    app.get("/classes", async (req, res) => {
      const result = await classes.find().sort({ students: -1 }).toArray();
      res.send(result);
    });

    // GET ALL INSTRUCTOR DATA FROM DB
    app.get("/instructor", async (req, res) => {
      const result = await instructor
        .find()
        .sort({ num_students: -1 })
        .toArray();
      res.send(result);
    });

    // CREATE STUDENTS AS A USER COLLECTION
    app.post("/students", async (req, res) => {
      const student = req.body;
      const query = { email: student.email };
      const existinStudent = await studentsCollection.findOne(query);
      console.log(existinStudent);
      if (existinStudent) {
        return res.send({ message: "user already exits" });
      }
      const result = await studentsCollection.insertOne(student);
      res.send(result);
    });

    // GET ALL STUDENTS FROM DB
    app.get("/allstudents", async (req, res) => {
      const result = await studentsCollection.find().toArray();
      res.send(result);
    });

    // MAKE ADMIN API
    app.patch("/allstudents/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await studentsCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // MAKE instructor API
    app.patch("/allstudents/instructor/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "instructor",
        },
      };
      const result = await studentsCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // GET THE SPECIFIC CLASS DATA FROM DB
    app.get("/addclasses/:id", async (req, res) => {
      const id = req.params.id;
      const result = await addClasses.findOne({ classID: id });
      res.send(result);
    });

    // GET MYCLASSES FROM DB
    app.get("/myclasses/:email", async (req, res) => {
      const result = await addClasses
        .find({ email: req.params.email })
        .toArray();
      res.send(result);
    });

    // DELETED CLASS FROM DB
    app.delete("/myclasses/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = {
        _id: new ObjectId(id),
      };
      const result = await addClasses.deleteOne(query);
      res.send(result);
    });

    // POST DATA IN DB ADD CLASSES FOR A STUDENT
    app.post("/addclasses", async (req, res) => {
      const addClassData = req.body;
      console.log(addClassData);
      const result = await addClasses.insertOne(addClassData);
      res.send(result);
    });

    // set status is db
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
