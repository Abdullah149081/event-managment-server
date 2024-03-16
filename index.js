const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection URL
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function run() {
  try {
    // Connect to MongoDB
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("eventsDB");
    const eventsCollection = db.collection("events");

    // Routes
    /* 
      events Route
    */
    app.get("/events", async (req, res) => {
      try {
        const limit = parseInt(req.query.limit);

        const results = await eventsCollection
          .find({ isDeleted: false })
          .sort({ createdAt: -1, updatedAt: -1 })
          .limit(limit)
          .project({ isDeleted: 0, updatedAt: 0, deletedAt: 0, createdAt: 0 })
          .toArray();

        if (results.length === 0) {
          return res.status(404).json({ message: "No events found" });
        }

        res.json(results);
      } catch (error) {
        console.error("Error fetching events:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    app.post("/events", async (req, res) => {
      try {
        const event = req.body;
        event.createdAt = new Date();
        event.isDeleted = false;
        const result = await eventsCollection.insertOne(event);

        if (result.acknowledged === true) {
          res.json({
            message: "Event created successfully",
            data: result
          });
        } else {
          res.status(500).json({ message: "Failed to create event" });
        }
      } catch (error) {
        console.error("Error creating event:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    app.put("/events/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const updatedEvent = req.body;
        console.log("updatedEvent", updatedEvent);
        const filter = { _id: new ObjectId(id) };
        const options = { upsert: true };
        const updateDoc = {
          $set: {
            ...updatedEvent,
            updatedAt: new Date(),
          },
        };

        const result = await eventsCollection.updateOne(
          filter,
          updateDoc,
          options
        );

        if (result.modifiedCount === 0 && result.upsertedCount === 0) {
          return res.status(404).json({ message: "Event not found" });
        }

        res.json({
          message: "Event updated successfully",
          data: result,
        });
      } catch (error) {
        console.error("Error updating event:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    app.delete("/events/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            isDeleted: true,
            deletedAt: new Date(),
          },
        };

        const result = await eventsCollection.updateOne(filter, updateDoc);

        if (result.modifiedCount === 0) {
          return res.status(404).json({ message: "Event not found" });
        }

        res.json({
          message: "Event deleted successfully",
          data: result,
        });
      } catch (error) {
        console.error("Error deleting event:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    // Start the server
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  } finally {
  }
}

run().catch(console.dir);

// Test route
app.get("/", (req, res) => {
  const serverStatus = {
    message: "Server is running smoothly",
    timestamp: new Date(),
  };
  res.json(serverStatus);
});
