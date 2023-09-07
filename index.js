const express = require("express");
const sqlite3 = require("sqlite3").verbose(); //verbose flag is added to capture all stack traces for each query since I'm running in dev mode and not a prod app

const app = express();
const port = 3005;
const db = new sqlite3.Database(":memory:"); //memory option picked as I'm not persisiting data.
const multer = require("multer");
const upload = multer();

//queries to create  the medication and drone tables
db.serialize(() => {
  //using serialize to ensure the queries run sequentially as defined below
  db.run(`
    CREATE TABLE IF NOT EXISTS Drones (
      serial_number TEXT PRIMARY KEY CHECK(length(serial_number) <= 100),
      model TEXT CHECK(model IN ('Lightweight', 'Middleweight', 'Cruiserweight', 'Heavyweight')),
      weightLimit REAL CHECK(weightLimit <= 500),
      batteryCapacity REAL CHECK(batteryCapacity >= 0 AND batteryCapacity <= 100),
      state TEXT CHECK(state IN ('IDLE', 'LOADING', 'LOADED', 'DELIVERING', 'DELIVERED', 'RETURNING'))
    )
  `);

  db.run(`
    CREATE TABLE  IF NOT EXISTS Medication (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT CHECK(name GLOB '[A-Za-z0-9_-]*'),
      weight REAL,
      code TEXT CHECK(code GLOB '[A-Z0-9_]*'),
      image BLOB 
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS Drone_medications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      drone_serial_number INTEGER NOT NULL,
      medication_id INTEGER NOT NULL,
      FOREIGN KEY (drone_serial_number) REFERENCES Drones(serial_number),
      FOREIGN KEY (medication_id) REFERENCES Medication(id)
    )
  `);
});
//for a production app image will be saved in a storage like s3bucket or azure blob storage with the url and key be saved to the database
//instead of storing it as blob like I have doen above.

app.use(express.json());
app.post("/drones/register", (req, res) => {
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
  if (state === "LOADING" && battery_capacity < 25) {
    return res.status(400).json({ error: "Drone battery level is below 25%" });
  }
  db.run(
    `INSERT INTO Drones (serial_number, model, weightLimit, batteryCapacity, state)
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
app.get("/medication/all", (req, res) => {
  db.all(
    `SELECT *
    FROM medication`,
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to fetch drones" });
      }
      res.json(rows);
    }
  );
});

app.get("/drones/available", (req, res) => {
  db.all(
    `SELECT *
    FROM drones
    WHERE state = 'IDLE' AND batteryCapacity > 0.25`,
    (err, rows) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .json({ error: "Failed to fetch available drones" });
      }
      res.json(rows);
    }
  );
});
app.get("/drones/:serial_number/battery-level", (req, res) => {
  const serial_number = req.params.serial_number;

  db.get(
    `SELECT batteryCapacity
    FROM drones
    WHERE serial_number = ?`,
    [serial_number],
    (err, row) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .json({ error: "Failed to fetch drone battery level" });
      }
      res.json(row);
    }
  );
});

app.post("/drones/:serial_number/load", upload.single("image"), (req, res) => {
  const serial_number = req.params.serial_number;
  const { name, weight, code } = req.body;
  const image = req.file;

  // Check the state of the drone
  db.get(
    `SELECT state FROM drones WHERE serial_number = ?`,
    [serial_number],
    (err, row) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .json({ error: "Failed to fetch the drone's state" });
      }

      const state = row.state;

      // Check if the drone is in the "IDLE" state
      if (state !== "IDLE") {
        return res.status(400).json({
          error: "Drone is not in the 'IDLE' state and cannot be loaded",
        });
      }

      // Check  weight limit of the drone
      db.get(
        `SELECT weightLimit FROM drones WHERE serial_number = ?`,
        [serial_number],
        (err, row) => {
          if (err) {
            console.error(err);
            return res
              .status(500)
              .json({ error: "Failed to fetch the drone's weight limit" });
          }

          const weightLimit = row.weightLimit;
          console.log(weight, weightLimit);
          if (weight > weightLimit) {
            return res.status(400).json({
              error: "Medication weight exceeds the drone's weight limit",
            });
          }

          // If  weight is within the limit, pload medication
          db.run(
            `INSERT INTO medication (name, weight, code, image)
            VALUES (?, ?, ?, ?)`,
            [name, weight, code, image],
            function (err) {
              if (err) {
                console.error(err);
                return res
                  .status(500)
                  .json({ error: "Failed to load medication" });
              }

              const medicationId = this.lastID;

              db.run(
                `INSERT INTO drone_medications (drone_serial_number, medication_id)
                VALUES (?, ?)`,
                [serial_number, medicationId],
                (err) => {
                  if (err) {
                    console.error(err);
                    return res.status(500).json({
                      error: "Failed to load medication to the drone",
                    });
                  }
                  res.json({ message: "Medication loaded successfully" });
                }
              );
            }
          );
        }
      );
    }
  );
});

app.get("/drones/:serial_number/loaded-medications", (req, res) => {
  const serial_number = req.params.serial_number;

  db.all(
    `SELECT medication.*
     FROM medication
     INNER JOIN drone_medications ON medication.id = drone_medications.medication_id
     WHERE drone_medications.drone_serial_number = ?`,
    [serial_number],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .json({ error: "Failed to fetch loaded medications" });
      }

      res.json(rows);
    }
  );
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
