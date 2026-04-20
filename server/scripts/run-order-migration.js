require("dotenv").config();
const mongoose = require("mongoose");
const { initializeSequentialOrderNumbers } = require("./initialize-sequential-orders");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✓ Connected to MongoDB");
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    process.exit(1);
  }
};

const runMigration = async () => {
  try {
    await connectDB();
    await initializeSequentialOrderNumbers();
    console.log("✓ Migration completed successfully!");
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("✗ Migration failed:", error);
    process.exit(1);
  }
};

runMigration();
