const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(
  "sk_test_51NH4wNKdNra7hC8Aucq5NhdAT5CqWjCx1cskUbNJ8I9Hap23ywnny4fsZ7oLK8rr7OcpuvSuqa3yCxilUS0BdTMR00LhtvjpK2"
);
const jwt = require("jsonwebtoken");
require("dotenv").config();

app.use(cors());
app.use(express.json());

// MIDDLEWARE
const verifyJWT = (req, res, next) => {
  const author = req.headers.author;
  if (!author) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }

  const token = author.split(" ")[1];

  jwt.verify(token, process.env.JWT_TOKEN, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

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
    const enrolledClass = client
      .db("meloMusicDb")
      .collection("enrolledclasses");

    //JWT token
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

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

    // CHECK ADMIN OR NOT
    app.get("/allstudents/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await studentsCollection.findOne(query);
      const result = {
        admin: user?.role === "admin",
        instructor: user?.role === "instructor",
        student: user?.role === "student",
      };
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
      const email = req.params.email;

      // const decodedEmail = req.decoded.email;
      // if (email !== decodedEmail) {
      //   return res
      //     .status(403)
      //     .send({ error: true, message: "Forbidden acces" });
      // }
      const query = { email: email };

      const result = await addClasses.find(query).toArray();
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
      const result = await addClasses.insertOne(addClassData);
      res.send(result);
    });

    // PAYMENT METHOD -- CREATE INTENT
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = await req.body;
      const amount = price * 100 || 100;
      console.log(amount);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // ENROLLED DATA POST ON DB
    app.post("/myenrolled", async (req, res) => {
      const enrolledData = req.body;
      const result = await enrolledClass.insertOne(enrolledData);
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
