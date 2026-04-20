const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    sequentialOrderNumber: {
      type: Number,
      unique: true,
      sparse: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    cartId: {
      type: String,
    },
    cartItems: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        title: String,
        image: String,
        price: Number,
        quantity: {
          type: Number,
          required: true,
        },
      },
    ],
    addressInfo: {
      addressId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Address",
      },
      address: String,
      city: String,
      pincode: String,
      phone: String,
      notes: String,
    },
    orderStatus: {
      type: String,
      enum: ["pending", "confirmed", "readyForPickup", "pickedUp", "cancelled"],
      default: "pending",
    },
    paymentMethod: String,
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    paymentProof: {
      type: String,
      default: null,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    orderDate: {
      type: Date,
      default: Date.now,
    },
    orderUpdateDate: {
      type: Date,
      default: Date.now,
    },
    confirmationDate: {
      type: Date,
      default: null,
    },
    paymentDeadline: {
      type: Date,
      default: null,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    cancellationReason: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Add indexes for frequently queried fields
OrderSchema.index({ userId: 1 });
OrderSchema.index({ paymentDeadline: 1 });
OrderSchema.index({ orderStatus: 1 });
OrderSchema.index({ isArchived: 1 });
OrderSchema.index({ userId: 1, isArchived: 1 }); // Compound index for user orders

module.exports = mongoose.model("Order", OrderSchema);

