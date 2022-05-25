const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const query = require("express/lib/middleware/query");
require("dotenv").config();

const port = process.env.PORT || 5000;

const app = express();

app.use(cors());
app.use(express.json());

//MongoDB Connection

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tpxgr.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    await client.connect();
    const productCollection = client.db("parts-station").collection("products");
    const orderCollection = client.db("parts-station").collection("orders");
    const userCollection = client.db("parts-station").collection("users");

    app.get("/products", async (req, res) => {
      const query = {};
      const cursor = productCollection.find(query);
      const products = await cursor.toArray();
      res.send(products);
    });

    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const product = await productCollection.findOne(query);
      res.send(product);
    });

    //Posing Orders

    app.post("/orders", async (req, res) => {
      const newOrder = req.body;
      const result = await orderCollection.insertOne(newOrder);
      res.send(result);
    });

    //My Orders

    app.get("/myorders/:email", async (req, res) => {
      const email = req.params.email;
      const query = { userEmail: email };
      const orders = await orderCollection.find(query).toArray();
      res.send(orders);
    });

    //Reviews

    app.get("/reviews", async (req, res) => {
      const query = {};
      const reviews = await userCollection.find(query).toArray();
      res.send(reviews);
    });

    //My Reviews

    app.get("/reviews/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const myreview = await userCollection.find(query).toArray();
      res.send(myreview);
    });

    //Add User
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    //Load All Users

    app.get("/users",async(req,res)=>{
      const users=await userCollection.find().toArray();
      res.send(users);
    })

    //Make Admin

    app.put("/user/admin/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updateDoc = {
        $set: {
          role:"admin",
        }
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    //isAdmin?

    app.get("/admin/:email",async (req,res)=>{
      const email=req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user.role === "admin";

      res.send({ admin: isAdmin });
    })



    //Add Review

    app.put("/reviews/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          review:user.review,
          rating:user.rating,
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });




  } finally {
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server Running.....");
});

app.listen(port, () => {
  console.log("Listening to Port:", port);
});
