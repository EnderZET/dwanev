import pkg from 'pg';
const { Pool } = pkg; 
import "dotenv/config"; 


const pool = new Pool({
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASESSS || "dewanev",
});

const poolSkor = new Pool({
  user: process.env.PG2USER,
  password: process.env.PG2PASSWORD,
  host: process.env.PG2HOST,
  port: process.env.PG2PORT,
  database: process.env.PGDATABASESSS || "dewanevScores",
});

pool.connect((err, client, release) => {
  if (err) {
    console.error("Error connecting to PostgreSQL:", err);
  } else {
    console.log("Connected to PostgreSQL");
    release();
  }
});

poolSkor.connect((err, client, release) => {
  if (err) {
    console.error("Error connecting to PostgreSQL Second Database Section:", err);
  } else {
    console.log("Connected to PostgreSQL Second Database Section");
    release();
  }
});

// Export the pools
export { pool, poolSkor };
