const mongoose = require("mongoose");
const Order = require("../models/Order");
const Counter = require("../models/Counter");

const initializeSequentialOrderNumbers = async () => {
  try {
    console.log("Starting sequential order number initialization...");

    // First, remove the unique index to allow re-migration
    try {
      await Order.collection.dropIndex("sequentialOrderNumber_1");
      console.log("✓ Dropped existing unique index on sequentialOrderNumber");
    } catch (error) {
      // Index might not exist, that's fine
      console.log("Note: No existing index to drop");
    }

    // Clear all sequential numbers
    await Order.updateMany({}, { sequentialOrderNumber: null });
    console.log("✓ Cleared existing sequential numbers");

    // Get all orders sorted by creation date (oldest first)
    const allOrders = await Order.find({}).sort({ createdAt: 1 }).exec();
    console.log(`Found ${allOrders.length} existing orders`);

    // Update each order with sequential number
    let sequenceNumber = 1;
    for (const order of allOrders) {
      order.sequentialOrderNumber = sequenceNumber;
      await order.save();
      console.log(`Assigned ORID - ${String(sequenceNumber).padStart(3, "0")} to order ${order._id}`);
      sequenceNumber++;
    }

    // Set the counter to the next number (one after the last order)
    await Counter.findByIdAndUpdate(
      "order_seq",
      { sequence_value: sequenceNumber - 1 },
      { new: true, upsert: true }
    );

    // Recreate the unique index
    await Order.collection.createIndex({ sequentialOrderNumber: 1 }, { unique: true, sparse: true });
    console.log("✓ Recreated unique index on sequentialOrderNumber");

    console.log(`\n✓ Initialization complete!`);
    console.log(`✓ Total orders updated: ${allOrders.length}`);
    console.log(`✓ Next order will be ORID - ${String(sequenceNumber).padStart(3, "0")}`);
  } catch (error) {
    console.error("Error during initialization:", error);
    throw error;
  }
};

module.exports = { initializeSequentialOrderNumbers };
