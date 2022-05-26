const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const query = require("express/lib/middleware/query");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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

//Veriying Token

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }

    req.decoded = decoded;
    // console.log(decoded);
    next();
  });
}

async function run() {
  try {
    await client.connect();
    const productCollection = client.db("parts-station").collection("products");
    const orderCollection = client.db("parts-station").collection("orders");
    const userCollection = client.db("parts-station").collection("users");
    const paymentCollection = client.db("parts-station").collection("payment");

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

    //Adding New Product

    app.post("/products", async (req, res) => {
      const newProduct = req.body;
      const result = await productCollection.insertOne(newProduct);
      res.send(result);
    });

    //Deleting product


    app.delete("/delete-product/:id", async (req, res) => {
      const id = req.params.id;
      const qurery = { _id: ObjectId(id) };
      const result = await productCollection.deleteOne(qurery);
      res.send(result);
    });


    //My Orders

    app.get("/myorders/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const decodedEmail = req.decoded.email;
      // console.log(decodedEmail);
      // console.log(email);
      if (email === decodedEmail) {
        const query = { userEmail: email };
        const orders = await orderCollection.find(query).toArray();
        res.send(orders);
      } else {
        return res.status(403).send({ message: "forbidden access" });
      }
    });

    //All Orders [ADMIN]

    app.get("/allorders/", verifyJWT, async (req, res) => {
      
      const orders = await orderCollection.find().toArray();
      res.send(orders);
     
    });

    //Deliver an order

    app.put("/deliver-order/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      // const filter = { email: email };
      const updateDoc = {
        $set: {
          status: "delivered",
        },
      };
      const result = await orderCollection.updateOne(filter, updateDoc);
      res.send(result);
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
    // Issuing Token
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      // console.log("Email", email);
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };

      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1h" }
      );
      res.send({ result, token });
    });

    //Load All Users

    app.get("/users", verifyJWT, async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });

    //Make Admin

    app.put("/user/admin/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    //isAdmin?

    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user.role === "admin";

      res.send({ admin: isAdmin });
    });

    //Update User Profile

    app.put("/profile/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          city: user.city,
          edu: user.edu,
          phone: user.phone,
          linkedin: user.link,
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    //LoadProfile data

    app.get("/profile/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const myprofile = await userCollection.find(query).toArray();
      res.send(myprofile);
    });

    //Add Review

    app.put("/reviews/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          review: user.review,
          rating: user.rating,
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    //Load Order for Payment
    app.get("/order/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const order = await orderCollection.findOne(query);
      res.send(order);
    });

    //Stripe Payment Intent

    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const price = req.body.orderPrice;

      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    });

    //Updating Payment and Storing Payment Informations

    app.patch("/order/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        },
      };

      const result = await paymentCollection.insertOne(payment);
      const updatePayStatus = await orderCollection.updateOne(
        filter,
        updatedDoc
      );
      res.send(updatePayStatus);
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
