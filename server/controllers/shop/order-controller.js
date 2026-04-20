const Order = require("../../models/Order");
const Cart = require("../../models/Cart");
const Product = require("../../models/Product");
const mongoose = require("mongoose");
const { imageUploadUtil } = require("../../helpers/cloudinary");
const { getNextSequentialOrderNumber } = require("../../helpers/counter");

const createOrder = async (req, res) => {
  try {
    // Get userId from authenticated user or request body (for backward compatibility)
    // Priority: authenticated user > request body (but validate it matches if both exist)
    let userId;
    
    if (req.user && req.user.id) {
      // User is authenticated via middleware
      userId = req.user.id;
      
      // If userId is also in body, validate it matches authenticated user
      if (req.body.userId && req.body.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: "User ID mismatch. You can only create orders for yourself.",
        });
      }
    } else if (req.body.userId) {
      // Fallback: if no authenticated user but userId in body, use it
      // This allows backward compatibility but should be fixed in frontend
      userId = req.body.userId;
      console.warn("Order created without authentication middleware - userId from request body. This should be fixed.");
    } else {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please log in to place an order.",
      });
    }

    const {
      cartItems,
      addressInfo,
      orderStatus,
      paymentMethod,
      paymentStatus,
      totalAmount,
      orderDate,
      orderUpdateDate,
      cartId,
    } = req.body;

    // Validate required fields
    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart items are required to create an order.",
      });
    }

    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Total amount must be greater than 0.",
      });
    }

    // Validate stock availability first
    if (cartItems && cartItems.length > 0) {
      for (const cartItem of cartItems) {
        const product = await Product.findById(cartItem.productId);
        
        if (!product) {
          return res.status(400).json({
            success: false,
            message: `Product not found: ${cartItem.productId}`,
          });
        }

        // Check if there's enough stock
        if (product.totalStock < cartItem.quantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for "${product.title}". Available: ${product.totalStock}, Requested: ${cartItem.quantity}`,
          });
        }
      }
    }

    // Create order (stock will be reduced when admin confirms the order)
    try {
      // Get next sequential order number
      const sequentialOrderNumber = await getNextSequentialOrderNumber();

      // Create order
      const newlyCreatedOrder = new Order({
        sequentialOrderNumber,
        userId,
        cartId,
        cartItems,
        addressInfo,
        orderStatus,
        paymentMethod,
        paymentStatus,
        totalAmount,
        orderDate,
        orderUpdateDate,
      });

      await newlyCreatedOrder.save();
      
      const orderId = newlyCreatedOrder._id;
      
      // Clear the user's cart after successful order creation
      await Cart.findOneAndDelete({ userId });

      // Populate order with user details for notification
      const populatedOrder = await Order.findById(orderId)
        .populate("userId", "userName email")
        .exec();

      // Emit new order notification to admin room
      const io = req.app.get("io");
      if (io) {
        io.to("admin-room").emit("new-order", {
          orderId: populatedOrder._id,
          userId: populatedOrder.userId?._id,
          userName: populatedOrder.userId?.userName || "Unknown User",
          totalAmount: populatedOrder.totalAmount,
          orderStatus: populatedOrder.orderStatus,
          orderDate: populatedOrder.orderDate,
          cartItems: populatedOrder.cartItems,
          addressInfo: populatedOrder.addressInfo,
        });
      }

      res.status(201).json({
        success: true,
        orderId: orderId,
      });
    } catch (error) {
      console.error("Error creating order:", error);
      console.error("Error details:", error.message, error.stack);
      return res.status(500).json({
        success: false,
        message: `Failed to create order: ${error.message || "Please try again."}`,
      });
    }
  } catch (e) {
    console.log(e);
    res.status(500).json({
      success: false,
      message: "Some error occurred!",
    });
  }
};

const getAllOrdersByUser = async (req, res) => {
  try {
    const userId = req.user.id; // Use authenticated user's ID
    const { archived } = req.query;

    const query = { userId };
    
    // Filter by archived status if provided
    if (archived !== undefined) {
      query.isArchived = archived === "true";
    }

    const orders = await Order.find(query).sort({ orderDate: -1 });

    if (!orders.length) {
      return res.status(404).json({
        success: false,
        message: "No orders found!",
      });
    }

    res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({
      success: false,
      message: "Some error occurred!",
    });
  }
};

const getOrderDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id; // Use authenticated user's ID

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found!",
      });
    }

    // Verify that the order belongs to the authenticated user
    const orderUserId = order.userId?.toString?.() || String(order.userId);
    if (orderUserId !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this order!",
      });
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({
      success: false,
      message: "Some error occurred!",
    });
  }
};

const getOrderDeadlinesByUser = async (req, res) => {
  try {
    const userId = req.user.id; // Use authenticated user's ID

    // Regular users can only see their own deadlines
    // Admins would need to use admin routes to see all deadlines
    const query = { userId };

    // Only include non-archived orders
    query.isArchived = false;

    // Exclude pickedUp orders - they no longer have payment deadlines
    query.orderStatus = { $ne: "pickedUp" };

    const orders = await Order.find(query).select(
      "_id cartItems paymentDeadline orderStatus totalAmount"
    );

    const deadlines = orders
      .filter((o) => o.paymentDeadline)
      .map((o) => ({
        orderId: o._id,
        title: o.cartItems && o.cartItems.length > 0 ? o.cartItems[0].title : `Order ${o._id}`,
        deadline: o.paymentDeadline,
        status: o.orderStatus,
        totalAmount: o.totalAmount,
        cartItems: o.cartItems || [], // Include all cart items
      }))
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

    res.status(200).json({ success: true, data: deadlines });
  } catch (e) {
    console.error("getOrderDeadlinesByUser error", e);
    res.status(500).json({ success: false, message: "Some error occurred!" });
  }
};

const submitPaymentProof = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id; // Use authenticated user's ID

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found!",
      });
    }

    // Verify that the order belongs to the authenticated user
    const orderUserId = order.userId?.toString?.() || String(order.userId);
    if (orderUserId !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to submit payment proof for this order!",
      });
    }

    // Upload payment proof image to Cloudinary
    let paymentProofUrl = null;
    if (req.file) {
      const b64 = Buffer.from(req.file.buffer).toString("base64");
      const url = "data:" + req.file.mimetype + ";base64," + b64;
      const result = await imageUploadUtil(url);
      paymentProofUrl = result.url;
    }

    // Update order with payment proof (payment status remains pending until admin confirms)
    order.paymentProof = paymentProofUrl;
    order.orderUpdateDate = new Date();

    await order.save();

    res.status(200).json({
      success: true,
      message: "Payment proof submitted successfully!",
      data: order,
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({
      success: false,
      message: "Some error occurred!",
    });
  }
};

const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id; // Use authenticated user's ID

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found!",
      });
    }

    // Verify that the order belongs to the authenticated user
    // Handle both ObjectId and string comparisons
    const orderUserId = order.userId?.toString?.() || String(order.userId);
    if (orderUserId !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to cancel this order!",
      });
    }

    // Check if order can be cancelled (only pending, confirmed, or readyForPickup orders can be cancelled)
    const cancellableStatuses = ["pending", "confirmed", "readyForPickup"];
    if (!cancellableStatuses.includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: `Order cannot be cancelled. Current status: ${order.orderStatus}`,
      });
    }

    // Check if order is already cancelled
    if (order.orderStatus === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Order is already cancelled!",
      });
    }

    // Save the original status before updating (needed to determine if stock should be restored)
    const originalStatus = order.orderStatus;

    // Update order status to cancelled
    order.orderStatus = "cancelled";
    order.orderUpdateDate = new Date();

    await order.save();

    // Populate order with user details for notification
    const populatedOrder = await Order.findById(order._id)
      .populate("userId", "userName email")
      .exec();

    // Emit order cancelled notification to admin room
    const io = req.app.get("io");
    if (io) {
      io.to("admin-room").emit("order-cancelled", {
        orderId: populatedOrder._id,
        userId: populatedOrder.userId?._id,
        userName: populatedOrder.userId?.userName || "Unknown User",
        totalAmount: populatedOrder.totalAmount,
        orderStatus: populatedOrder.orderStatus,
        orderDate: populatedOrder.orderDate,
        cancellationReason: populatedOrder.cancellationReason,
        cartItems: populatedOrder.cartItems,
        addressInfo: populatedOrder.addressInfo,
      });
    }

    // Only restore stock if the order was confirmed (stock was reduced on confirmation)
    // Stock is only reduced when order status changes to "confirmed", so we check if
    // the order was in a status that indicates it was confirmed
    const confirmedStatuses = ["confirmed", "readyForPickup", "pickedUp"];
    const wasConfirmed = confirmedStatuses.includes(originalStatus);
    
    if (wasConfirmed) {
      // Restore product stock for each item in the cancelled order
      // Use transaction to ensure atomicity
      let useTransaction = false;
      let session = null;
      
      try {
        session = await mongoose.startSession();
        await session.startTransaction();
        useTransaction = true;
      } catch (transactionError) {
        console.log("[Order Cancel] Transactions not available, using fallback method");
        useTransaction = false;
      }
      
      const restoredProducts = []; // Track products that had stock restored
      
      try {
        if (order.cartItems && order.cartItems.length > 0) {
          for (const cartItem of order.cartItems) {
            const product = useTransaction 
              ? await Product.findById(cartItem.productId).session(session)
              : await Product.findById(cartItem.productId);
            
            if (!product) {
              console.error(`[Order Cancel] Product not found: ${cartItem.productId}`);
              continue; // Skip if product not found
            }

            // Restore the stock atomically
            product.totalStock = (product.totalStock || 0) + cartItem.quantity;
            if (useTransaction) {
              await product.save({ session });
            } else {
              await product.save();
            }
            
            // Track restored product for real-time notification
            restoredProducts.push({
              productId: product._id,
              product: product.toObject(),
              quantityRestored: cartItem.quantity,
            });
          }
        }
        
        if (useTransaction) {
          await session.commitTransaction();
        }
        
        // Emit real-time product updates to all clients
        const io = req.app.get("io");
        if (io && restoredProducts.length > 0) {
          restoredProducts.forEach(({ product, quantityRestored }) => {
            // Emit to admin room
            io.to("admin-room").emit("product-updated", {
              action: "stock-restored",
              product: product,
              quantityRestored: quantityRestored,
              reason: "order-cancelled",
              orderId: order._id,
            });
            
            // Emit to all users (broadcast)
            io.emit("product-updated", {
              action: "stock-restored",
              product: product,
              quantityRestored: quantityRestored,
              reason: "order-cancelled",
            });
          });
          console.log(`[Order Cancel] Emitted stock updates for ${restoredProducts.length} product(s)`);
        }
      } catch (error) {
        if (useTransaction && session) {
          try {
            await session.abortTransaction();
          } catch (abortError) {
            console.error("Error aborting transaction:", abortError);
          }
        }
        console.error(`[Order Cancel] Error restoring stock:`, error);
        // Log but don't fail - order is already cancelled
      } finally {
        if (session) {
          try {
            session.endSession();
          } catch (endError) {
            console.error("Error ending session:", endError);
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      message: "Order cancelled successfully!",
      data: order,
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({
      success: false,
      message: "Some error occurred!",
    });
  }
};

const restoreCancelledOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id; // Use authenticated user's ID

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found!" });
    }

    // Verify that the order belongs to the authenticated user
    const orderUserId = order.userId?.toString?.() || String(order.userId);
    if (orderUserId !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to restore this order!",
      });
    }

    if (order.orderStatus !== "cancelled") {
      return res.status(400).json({ success: false, message: "Only cancelled orders can be restored." });
    }

    // Prevent restoring orders that were cancelled due to failure to pay
    if (order.cancellationReason === "Cancelled due to failure to pay") {
      return res.status(400).json({ 
        success: false, 
        message: "Orders cancelled due to failure to pay cannot be restored." 
      });
    }

    // Note: Stock is NOT reduced when restoring a cancelled order
    // Stock will only be reduced when the admin confirms the order (changes status to "confirmed")
    // This ensures stock is only reduced once when the order is actually confirmed

    order.orderStatus = "pending";
    order.orderUpdateDate = new Date();
    // Clear cancellation reason when restoring
    order.cancellationReason = null;
    await order.save();

    res.status(200).json({ success: true, message: "Order restored successfully.", data: order });
  } catch (e) {
    console.error("restoreCancelledOrder error", e);
    res.status(500).json({ success: false, message: "Some error occurred!" });
  }
};

const deleteCancelledOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id; // Use authenticated user's ID

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found!" });
    }

    // Verify that the order belongs to the authenticated user
    const orderUserId = order.userId?.toString?.() || String(order.userId);
    if (orderUserId !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this order!",
      });
    }

    if (order.orderStatus !== "cancelled") {
      return res.status(400).json({ success: false, message: "Only cancelled orders can be deleted." });
    }

    await Order.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: "Cancelled order deleted permanently." });
  } catch (e) {
    console.error("deleteCancelledOrder error", e);
    res.status(500).json({ success: false, message: "Some error occurred!" });
  }
};

const archiveOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id; // Use authenticated user's ID

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found!",
      });
    }

    // Verify that the order belongs to the authenticated user
    const orderUserId = order.userId?.toString?.() || String(order.userId);
    if (orderUserId !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to archive this order!",
      });
    }

    // Only allow archiving cancelled or pickedUp orders (consistent with admin)
    if (order.orderStatus !== "pickedUp" && order.orderStatus !== "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Only cancelled or picked-up orders can be archived!",
      });
    }

    // Check if order is already archived
    if (order.isArchived) {
      return res.status(400).json({
        success: false,
        message: "Order is already archived!",
      });
    }

    await Order.findByIdAndUpdate(id, { isArchived: true });

    res.status(200).json({
      success: true,
      message: "Order archived successfully!",
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({
      success: false,
      message: "Some error occurred!",
    });
  }
};

const unarchiveOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id; // Use authenticated user's ID

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found!",
      });
    }

    // Verify that the order belongs to the authenticated user
    const orderUserId = order.userId?.toString?.() || String(order.userId);
    if (orderUserId !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to unarchive this order!",
      });
    }

    // Check if order is already unarchived
    if (!order.isArchived) {
      return res.status(400).json({
        success: false,
        message: "Order is not archived!",
      });
    }

    await Order.findByIdAndUpdate(id, { isArchived: false });

    res.status(200).json({
      success: true,
      message: "Order unarchived successfully!",
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({
      success: false,
      message: "Some error occurred!",
    });
  }
};

module.exports = {
  createOrder,
  getAllOrdersByUser,
  getOrderDetails,
  submitPaymentProof,
  cancelOrder,
  archiveOrder,
  unarchiveOrder,
  restoreCancelledOrder,
  deleteCancelledOrder,
  getOrderDeadlinesByUser,
};

