const express = require("express");
const sqlite3 = require("sqlite3").verbose(); //verbose flag is added to capture all stack traces for each query since I'm running in dev mode and not a prod app

const app = express();
const port = 3005;
const db = new sqlite3.Database(":memory:"); //memory option picked as I'm not persisiting data.
const multer = require("multer");
const upload = multer();
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");

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

  //seed data
  db.run(`
INSERT INTO Drones (serial_number, model, weightLimit, batteryCapacity, state)
VALUES
  ('BluSalt001', 'Lightweight', 250, 80, 'IDLE'),
  ('BluSalt002', 'Middleweight', 350, 70, 'LOADING'),
  ('BluSalt003', 'Cruiserweight', 400, 90, 'LOADED'),
  ('BluSalt004', 'Heavyweight', 500, 60, 'DELIVERING'),
  ('BluSalt005', 'Lightweight', 300, 75, 'DELIVERED'),
  ('BluSalt006', 'Middleweight', 200, 85, 'RETURNING'),
  ('BluSalt007', 'Cruiserweight', 450, 50, 'IDLE'),
  ('BluSalt008', 'Heavyweight', 480, 95, 'LOADING'),
  ('BluSalt009', 'Lightweight', 280, 65, 'LOADED'),
  ('BluSalt010', 'Middleweight', 420, 70, 'DELIVERING');


INSERT INTO Medication (name, weight, code, image)
VALUES
  ('Med1', 5.2, 'ABC123', NULL),
  ('Med2', 3.8, 'XYZ789', NULL),
  ('Med3', 4.5, 'PQR456', NULL),
  ('Med4', 6.1, 'LMN987', NULL),
  ('Med5', 2.3, 'DEF321', NULL),
  ('Med6', 7.0, 'JKL654', NULL),
  ('Med7', 4.9, 'GHI987', NULL),
  ('Med8', 3.4, 'UVW234', NULL),
  ('Med9', 5.8, 'STU567', NULL),
  ('Med10', 6.5, 'OPQ890', NULL);


INSERT INTO Drone_medications (drone_serial_number, medication_id)
VALUES
  ('BluSalt001', 1),
  ('BluSalt002', 2),
  ('BluSalt003', 3),
  ('BluSalt004', 4),
  ('BluSalt005', 5),
  ('BluSalt006', 6),
  ('BluSalt007', 7),
  ('BluSalt008', 8),
  ('BluSalt009', 9),
  ('BluSalt010', 10);
`);
});
//for a production app image will be saved in a storage like s3bucket or azure blob storage with the url and key be saved to the database
//instead of storing it as blob like I have doen above.

app.use(express.json());
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * /drones/register:
 *   post:
 *     summary: Register a new drone.
 *     tags:
 *       - Drones
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               serial_number:
 *                 type: string
 *               model:
 *                 type: string
 *               weight_limit:
 *                 type: number
 *               battery_capacity:
 *                 type: number
 *               state:
 *                 type: string
 *                 enum: [IDLE, LOADING, LOADED, DELIVERING, DELIVERED, RETURNING]
 *     responses:
 *       200:
 *         description: Drone registered successfully.
 *       400:
 *         description: Bad request.
 *       500:
 *         description: Internal server error.
 */
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

/**
 * @swagger
 * /medication/all:
 *   get:
 *     summary: Get a list of all medications.
 *     tags:
 *       - Medication
 *     responses:
 *       200:
 *         description: A list of medications.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   weight:
 *                     type: number
 *                   code:
 *                     type: string
 *                   image:
 *                     type: string
 *     500:
 *       description: Internal server error.
 */
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

/**
 * @swagger
 * /drones/available:
 *   get:
 *     summary: Get a list of available drones.
 *     tags:
 *       - Drones
 *     responses:
 *       200:
 *         description: A list of available drones.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   serial_number:
 *                     type: string
 *                   model:
 *                     type: string
 *                   weightLimit:
 *                     type: number
 *                   batteryCapacity:
 *                     type: number
 *                   state:
 *                     type: string
 *     500:
 *       description: Internal server error.
 */
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

/**
 * @swagger
 * /drones/{serial_number}/battery-level:
 *   get:
 *     summary: Get the battery level of a specific drone.
 *     tags:
 *       - Drones
 *     parameters:
 *       - in: path
 *         name: serial_number
 *         required: true
 *         schema:
 *           type: string
 *         description: Serial number of the drone.
 *     responses:
 *       200:
 *         description: Battery level of the drone.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 batteryCapacity:
 *                   type: number
 *       500:
 *         description: Internal server error.
 */
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

/**
 * @swagger
 * /drones/{serial_number}/load:
 *   post:
 *     summary: Load medication onto a specific drone.
 *     tags:
 *       - Drones
 *     parameters:
 *       - in: path
 *         name: serial_number
 *         required: true
 *         schema:
 *           type: string
 *         description: Serial number of the drone.
 *       - in: formData
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the medication.
 *       - in: formData
 *         name: weight
 *         required: true
 *         schema:
 *           type: number
 *         description: Weight of the medication.
 *       - in: formData
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Code of the medication.
 *       - in: formData
 *         name: image
 *         type: file
 *         required: true
 *         description: Image of the medication.
 *     responses:
 *       200:
 *         description: Medication loaded successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request, e.g., drone not in IDLE state or medication weight exceeds drone's limit.
 *       500:
 *         description: Internal server error.
 */
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

/**
 *  * @swagger
 * /drones/{serial_number}/loaded-medications:
 *   get:
 *     summary: Get a list of medications loaded onto a specific drone.
 *     tags:
 *       - Drones
 *     parameters:
 *       - in: path
 *         name: serial_number
 *         required: true
 *         schema:
 *           type: string
 *         description: Serial number of the drone.
 *     responses:
 *       200:
 *         description: A list of medications loaded onto the drone.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   weight:
 *                     type: number
 *                   code:
 *                     type: string
 *                   image:
 *                     type: string
 *       500:
 *         description: Internal server error.
 */
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
