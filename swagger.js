const swaggerJSDoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "BluSalt Drones tasl",
      version: "1.0.0",
      description: "API documentation drones task from Blusalt ",
    },
  },

  apis: ["./index.js"],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
