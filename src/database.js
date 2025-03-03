const mysql = require ('mysql2')
const dotenv = require('dotenv').config();

const urlDatabase = `mysql://${process.env.MYSQLUSER}:${process.env.MYSQLPASSOWRD}@${process.env.MYSQLHOST}:${process.env.MYSQLPORT}/${process.env.MYSQLDATABASE}`
const connection = mysql.createConnection(urlDatabase);

connection.connect((err) => {
    if(err) {
        console.log(err);
    } else {
        console.log("Connected to MySQL");
    }
});

module.exports = connection;
