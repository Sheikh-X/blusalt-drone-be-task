const express = require("express");
const sqlite3 = require("sqlite3").verbose(); //verbose flag is added to capture all stack traces for each query since I'm running in dev mode and not a prod app

const app = express();
const port = 3005;
const db = new sqlite3.Database(":memory:"); //memory option picked as I'm not persisiting data.

//queries to create  the medication and drone tables
db.serialize(() => {
  //using serialize to ensure the queries run sequentially as defined below
  db.run(`
    CREATE TABLE Drones (
      serialNumber TEXT PRIMARY KEY CHECK(length(serialNumber) <= 100),
      model TEXT CHECK(model IN ('Lightweight', 'Middleweight', 'Cruiserweight', 'Heavyweight')),
      weightLimit REAL CHECK(weightLimit <= 500),
      batteryCapacity REAL CHECK(batteryCapacity >= 0 AND batteryCapacity <= 100),
      state TEXT CHECK(state IN ('IDLE', 'LOADING', 'LOADED', 'DELIVERING', 'DELIVERED', 'RETURNING'))
    )
  `);

  db.run(`
    CREATE TABLE Medication (
      name TEXT PRIMARY KEY CHECK(name GLOB '[A-Za-z0-9_-]*'),
      weight REAL,
      code TEXT CHECK(code GLOB '[A-Z0-9_]*'),
      image BLOB 
    )
  `);
});
//for a production app image will be saved in a storage like s3bucket or azure blob storage with the url and key be saved to the database
//instead of storing it as blob like I have doen above.

app.use(express.json());
app.post("/drones", (req, res) => {
  const { serial_number, model, weight_limit, battery_capacity, state } =
    req.body;
  if (
    !(
      req.body.serial_number &&
      req.body.model &&
      req.body.weight_limit &&
      req.body.battery_capacity &&
      req.body.state
    )
  ) {
    return res.status(400).json({ error: "All parameters are required" });
  }

  db.run(
    `INSERT INTO Drones (serialNumber, model, weightLimit, batteryCapacity, state)
    VALUES (?, ?, ?, ?, ?)`,
    [serial_number, model, weight_limit, battery_capacity, state],
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to register the drone" });
      }
      res.json({ message: "Drone registered successfully" });
    }
  );
});
app.get("/drones/all", (req, res) => {
  db.all(
    `SELECT *
    FROM Drones`,
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to fetch drones" });
      }
      res.json(rows);
    }
  );
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
