import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Dialog } from "../ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import ShoppingOrderDetailsView from "./order-details";
import { useDispatch, useSelector } from "react-redux";
import {
  getAllOrdersByUserId,
  getOrderDetails,
  resetOrderDetails,
  cancelOrder,
} from "@/store/shop/order-slice";
import { addToCart, fetchCartItems } from "@/store/shop/cart-slice";
import { formatCurrency, formatOrderId } from "@/lib/utils";
import { Badge } from "../ui/badge";
import { useNavigate } from "react-router-dom";
import {
  Receipt,
  Trash2,
  X,
  Clock,
  AlertTriangle,
  ArrowLeft,
  ShoppingCart,
} from "lucide-react";
import ShoppingRecycleBin from "./recycle-bin";
import { useToast } from "../ui/use-toast";

function ShoppingOrders() {
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useSelector((state) => state.auth);
  const { orderList, orderDetails } = useSelector((state) => state.shopOrder);
  
  const handleViewPayment = (orderId) => {
    navigate(`/shop/payment-success?orderId=${orderId}`);
  };

  function handleFetchOrderDetails(getId) {
    dispatch(getOrderDetails(getId));
  }

  const handleCancelOrder = async (orderId) => {
    // Confirm cancellation with user
    if (!window.confirm("Are you sure you want to cancel this order?")) {
      return;
    }

    try {
      const result = await dispatch(
        cancelOrder({ id: orderId, userId: user.id })
      ).unwrap();

      toast({
        title: "Order Cancelled",
        description: result.message || "Your order has been cancelled successfully.",
        variant: "success",
      });
      // Refresh the orders list
      dispatch(getAllOrdersByUserId({ userId: user.id }));
    } catch (error) {
      // When using .unwrap() with rejectWithValue, the error is the exact value passed to rejectWithValue
      // which is error.response?.data from axios, typically {success: false, message: "..."}
      let errorMessage = "Failed to cancel order. Please try again.";
      
      if (error?.message) {
        // Direct message property
        errorMessage = error.message;
      } else if (typeof error === "string") {
        // If error is a string
        errorMessage = error;
      } else if (error?.response?.data?.message) {
        // If error has nested response structure
        errorMessage = error.response.data.message;
      }
      
      toast({
        title: "Cancellation Failed",
        description: errorMessage,
        variant: "destructive",
      });
      console.error("Cancel order error:", error);
    }
  };

  // Check if an order can be cancelled (pending only)
  // Note: This matches the backend validation in order-controller.js
  const canCancelOrder = (orderStatus) => {
    const cancellableStatuses = ["pending"];
    return cancellableStatuses.includes(orderStatus);
  };

  // Calculate payment deadline status for an order
  const getPaymentDeadlineStatus = (order) => {
    // Don't show deadline for readyForPickup or pickedUp orders
    if (order?.orderStatus === "readyForPickup" || order?.orderStatus === "pickedUp") {
      return null;
    }
    if (!order?.paymentDeadline || order?.paymentStatus !== "pending") return null;
    
    const deadline = new Date(order.paymentDeadline);
    const now = new Date();
    const timeDiff = deadline.getTime() - now.getTime();
    const hoursRemaining = Math.ceil(timeDiff / (1000 * 60 * 60));
    const isExpired = timeDiff < 0;
    const isUrgent = timeDiff > 0 && timeDiff <= 24 * 60 * 60 * 1000; // Less than 24 hours
    const isWarning = timeDiff > 0 && timeDiff <= 2 * 24 * 60 * 60 * 1000; // Less than 2 days

    return { deadline, hoursRemaining, isExpired, isUrgent, isWarning };
  };

  // Reset order details on component mount to prevent unwanted dialog popup
  useEffect(() => {
    dispatch(resetOrderDetails());
  }, [dispatch]);

  useEffect(() => {
    if (user?.id) {
      dispatch(getAllOrdersByUserId({ userId: user.id }));
    }
  }, [dispatch, user?.id]);

  useEffect(() => {
    if (orderDetails !== null) setOpenDetailsDialog(true);
  }, [orderDetails]);

  console.log(orderDetails, "orderDetails");

  const activeOrders =
    orderList?.filter(
      (order) =>
        order.orderStatus !== "pickedUp" && order.orderStatus !== "cancelled"
    ) || [];

  const cancelledOrders =
    orderList?.filter((order) => order.orderStatus === "cancelled") || [];

  const getPrimaryItem = (order) => {
    const firstItem = order?.cartItems?.[0];
    return {
      image: firstItem?.image,
      title: firstItem?.title || "Item",
    };
  };

  const getTotalQuantity = (order) =>
    Array.isArray(order?.cartItems)
      ? order.cartItems.reduce((sum, item) => sum + (item?.quantity || 0), 0)
      : 0;

  const handleBuyAgain = async (order) => {
    if (!order?.cartItems || order.cartItems.length === 0) {
      toast({
        title: "No items to add to cart",
        variant: "destructive",
      });
      return;
    }

    setProcessingId(order._id);
    try {
      const promises = order.cartItems.map((item) =>
        dispatch(
          addToCart({
            userId: user?.id,
            productId: item.productId,
            quantity: item.quantity,
          })
        )
      );

      await Promise.all(promises);
      await dispatch(fetchCartItems(user?.id));

      toast({
        title: `Added ${order.cartItems.length} item(s) to cart`,
        variant: "success",
      });
      navigate("/shop/checkout");
    } catch (error) {
      toast({
        title: "Some items could not be added",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{showCancelled ? "Cancelled Orders" : "Order History"}</CardTitle>
          <Button
            variant={showCancelled ? "default" : "outline"}
            size="sm"
            onClick={() => setShowCancelled(!showCancelled)}
            className="flex items-center gap-2"
          >
            {showCancelled ? (
              <>
                <ArrowLeft className="h-4 w-4" />
                Back to Orders
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                View Cancelled
              </>
            )}
          </Button>
        </div>
        {!showCancelled && (
          <p className="text-sm text-muted-foreground mt-2">
            Track active orders. Cancelled orders move to your recycle bin.
          </p>
        )}
      </CardHeader>
      <CardContent>
        {showCancelled ? (
          cancelledOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground space-y-2">
              <p>No cancelled orders yet.</p>
              <p className="text-sm">Cancelled orders and orders cancelled due to failure to pay will appear here.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {cancelledOrders.map((order) => (
                <div
                  key={order._id}
                  className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex items-center justify-center">
                        {getPrimaryItem(order).image ? (
                          <img
                            src={getPrimaryItem(order).image}
                            alt={getPrimaryItem(order).title}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <span className="text-sm font-semibold text-muted-foreground">
                            {getPrimaryItem(order).title?.charAt(0)?.toUpperCase() || "P"}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="font-medium">Order ID:</span>
                          <span className="font-semibold break-all">{formatOrderId(order._id, order.sequentialOrderNumber)}</span>
                        </div>
                        <p className="text-sm font-semibold text-foreground">
                          {getPrimaryItem(order).title}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {order.cancellationReason && (
                        <Badge className="bg-red-600 hover:bg-red-700 text-white">
                          {order.cancellationReason}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        Qty: {getTotalQuantity(order)}
                      </Badge>
                      <span className="text-lg font-bold text-primary">
                        ₱{formatCurrency(order.totalAmount)}
                      </span>
                    </div>
                  </div>
                  {/* Products - match Purchase History layout */}
                  <div className="space-y-3">
                    {order.cartItems?.map((item, index) => (
                      <div
                        key={index}
                        className="flex flex-col sm:flex-row gap-4 p-3 bg-muted/30 rounded-lg"
                      >
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-20 h-20 object-contain rounded bg-background"
                        />
                        <div className="flex-1 space-y-2">
                          <h3 className="font-semibold">{item.title}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Quantity: {item.quantity}</span>
                            <span>Price: ₱{formatCurrency(item.price)}</span>
                            <span className="font-semibold text-foreground">
                              Total: ₱{formatCurrency(item.price * item.quantity)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Cancelled on:</span>
                      <span>
                        {order.orderUpdateDate?.split("T")[0] ||
                          order.orderDate?.split("T")[0]}
                      </span>
                    </div>

                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex items-center gap-2"
                      onClick={() => handleBuyAgain(order)}
                      disabled={processingId === order._id}
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Buy Again
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : activeOrders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No active orders found.</p>
            <p className="text-sm mt-2">
              Picked up orders can be found in your Purchase History.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {activeOrders.map((orderItem) => {
              const deadlineStatus = getPaymentDeadlineStatus(orderItem);
              const orderDate = orderItem?.orderDate ? new Date(orderItem.orderDate).toLocaleDateString() : "";
              const pickedUpDate = orderItem?.orderStatus === "pickedUp" && orderItem?.orderUpdateDate 
                ? new Date(orderItem.orderUpdateDate).toLocaleDateString() 
                : null;
              
              return (
                <div
                  key={orderItem?._id}
                  className="border rounded-lg p-4 space-y-4 hover:shadow-md transition-shadow bg-white"
                >
                  {/* Header Section */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-muted-foreground">Order ID:</span>
                        <span className="font-semibold">{formatOrderId(orderItem?._id, orderItem?.sequentialOrderNumber)}</span>
                      </div>
                      {pickedUpDate ? (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-muted-foreground">Picked up on:</span>
                          <span>{pickedUpDate}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-muted-foreground">Placed on:</span>
                          <span>{orderDate}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {orderItem?.orderStatus === "pickedUp" && (
                        <Badge className="bg-green-500 hover:bg-green-600 text-white">
                          Picked Up
                        </Badge>
                      )}
                      {orderItem?.paymentStatus === "paid" && (
                        <Badge className="bg-green-500 hover:bg-green-600 text-white">
                          Paid
                        </Badge>
                      )}
                      {orderItem?.isArchived && (
                        <Badge variant="outline" className="border-orange-500 text-orange-500">
                          Archived
                        </Badge>
                      )}
                      {orderItem?.orderStatus !== "pickedUp" && (
                        <Badge
                          className={`py-1 px-3 ${
                            orderItem?.orderStatus === "pending"
                              ? "bg-yellow-500 hover:bg-yellow-600"
                              : orderItem?.orderStatus === "confirmed"
                              ? "bg-blue-500 hover:bg-blue-600"
                              : orderItem?.orderStatus === "readyForPickup"
                              ? "bg-purple-500 hover:bg-purple-600"
                              : "bg-secondary hover:bg-accent text-foreground"
                          }`}
                        >
                          {orderItem?.orderStatus === "readyForPickup"
                            ? "Ready for Pickup"
                            : orderItem?.orderStatus?.charAt(0).toUpperCase() +
                              orderItem?.orderStatus?.slice(1)}
                        </Badge>
                      )}
                      <span className="text-lg font-bold text-primary ml-auto">
                        ₱{formatCurrency(orderItem?.totalAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Payment Deadline (if applicable) */}
                  {deadlineStatus && (
                    <div className="space-y-2 text-sm pb-2 border-b">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Payment Deadline:</span>
                        <span
                          className={`inline-flex items-center gap-1 ${
                            deadlineStatus.isExpired
                              ? "text-red-600 font-semibold"
                              : deadlineStatus.isUrgent
                              ? "text-orange-600 font-semibold"
                              : deadlineStatus.isWarning
                              ? "text-yellow-600 font-semibold"
                              : "text-muted-foreground"
                          }`}
                        >
                          <Clock className="h-4 w-4" />
                          {deadlineStatus.isExpired
                            ? "Expired"
                            : deadlineStatus.isUrgent
                            ? `${deadlineStatus.hoursRemaining}h left`
                            : deadlineStatus.deadline.toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Products */}
                  <div className="space-y-3">
                    {orderItem.cartItems?.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-4 py-3 border-b last:border-b-0"
                      >
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-16 h-16 object-contain rounded bg-muted/30 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm sm:text-base mb-2">{item.title}</h3>
                          <div className="flex flex-wrap items-center gap-4 text-sm">
                            <span className="text-muted-foreground"><span className="font-medium">Quantity:</span> {item.quantity}</span>
                            <span className="text-muted-foreground"><span className="font-medium">Price:</span> ₱{formatCurrency(item.price)}</span>
                            <span className="font-semibold text-foreground">
                              <span className="font-medium">Total:</span> ₱{formatCurrency(item.price * item.quantity)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 flex flex-col sm:flex-row gap-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFetchOrderDetails(orderItem?._id)}
                    >
                      View Details
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewPayment(orderItem?._id)}
                    >
                      <Receipt className="h-4 w-4 mr-1" />
                      Receipt
                    </Button>
                    {canCancelOrder(orderItem?.orderStatus) && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleCancelOrder(orderItem?._id)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel Order
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <Dialog
          open={openDetailsDialog}
          onOpenChange={() => {
            setOpenDetailsDialog(false);
            dispatch(resetOrderDetails());
          }}
        >
          <ShoppingOrderDetailsView orderDetails={orderDetails} />
        </Dialog>
      </CardContent>
    </Card>
  );
}

export default ShoppingOrders;
