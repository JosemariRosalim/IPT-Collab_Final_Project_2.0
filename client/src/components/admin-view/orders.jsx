import { useEffect, useState, useRef } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Dialog, DialogContent } from "../ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import AdminOrderDetailsView from "./order-details";
import { useDispatch, useSelector } from "react-redux";
import {
  getAllOrdersForAdmin,
  getOrderDetailsForAdmin,
  resetOrderDetails,
  archiveOrder,
} from "@/store/admin/order-slice";
import { Badge } from "../ui/badge";
import { ArrowLeft, Trash2, Clock, AlertTriangle, Archive, Sparkles } from "lucide-react";
import { io } from "socket.io-client";
import { useToast } from "../ui/use-toast";
import { formatOrderId, formatCurrency } from "@/lib/utils";

function AdminOrdersView() {
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [openArchiveDialog, setOpenArchiveDialog] = useState(false);
  const [orderToArchive, setOrderToArchive] = useState(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [viewMode, setViewMode] = useState("all"); // "all", "cancelled", "archive"
  const [seenOrders, setSeenOrders] = useState(new Set()); // Track orders admin has seen
  const [newOrderIds, setNewOrderIds] = useState(new Set()); // Track order IDs that came in via socket (new orders)
  const { orderList, orderDetails } = useSelector((state) => state.adminOrder);
  const dispatch = useDispatch();
  const socketRef = useRef(null);
  const { toast } = useToast();

  function handleFetchOrderDetails(getId) {
    dispatch(getOrderDetailsForAdmin(getId));
  }

  useEffect(() => {
    // Pass view mode to backend: "cancelled" for cancelled/overdue, "archive" for archived, "all" for active
    const archivedParam = viewMode === "cancelled" ? "true" : viewMode === "archive" ? "archive" : "false";
    dispatch(getAllOrdersForAdmin(archivedParam));
  }, [dispatch, viewMode]);

  // Mark all initially loaded orders as "seen" so they don't show as "new"
  useEffect(() => {
    if (orderList && orderList.length > 0) {
      const orderIds = orderList
        .filter(order => {
          if (!order?._id) return false;
          const orderIdStr = String(order._id);
          // Only mark as seen if it's not a new order (not in newOrderIds)
          return !newOrderIds.has(orderIdStr);
        })
        .map(order => String(order._id)); // Convert to string
      
      if (orderIds.length > 0) {
        setSeenOrders(prev => {
          const updated = new Set(prev);
          orderIds.forEach(id => updated.add(id));
          return updated;
        });
      }
    }
  }, [orderList, newOrderIds]);

  console.log(orderDetails, "orderList");

  useEffect(() => {
    if (orderDetails !== null) setOpenDetailsDialog(true);
  }, [orderDetails]);

  // Set up socket connection for real-time order updates
  useEffect(() => {
    // Connect to WebSocket server
    socketRef.current = io("http://localhost:5000", {
      transports: ["websocket"],
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("[Admin Orders] Connected to WebSocket server");
      // Join admin room to receive notifications
      socket.emit("join-admin-room");
    });

    socket.on("disconnect", () => {
      console.log("[Admin Orders] Disconnected from WebSocket server");
    });

    // Listen for new order events
    socket.on("new-order", (orderData) => {
      console.log("[Admin Orders] New order received:", orderData);
      
      // Mark this order as "new" (don't mark it as seen yet)
      // Convert to string to ensure consistent comparison
      if (orderData?.orderId) {
        const orderIdStr = String(orderData.orderId);
        setNewOrderIds(prev => new Set(prev).add(orderIdStr));
      }
      
      // Only refresh if we're viewing "all" orders (not cancelled or archive)
      if (viewMode === "all") {
        dispatch(getAllOrdersForAdmin("false"));
        
        toast({
          title: "New Order Received!",
          description: `Order from ${orderData.userName || "Unknown User"} - ₱${formatCurrency(orderData.totalAmount) || "0.00"}`,
          duration: 3000,
          variant: "success",
        });
      }
    });

    // Listen for order cancelled events
    socket.on("order-cancelled", (orderData) => {
      console.log("[Admin Orders] Order cancelled:", orderData);
      
      // Refresh the appropriate view based on current viewMode
      const archivedParam = viewMode === "cancelled" ? "true" : viewMode === "archive" ? "archive" : "false";
      dispatch(getAllOrdersForAdmin(archivedParam));
      
      toast({
        title: "Order Cancelled",
        description: `Order ${orderData.orderId?.slice(-8) || ""} from ${orderData.userName || "Unknown User"} has been cancelled.`,
        duration: 3000,
        variant: "destructive",
      });
    });

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.off("new-order");
        socket.off("order-cancelled");
        socket.disconnect();
      }
    };
  }, [dispatch, toast, viewMode]);

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

  // Check if order can be archived (pickedUp orders - these are successful/completed orders)
  const canArchiveOrder = (order) => {
    return order?.orderStatus === "pickedUp" && !order?.isArchived;
  };

  // Check if an order is "new" (came in via socket and hasn't been viewed yet)
  const isNewOrder = (order) => {
    if (!order?._id) return false;
    // Convert to string to ensure consistent comparison
    const orderIdStr = String(order._id);
    // Order is "new" if it came in via socket (is in newOrderIds) and hasn't been seen yet
    return newOrderIds.has(orderIdStr) && !seenOrders.has(orderIdStr);
  };

  const handleArchiveClick = (order) => {
    setOrderToArchive(order);
    setOpenArchiveDialog(true);
  };

  // Mark order as seen when admin views details
  const handleViewDetails = (orderId) => {
    // Convert to string to ensure consistent comparison
    const orderIdStr = String(orderId);
    setSeenOrders(prev => new Set(prev).add(orderIdStr));
    handleFetchOrderDetails(orderId);
  };

  const handleArchiveConfirm = async () => {
    if (!orderToArchive) return;

    setIsArchiving(true);
    try {
      const result = await dispatch(archiveOrder(orderToArchive._id)).unwrap();
      
      if (result.success) {
        toast({
          title: "Order Archived",
          description: result.message || "The order has been archived successfully.",
          variant: "success",
        });
        
        // Refresh the order list based on current view mode
        const archivedParam = viewMode === "cancelled" ? "true" : viewMode === "archive" ? "archive" : "false";
        dispatch(getAllOrdersForAdmin(archivedParam));
        
        setOpenArchiveDialog(false);
        setOrderToArchive(null);
      }
    } catch (error) {
      toast({
        title: "Archive Failed",
        description: error?.message || "Failed to archive the order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsArchiving(false);
    }
  };


  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle>
              {viewMode === "cancelled" 
                ? "Cancelled Orders" 
                : viewMode === "archive"
                ? "Archive"
                : "All Orders"}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {viewMode === "cancelled"
                ? "View cancelled orders (including orders cancelled due to failure to pay)."
                : viewMode === "archive"
                ? "View archived successful orders (completed orders)."
                : "Track and manage live customer orders."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {viewMode !== "all" ? (
              <Button
                variant="ghost"
                className="flex items-center gap-2"
                onClick={() => setViewMode("all")}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setViewMode("cancelled")}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  View Cancelled Orders
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setViewMode("archive")}
                  className="flex items-center gap-2"
                >
                  <Archive className="h-4 w-4" />
                  View Archive
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Order Date</TableHead>
              <TableHead>Order Status</TableHead>
              <TableHead>Payment Status</TableHead>
              <TableHead>Payment Deadline</TableHead>
              <TableHead>Order Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orderList && orderList.length > 0
              ? orderList.map((orderItem) => {
                  const deadlineStatus = getPaymentDeadlineStatus(orderItem);
                  const isNew = isNewOrder(orderItem);
                  return (
                  <TableRow key={orderItem?._id} className={isNew ? "bg-blue-50/50 dark:bg-blue-950/20 border-l-4 border-l-blue-500" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {formatOrderId(orderItem?._id, orderItem?.sequentialOrderNumber)}
                        {isNew && (
                          <Badge className="bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            New
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{orderItem?.orderDate.split("T")[0]}</TableCell>
                    <TableCell>
                      <Badge
                        className={`py-1 px-3 ${
                          orderItem?.orderStatus === "pending"
                            ? "bg-yellow-500 hover:bg-yellow-600"
                            : orderItem?.orderStatus === "confirmed"
                            ? "bg-blue-500 hover:bg-blue-600"
                            : orderItem?.orderStatus === "readyForPickup"
                            ? "bg-purple-500 hover:bg-purple-600"
                            : orderItem?.orderStatus === "pickedUp"
                            ? "bg-green-500 hover:bg-green-600"
                            : orderItem?.orderStatus === "cancelled"
                            ? "bg-red-600 hover:bg-red-700"
                            : "bg-secondary hover:bg-accent text-foreground"
                        }`}
                      >
                        {orderItem?.orderStatus === "readyForPickup"
                          ? "Ready for Pickup"
                          : orderItem?.orderStatus === "pickedUp"
                          ? "Picked up"
                          : orderItem?.orderStatus === "cancelled" && orderItem?.cancellationReason
                          ? orderItem.cancellationReason
                          : orderItem?.orderStatus === "cancelled"
                          ? "Cancelled"
                            : orderItem?.orderStatus?.charAt(0).toUpperCase() +
                              orderItem?.orderStatus?.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`py-1 px-3 ${
                            orderItem?.paymentStatus === "paid"
                              ? "bg-green-500 hover:bg-green-600"
                              : orderItem?.paymentStatus === "failed"
                              ? "bg-red-600 hover:bg-red-700"
                              : "bg-yellow-500 hover:bg-yellow-600"
                          }`}
                        >
                          {orderItem?.paymentStatus}
                      </Badge>
                    </TableCell>
                      <TableCell>
                        {deadlineStatus ? (
                          <div className="flex items-center gap-2">
                            <Clock className={`h-4 w-4 ${
                              deadlineStatus.isExpired
                                ? "text-red-600"
                                : deadlineStatus.isUrgent
                                ? "text-orange-600"
                                : deadlineStatus.isWarning
                                ? "text-yellow-600"
                                : "text-muted-foreground"
                            }`} />
                            <span className={`text-sm ${
                              deadlineStatus.isExpired
                                ? "text-red-600 font-semibold"
                                : deadlineStatus.isUrgent
                                ? "text-orange-600 font-semibold"
                                : deadlineStatus.isWarning
                                ? "text-yellow-600 font-semibold"
                                : "text-muted-foreground"
                            }`}>
                              {deadlineStatus.isExpired
                                ? viewMode === "cancelled" ? "Overdue" : "Expired - Will Cancel"
                                : deadlineStatus.isUrgent
                                ? `${deadlineStatus.hoursRemaining}h left`
                                : deadlineStatus.deadline.toLocaleDateString()}
                            </span>
                            {(deadlineStatus.isExpired || deadlineStatus.isUrgent || deadlineStatus.isWarning) && (
                              <AlertTriangle className={`h-4 w-4 ${
                                deadlineStatus.isExpired
                                  ? "text-red-600"
                                  : deadlineStatus.isUrgent
                                  ? "text-orange-600"
                                  : "text-yellow-600"
                              }`} />
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    <TableCell>₱{formatCurrency(orderItem?.totalAmount)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {orderItem?.isArchived ? (
                          <Badge className="bg-gray-500 hover:bg-gray-600">
                            Archived
                          </Badge>
                        ) : orderItem?.orderStatus === "cancelled" ? (
                          <Badge className="bg-red-600 hover:bg-red-700">
                            Cancelled
                          </Badge>
                        ) : orderItem?.orderStatus === "pickedUp" ? (
                          <Badge className="bg-emerald-500 hover:bg-emerald-600">
                            Completed
                          </Badge>
                        ) : (
                          <Badge className="bg-green-500 hover:bg-green-600">
                            Active
                          </Badge>
                        )}
                        {isNew && (
                          <Badge className="bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            New
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col sm:flex-row gap-2">
                      <Dialog
                        open={openDetailsDialog}
                        onOpenChange={() => {
                          setOpenDetailsDialog(false);
                          dispatch(resetOrderDetails());
                        }}
                      >
                        <Button
                            variant="outline"
                            size="sm"
                          onClick={() =>
                            handleViewDetails(orderItem?._id)
                          }
                        >
                          View Details
                        </Button>
                        <AdminOrderDetailsView orderDetails={orderDetails} />
                      </Dialog>
                        {canArchiveOrder(orderItem) && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleArchiveClick(orderItem)}
                            className="flex items-center gap-2"
                          >
                            <Archive className="h-4 w-4" />
                            Archive
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })
              : null}
          </TableBody>
        </Table>
      </CardContent>

      {/* Archive Confirmation Dialog */}
      <Dialog open={openArchiveDialog} onOpenChange={setOpenArchiveDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <h3 className="text-lg font-semibold">Archive Order</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Are you sure you want to archive this order? Archived orders will be moved to the archive section and will no longer appear in the main orders list.
              </p>
              <div className="mt-2 p-3 bg-secondary/10 rounded-lg">
                <p className="text-sm">
                  <strong>Order ID:</strong> {orderToArchive?._id}
                </p>
                <p className="text-sm">
                  <strong>Order Status:</strong> {orderToArchive?.orderStatus === "pickedUp" ? "Picked Up" : orderToArchive?.orderStatus}
                </p>
                <p className="text-sm">
                  <strong>Payment Status:</strong> {orderToArchive?.paymentStatus}
                </p>
                <p className="text-sm">
                  <strong>Total Amount:</strong> ₱{formatCurrency(orderToArchive?.totalAmount)}
                </p>
              </div>
              <div className="mt-2 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                <p className="text-sm text-orange-800 dark:text-orange-200 font-medium">
                  ⚠️ Warning: This action will move the order to the archive. You can unarchive it later if needed.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setOpenArchiveDialog(false);
                  setOrderToArchive(null);
                }}
                disabled={isArchiving}
              >
                Cancel
              </Button>
              <Button
                variant="secondary"
                onClick={handleArchiveConfirm}
                disabled={isArchiving}
                className="flex items-center gap-2"
              >
                <Archive className="h-4 w-4" />
                {isArchiving ? "Archiving..." : "Yes, Archive Order"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default AdminOrdersView;
