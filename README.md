# BluSalt Drones Task Node.js Application

This is a Node.js application that simulates the management of drones and medication. It provides RESTful APIs for registering drones, managing medications, and checking drone status.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [Installation](#installation)
  - [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Seeding Data](#seeding-data)
- [Notes](#notes)

## Prerequisites

Before running the application, make sure you have the following installed on your system:

- Node.js and npm (Node Package Manager): [Download Here](https://nodejs.org/)
- SQLite3: [Download Here](https://www.sqlite.org/download.html)

## Getting Started

### Installation

1. Clone this repository to your local machine:

   git clone https://github.com/Sheikh-X/blusalt-drone-be-task.git

Navigate to the project directory:
cd <project-directory> 2. Install the project dependencies:
npm install
...

### Running the Application

1.  Start the application:
    npm start
    This will start the application on port 3005 by default. You can change the port in the index.js file if needed.
2.  Open your web browser or API client (e.g., Postman) and access the following URLs:

        API Documentation (Swagger UI): http://localhost:3005/api-docs

        Use the provided APIs to manage drones and medications. Refer to the API documentation for details on available endpoints.

    ...

### API Documentation

API documentation is available using Swagger UI. You can access the documentation by visiting http://localhost:3005/api-docs after starting the application.

It is also available on the web via
https://documenter.getpostman.com/view/14245209/2s9YBz3axx

...

### Seeding Data

The application seeds the SQLite database with initial data for drones and medications. This data includes 10 records each. You can find the seeding queries in the index.js file

...

### Notes

1.  For a production application,I would have used an external storage solutions (e.g., S3 bucket or Azure Blob Storage) for storing images instead of storing them as BLOBs in the database.
2.  SQLite is not recommended for a production app, I recommend Postgres database instead.
3.  Due to time contraints I haven't written any tests.
4.  Also due to time constraints, I haven't indluded input data validation and handled cases when the db completed a query but there is no data to return.

All the above and other isssues such as proper separation of routes, logic, database config and connections are suggested improvements that can be added.
