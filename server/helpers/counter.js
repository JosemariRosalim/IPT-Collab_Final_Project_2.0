const Counter = require("../models/Counter");

async function getNextSequentialOrderNumber() {
  try {
    const counter = await Counter.findByIdAndUpdate(
      "order_seq",
      { $inc: { sequence_value: 1 } },
      { new: true, upsert: true }
    );
    return counter.sequence_value;
  } catch (error) {
    console.error("Error getting next sequential order number:", error);
    throw error;
  }
}

module.exports = {
  getNextSequentialOrderNumber,
};
