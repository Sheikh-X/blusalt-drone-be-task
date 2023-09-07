const express = require("express");
const sqlite3 = require("sqlite3").verbose(); //verbose flag is added to capture all stack traces for each query since I'm running in dev mode and not a prod app

const app = express();
const port = 3005;
const db = new sqlite3.Database(":memory:");
//memory option picked as I'm not persisiting data.

app.use(express.json());
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
