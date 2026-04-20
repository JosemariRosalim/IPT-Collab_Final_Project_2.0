import { useSelector, useDispatch } from "react-redux";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogClose } from "../ui/dialog";
import { ArchiveConfirmationDialog } from "../common/archive-confirmation-dialog";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";
import { Button } from "../ui/button";
import { useNavigate } from "react-router-dom";
import { Receipt, X, Archive, ArchiveRestore, RotateCcw, Trash2, Clock, AlertTriangle } from "lucide-react";
import { formatCurrency, formatOrderId } from "@/lib/utils";
import {
  cancelOrder,
  getOrderDetails,
  getAllOrdersByUserId,
  archiveOrder,
  unarchiveOrder,
  restoreCancelledOrder,
  deleteCancelledOrder,
  resetOrderDetails,
} from "@/store/shop/order-slice";
import { useToast } from "../ui/use-toast";
import { useState } from "react";

function ShoppingOrderDetailsView({ orderDetails }) {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [openArchiveDialog, setOpenArchiveDialog] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isArchivingMode, setIsArchivingMode] = useState(true);
  
  const handleViewPayment = () => {
    navigate(`/shop/payment-success?orderId=${orderDetails?._id}`);
  };

  const handleCancelOrder = async () => {
    if (!orderDetails?._id || !user?.id) return;

    setIsCancelling(true);
    try {
      const result = await dispatch(
        cancelOrder({ id: orderDetails._id, userId: user.id })
      );

      if (result.payload?.success) {
        toast({
          title: "Order cancelled successfully",
          description: "Your order has been cancelled.",
          variant: "success",
        });
        setShowCancelDialog(false);
        // Refresh order details and order list
        dispatch(getOrderDetails(orderDetails._id));
        dispatch(getAllOrdersByUserId({ userId: user.id }));
      } else {
        toast({
          title: "Failed to cancel order",
          description: result.payload?.message || "Please try again later.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error occurred",
        description: "Failed to cancel order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  // Check if order can be cancelled
  const canCancel = orderDetails?.orderStatus === "pending";
  const isCancelled = orderDetails?.orderStatus === "cancelled";

  // Calculate payment deadline status
  const getPaymentDeadlineInfo = () => {
    // Don't show deadline for readyForPickup or pickedUp orders
    if (orderDetails?.orderStatus === "readyForPickup" || orderDetails?.orderStatus === "pickedUp") {
      return null;
    }
    // Payment deadline only exists after admin confirms the order
    // If paymentDeadline exists, use it; otherwise deadline hasn't started yet
    let deadline;
    if (orderDetails?.paymentDeadline) {
      deadline = new Date(orderDetails.paymentDeadline);
    } else {
      // Deadline hasn't been set yet (order not confirmed by admin)
      return null;
    }
    
    const now = new Date();
    const timeDiff = deadline.getTime() - now.getTime();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    const hoursRemaining = Math.ceil(timeDiff / (1000 * 60 * 60));
    const isExpired = timeDiff < 0;
    const isUrgent = timeDiff > 0 && timeDiff <= 24 * 60 * 60 * 1000; // Less than 24 hours remaining
    const isWarning = timeDiff > 0 && timeDiff <= 2 * 24 * 60 * 60 * 1000; // Less than 2 days remaining

    return {
      deadline,
      daysRemaining,
      hoursRemaining,
      isExpired,
      isUrgent,
      isWarning,
    };
  };

  const deadlineInfo = getPaymentDeadlineInfo();

  // Check if order can be archived (successful/paid or pickedUp)
  const canArchive = () => {
    const isPickedUp = orderDetails?.orderStatus === "pickedUp";
    const isSuccessful = orderDetails?.paymentStatus === "paid" && 
                         orderDetails?.orderStatus !== "pending" && 
                         orderDetails?.orderStatus !== "confirmed";
    return (isPickedUp || isSuccessful) && !orderDetails?.isArchived;
  };

  const handleArchive = async () => {
    if (!orderDetails?._id || !user?.id) return;
    setIsArchivingMode(true);
    setOpenArchiveDialog(true);
  };

  const handleArchiveConfirm = async () => {
    if (!orderDetails?._id || !user?.id) return;

    setIsArchiving(true);
    try {
      const result = await dispatch(
        archiveOrder({ id: orderDetails._id, userId: user.id })
      );

      if (result.payload?.success) {
        toast({
          title: "Order archived successfully",
          description: "The order has been moved to archived.",
          variant: "success",
        });
        dispatch(getOrderDetails(orderDetails._id));
        dispatch(getAllOrdersByUserId({ userId: user.id }));
        setOpenArchiveDialog(false);
      } else {
        toast({
          title: "Failed to archive order",
          description: result.payload?.message || "Please try again later.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error occurred",
        description: "Failed to archive order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsArchiving(false);
    }
  };

  const handleUnarchive = async () => {
    if (!orderDetails?._id || !user?.id) return;
    setIsArchivingMode(false);
    setOpenArchiveDialog(true);
  };

  const handleUnarchiveConfirm = async () => {
    if (!orderDetails?._id || !user?.id) return;

    setIsArchiving(true);
    try {
      const result = await dispatch(
        unarchiveOrder({ id: orderDetails._id, userId: user.id })
      );

      if (result.payload?.success) {
        toast({
          title: "Order unarchived successfully",
          description: "The order has been restored.",
          variant: "success",
        });
        dispatch(getOrderDetails(orderDetails._id));
        dispatch(getAllOrdersByUserId({ userId: user.id }));
        setOpenArchiveDialog(false);
      } else {
        toast({
          title: "Failed to unarchive order",
          description: result.payload?.message || "Please try again later.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error occurred",
        description: "Failed to unarchive order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsArchiving(false);
    }
  };

  const handleRestore = async () => {
    if (!orderDetails?._id || !user?.id) return;

    setIsRestoring(true);
    try {
      const result = await dispatch(
        restoreCancelledOrder({ id: orderDetails._id, userId: user.id })
      ).unwrap();

      toast({
        title: "Order restored",
        description: result.message || "The order has been moved back to your active orders.",
        variant: "success",
      });

      await dispatch(getOrderDetails(orderDetails._id));
      await dispatch(getAllOrdersByUserId({ userId: user.id }));
    } catch (error) {
      const description =
        error?.message ||
        error?.response?.data?.message ||
        "Failed to restore the order. Please try again.";

      toast({
        title: "Restore failed",
        description,
        variant: "destructive",
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDelete = async () => {
    if (!orderDetails?._id || !user?.id) return;

    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this cancelled order? This action cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await dispatch(
        deleteCancelledOrder({ id: orderDetails._id, userId: user.id })
      ).unwrap();

      toast({
        title: "Order deleted",
        description: result.message || "The cancelled order has been removed permanently.",
        variant: "success",
      });

      await dispatch(getAllOrdersByUserId({ userId: user.id }));
      dispatch(resetOrderDetails());
    } catch (error) {
      const description =
        error?.message ||
        error?.response?.data?.message ||
        "Failed to delete the order. Please try again.";

      toast({
        title: "Delete failed",
        description,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DialogContent className="w-[95vw] sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
      <div className="grid gap-4 sm:gap-6 pb-4">
        <h2 className="text-xl font-bold text-foreground mt-4 text-center">Order Details</h2>
        <Separator />
        <div className="grid gap-2">
          <div className="flex items-start sm:items-center justify-between flex-wrap gap-2">
            <p className="font-medium">Order ID</p>
            <Label className="text-right break-all">{formatOrderId(orderDetails?._id, orderDetails?.sequentialOrderNumber)}</Label>
          </div>
          <div className="flex mt-2 items-center justify-between gap-2">
            <p className="font-medium">Order Date</p>
            <Label>{orderDetails?.orderDate.split("T")[0]}</Label>
          </div>
          {deadlineInfo && orderDetails?.paymentStatus === "pending" && (
            <div className="flex mt-2 items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <p className="font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Payment Deadline
                </p>
              </div>
              <Label className={deadlineInfo.isExpired ? "text-red-600 font-semibold" : deadlineInfo.isUrgent ? "text-orange-600 font-semibold" : deadlineInfo.isWarning ? "text-yellow-600 font-semibold" : ""}>
                {deadlineInfo.deadline.toLocaleDateString()} {deadlineInfo.deadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Label>
            </div>
          )}
          <div className="flex mt-2 items-center justify-between gap-2">
            <p className="font-medium">Order Price</p>
            <Label>₱{formatCurrency(orderDetails?.totalAmount)}</Label>
          </div>
          <div className="flex mt-2 items-center justify-between gap-2">
            <p className="font-medium">Payment method</p>
            <Label className="capitalize">{orderDetails?.paymentMethod}</Label>
          </div>
          <div className="flex mt-2 items-center justify-between gap-2">
            <p className="font-medium">Payment Status</p>
            <Label className="capitalize">
              <Badge
                className={`py-1 px-3 ${
                  orderDetails?.paymentStatus === "paid"
                    ? "bg-green-500 hover:bg-green-600"
                    : orderDetails?.paymentStatus === "failed"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-yellow-500 hover:bg-yellow-600"
                }`}
              >
                {orderDetails?.paymentStatus}
              </Badge>
            </Label>
          </div>
          <div className="flex mt-2 items-center justify-between gap-2">
            <p className="font-medium">Order Status</p>
            <Label>
              <Badge
                className={`py-1 px-3 ${
                  orderDetails?.orderStatus === "pending"
                    ? "bg-yellow-500 hover:bg-yellow-600"
                    : orderDetails?.orderStatus === "confirmed"
                    ? "bg-blue-500 hover:bg-blue-600"
                  : orderDetails?.orderStatus === "readyForPickup"
                    ? "bg-purple-500 hover:bg-purple-600"
                    : orderDetails?.orderStatus === "pickedUp"
                    ? "bg-green-500 hover:bg-green-600"
                    : orderDetails?.orderStatus === "cancelled"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-secondary hover:bg-accent text-foreground"
                }`}
              >
                {orderDetails?.orderStatus === "readyForPickup"
                  ? "Ready for Pickup"
                  : orderDetails?.orderStatus === "pickedUp"
                  ? "Picked up"
                  : orderDetails?.orderStatus === "cancelled" && orderDetails?.cancellationReason
                  ? orderDetails.cancellationReason
                  : orderDetails?.orderStatus?.charAt(0).toUpperCase() + orderDetails?.orderStatus?.slice(1)}
              </Badge>
            </Label>
          </div>
          {orderDetails?.cancellationReason && (
            <div className="flex mt-2 items-center justify-between gap-2">
              <p className="font-medium text-red-600">Cancellation Reason</p>
              <Label className="text-red-600 font-semibold">
                {orderDetails.cancellationReason}
              </Label>
            </div>
          )}
        </div>
        <Separator />
        
        {/* Payment Actions */}
        <div className="grid gap-4">
          <div className="grid gap-2">
            <div className="font-medium">Payment & Receipt</div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={handleViewPayment}
                variant={orderDetails?.paymentStatus === "pending" ? "default" : "outline"}
                className={`flex-1 ${
                  orderDetails?.paymentStatus === "pending"
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300 animate-pulse hover:animate-none"
                    : ""
                }`}
              >
                <Receipt className={`h-4 w-4 mr-2 ${orderDetails?.paymentStatus === "pending" ? "animate-bounce" : ""}`} />
                {orderDetails?.paymentStatus === "paid" 
                  ? "View Receipt & Payment Proof" 
                  : "Download Receipt & Submit Payment Proof"}
              </Button>
            </div>
            {orderDetails?.paymentStatus === "paid" && orderDetails?.paymentProof && (
              <p className="text-sm text-muted-foreground">
                ✓ Payment proof has been submitted
              </p>
            )}
            {orderDetails?.paymentStatus === "pending" && deadlineInfo && (
              <div className={`rounded-lg p-3 border ${
                deadlineInfo.isExpired
                  ? "bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-800"
                  : deadlineInfo.isUrgent
                  ? "bg-orange-50 dark:bg-orange-950/20 border-orange-300 dark:border-orange-800"
                  : deadlineInfo.isWarning
                  ? "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-300 dark:border-yellow-800"
                  : "bg-primary/10 border-primary/20"
              }`}>
                <div className="flex flex-col gap-2">
                  <p className={`text-sm font-medium flex items-center gap-2 ${
                    deadlineInfo.isExpired
                      ? "text-red-700 dark:text-red-400"
                      : deadlineInfo.isUrgent
                      ? "text-orange-700 dark:text-orange-400"
                      : deadlineInfo.isWarning
                      ? "text-yellow-700 dark:text-yellow-400"
                      : "text-primary"
                  }`}>
                    <AlertTriangle className="h-4 w-4" />
                    <span>
                      {deadlineInfo.isExpired
                        ? `⚠️ Payment deadline has passed! Your order will be automatically deleted if payment proof is not submitted.`
                        : deadlineInfo.isUrgent
                        ? `⚠️ Urgent: Only ${deadlineInfo.hoursRemaining} hour(s) remaining to submit payment proof. Order will be deleted after deadline.`
                        : deadlineInfo.isWarning
                        ? `⚠️ Warning: Only ${deadlineInfo.daysRemaining} day(s) remaining to submit payment proof. Order will be deleted after deadline.`
                        : `Action Required: Please submit your payment proof within ${deadlineInfo.daysRemaining} day(s) to confirm your order`}
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        <Separator />
        <div className="grid gap-4">
          <div className="grid gap-2">
            <div className="font-medium">Order Details</div>
            <ul className="grid gap-3">
              {orderDetails?.cartItems && orderDetails?.cartItems.length > 0
                ? orderDetails?.cartItems.map((item, index) => (
                    <li key={index} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="relative w-20 h-20 bg-muted/30 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = '/placeholder-image.png';
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{item.title}</h3>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="text-muted-foreground">Qty: <span className="font-medium text-foreground">{item.quantity}</span></span>
                          <span className="text-muted-foreground">Price: <span className="font-semibold text-primary">₱{formatCurrency(item.price)}</span></span>
                        </div>
                        <div className="mt-1 text-sm font-semibold text-foreground">
                          Subtotal: <span className="text-primary">₱{formatCurrency(item.price * item.quantity)}</span>
                        </div>
                      </div>
                    </li>
                  ))
                : null}
            </ul>
          </div>
        </div>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <div className="font-medium">Customer Information</div>
            <div className="grid gap-1.5 text-sm text-muted-foreground">
              {/* Check if it's customer info (no city/pincode) or address info */}
              {!orderDetails?.addressInfo?.city && !orderDetails?.addressInfo?.pincode ? (
                <>
                  <span className="break-words"><strong className="text-foreground">Name:</strong> {orderDetails?.addressInfo?.address}</span>
                  <span className="break-words"><strong className="text-foreground">Email:</strong> {orderDetails?.addressInfo?.notes}</span>
                  <span className="break-words"><strong className="text-foreground">Phone:</strong> {orderDetails?.addressInfo?.phone}</span>
                </>
              ) : (
                <>
                  <span className="break-words"><strong className="text-foreground">Name:</strong> {user.userName}</span>
                  <span className="break-words"><strong className="text-foreground">Address:</strong> {orderDetails?.addressInfo?.address}</span>
                  <span className="break-words"><strong className="text-foreground">City:</strong> {orderDetails?.addressInfo?.city}</span>
                  <span className="break-words"><strong className="text-foreground">Pincode:</strong> {orderDetails?.addressInfo?.pincode}</span>
                  <span className="break-words"><strong className="text-foreground">Phone:</strong> {orderDetails?.addressInfo?.phone}</span>
                  {orderDetails?.addressInfo?.notes && (
                    <span className="break-words"><strong className="text-foreground">Notes:</strong> {orderDetails?.addressInfo?.notes}</span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Order Actions Section */}
        {(canCancel || canArchive() || orderDetails?.isArchived || isCancelled) && (
          <>
            <Separator />
            <div className="grid gap-4">
              <div className="grid gap-2">
                <div className="font-medium">Order Actions</div>
                {canCancel && (
                  <>
                    <Button
                      onClick={() => setShowCancelDialog(true)}
                      variant="destructive"
                      className="w-full sm:w-auto"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel Order
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      You can cancel this order while it is still pending.
                    </p>
                  </>
                )}
                {canArchive() && (
                  <Button
                    onClick={handleArchive}
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    Archive Order
                  </Button>
                )}
                {orderDetails?.isArchived && (
                  <Button
                    onClick={handleUnarchive}
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    <ArchiveRestore className="h-4 w-4 mr-2" />
                    Unarchive Order
                  </Button>
                )}
                {isCancelled && (
                  <>
                    {/* Only show restore button if order was not cancelled due to failure to pay */}
                    {orderDetails?.cancellationReason !== "Cancelled due to failure to pay" && (
                      <Button
                        onClick={handleRestore}
                        variant="secondary"
                        className="w-full sm:w-auto flex items-center gap-2"
                        disabled={isRestoring}
                      >
                        <RotateCcw className="h-4 w-4" />
                        {isRestoring ? "Restoring..." : "Restore Order"}
                      </Button>
                    )}
                    <Button
                      onClick={handleDelete}
                      variant="destructive"
                      className="w-full sm:w-auto flex items-center gap-2"
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4" />
                      {isDeleting ? "Deleting..." : "Delete Permanently"}
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      {orderDetails?.cancellationReason === "Cancelled due to failure to pay"
                        ? "This order was cancelled due to failure to pay and cannot be restored."
                        : "Restoring moves the order back to your active list. Deleting removes it permanently."}
                    </p>
                  </>
                )}
                {!canCancel && !canArchive() && !orderDetails?.isArchived && !isCancelled && (
                  <p className="text-sm text-muted-foreground">
                    Only successful (paid) or picked-up orders can be archived.
                  </p>
                )}
              </div>
            </div>
          </>
        )}
        
        {/* Close Button */}
        <div className="flex justify-end pt-4">
          <DialogClose asChild>
            <Button variant="outline" className="w-full sm:w-auto">
              Close
            </Button>
          </DialogClose>
        </div>
      </div>
      
      {/* Cancel Order Confirmation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <h3 className="text-lg font-semibold">Cancel Order</h3>
              <p className="text-sm text-muted-foreground">
                Are you sure you want to cancel this order? This action cannot be undone.
              </p>
              <div className="mt-2 p-3 bg-secondary/10 rounded-lg">
                <p className="text-sm">
                  <strong>Order ID:</strong> {orderDetails?._id}
                </p>
                <p className="text-sm">
                  <strong>Total Amount:</strong> ₱{formatCurrency(orderDetails?.totalAmount)}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowCancelDialog(false)}
                disabled={isCancelling}
              >
                Keep Order
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelOrder}
                disabled={isCancelling}
              >
                {isCancelling ? "Cancelling..." : "Yes, Cancel Order"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Archive/Unarchive Confirmation Dialog */}
      <ArchiveConfirmationDialog
        open={openArchiveDialog}
        onOpenChange={setOpenArchiveDialog}
        isLoading={isArchiving}
        onConfirm={isArchivingMode ? handleArchiveConfirm : handleUnarchiveConfirm}
        archiveType="order"
        isArchiving={isArchivingMode}
        itemDetails={{
          itemId: orderDetails?._id,
          paymentStatus: orderDetails?.paymentStatus,
          totalAmount: orderDetails?.totalAmount ? `₱${formatCurrency(orderDetails.totalAmount)}` : undefined,
        }}
      />
    </DialogContent>
  );
}

export default ShoppingOrderDetailsView;
