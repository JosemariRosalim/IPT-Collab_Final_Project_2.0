import { useEffect, useMemo, useState } from "react";
import CommonForm from "../common/form";
import { DialogContent } from "../ui/dialog";
import { ArchiveConfirmationDialog } from "../common/archive-confirmation-dialog";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { useDispatch } from "react-redux";
import { formatCurrency, formatOrderId } from "@/lib/utils";
import {
  getAllOrdersForAdmin,
  getOrderDetailsForAdmin,
  updateOrderStatus,
  archiveOrder,
  unarchiveOrder,
} from "@/store/admin/order-slice";
import { useToast } from "../ui/use-toast";
import { Archive, ArchiveRestore, Clock, AlertTriangle } from "lucide-react";

const initialFormData = {
  status: "",
};

const ORDER_STATUS_FLOW = [
  { id: "pending", label: "Pending" },
  { id: "confirmed", label: "Confirmed" },
  { id: "readyForPickup", label: "Ready for Pickup" },
  { id: "pickedUp", label: "Picked up" },
];

function AdminOrderDetailsView({ orderDetails }) {
  const [formData, setFormData] = useState(initialFormData);
  const [isUpdating, setIsUpdating] = useState(false);
  const [openArchiveDialog, setOpenArchiveDialog] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isArchivingMode, setIsArchivingMode] = useState(true);
  const dispatch = useDispatch();
  const { toast } = useToast();

  console.log(orderDetails, "orderDetailsorderDetails");

  useEffect(() => {
    setFormData(initialFormData);
  }, [orderDetails?._id]);

  const currentStatus = orderDetails?.orderStatus;
  const statusOptions = useMemo(() => {
    if (!currentStatus) {
      return ORDER_STATUS_FLOW;
    }

    if (currentStatus === "cancelled") {
      return [{ id: "cancelled", label: "Cancelled" }];
    }
    const orderedIds = ORDER_STATUS_FLOW.map((status) => status.id);
    const currentIndex = orderedIds.indexOf(currentStatus);

    if (currentIndex === -1) {
      return ORDER_STATUS_FLOW;
    }

    return ORDER_STATUS_FLOW.filter((status) => {
      const statusIndex = orderedIds.indexOf(status.id);
      return statusIndex >= currentIndex;
    });
  }, [currentStatus]);

  const isFinalStatus =
    currentStatus === "pickedUp" || currentStatus === "cancelled";

  const isStatusLocked =
    isFinalStatus ||
    statusOptions.every((option) => option.id === currentStatus);

  function handleUpdateStatus(event) {
    event.preventDefault();
    const { status } = formData;

    setIsUpdating(true);
    dispatch(
      updateOrderStatus({ id: orderDetails?._id, orderStatus: status })
    ).then((data) => {
      if (data?.payload?.success) {
        dispatch(getOrderDetailsForAdmin(orderDetails?._id));
        dispatch(getAllOrdersForAdmin(false));
        setFormData(initialFormData);
        toast({
          title: data?.payload?.message || "Order status updated successfully",
          variant: "success",
        });
      } else if (data?.payload?.message) {
        toast({
          title: data?.payload?.message,
          variant: "destructive",
        });
      }
    }).finally(() => {
      setIsUpdating(false);
    });
  }

  function handleArchive() {
    setIsArchivingMode(true);
    setOpenArchiveDialog(true);
  }

  function handleArchiveConfirm() {
    setIsArchiving(true);
    dispatch(archiveOrder(orderDetails?._id))
      .then((data) => {
        if (data?.payload?.success) {
          dispatch(getOrderDetailsForAdmin(orderDetails?._id));
          dispatch(getAllOrdersForAdmin(false));
          toast({
            title: data?.payload?.message,
            variant: "success",
          });
          setOpenArchiveDialog(false);
        } else {
          toast({
            title: data?.payload?.message || "Failed to archive order",
            variant: "destructive",
          });
        }
      })
      .finally(() => {
        setIsArchiving(false);
      });
  }

  function handleUnarchive() {
    setIsArchivingMode(false);
    setOpenArchiveDialog(true);
  }

  function handleUnarchiveConfirm() {
    setIsArchiving(true);
    dispatch(unarchiveOrder(orderDetails?._id))
      .then((data) => {
        if (data?.payload?.success) {
          dispatch(getOrderDetailsForAdmin(orderDetails?._id));
          dispatch(getAllOrdersForAdmin(false));
          toast({
            title: data?.payload?.message,
            variant: "success",
          });
          setOpenArchiveDialog(false);
        } else {
          toast({
            title: data?.payload?.message || "Failed to unarchive order",
            variant: "destructive",
          });
        }
      })
      .finally(() => {
        setIsArchiving(false);
      });
  }

  const canArchive = orderDetails?.orderStatus === "pickedUp" && !orderDetails?.isArchived;
  const canUnarchive = orderDetails?.isArchived;

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

  return (
    <DialogContent className="w-[95vw] sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
      <div className="grid gap-4 sm:gap-6 pb-4">
        <div className="grid gap-2">
            <div className="flex mt-10 items-start sm:items-center justify-between flex-wrap gap-4">
            <p className="font-medium">Order ID</p>
            <Label className="text-right break-all flex-1 text-left sm:text-right">{formatOrderId(orderDetails?._id, orderDetails?.sequentialOrderNumber)}</Label>
          </div>
          <div className="flex mt-2 items-center justify-between gap-4">
            <p className="font-medium">Order Date</p>
            <Label className="flex-1 text-left sm:text-right">{orderDetails?.orderDate.split("T")[0]}</Label>
          </div>
          {deadlineInfo && orderDetails?.paymentStatus === "pending" && (
            <div className="flex mt-2 items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <p className="font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Payment Deadline
                </p>
              </div>
              <Label className={deadlineInfo.isExpired ? "text-red-600 font-semibold" : deadlineInfo.isUrgent ? "text-orange-600 font-semibold" : deadlineInfo.isWarning ? "text-yellow-600 font-semibold" : "flex-1 text-left sm:text-right"}>
                {deadlineInfo.deadline.toLocaleDateString()} {deadlineInfo.deadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Label>
            </div>
          )}
          <div className="flex mt-2 items-center justify-between gap-4">
            <p className="font-medium">Order Price</p>
            <Label className="flex-1 text-left sm:text-right">₱{formatCurrency(orderDetails?.totalAmount)}</Label>
          </div>
          <div className="flex mt-2 items-center justify-between gap-4">
            <p className="font-medium">Payment method</p>
            <Label className="capitalize flex-1 text-left sm:text-right">{orderDetails?.paymentMethod}</Label>
          </div>
          <div className="flex mt-2 items-center justify-between gap-4">
            <p className="font-medium">Payment Status</p>
            <Label className="capitalize flex-1 text-left sm:text-right">
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
          <div className="flex mt-2 items-center justify-between gap-4">
            <p className="font-medium">Order Status</p>
            <Label className="flex-1 text-left sm:text-right">
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
            <div className="flex mt-2 items-center justify-between gap-4">
              <p className="font-medium text-red-600">Cancellation Reason</p>
              <Label className="text-red-600 font-semibold flex-1 text-left sm:text-right">
                {orderDetails.cancellationReason}
              </Label>
            </div>
          )}
        </div>
        <Separator />
        
        {/* Payment Proof Section */}
        <div className="grid gap-4">
          <div className="grid gap-2">
            <div className="font-medium">Payment Proof</div>
            {orderDetails?.paymentProof ? (
              <div className="border rounded-lg p-4 bg-secondary/10">
                <img
                  src={orderDetails.paymentProof}
                  alt="Payment Proof"
                  className="w-full max-w-md mx-auto rounded-lg border shadow-sm cursor-pointer hover:opacity-90 transition-opacity object-contain"
                  onClick={() => window.open(orderDetails.paymentProof, "_blank")}
                  onError={(e) => {
                    e.target.style.display = "none";
                    const errorMsg = e.target.parentElement.querySelector(".error-message");
                    if (errorMsg) errorMsg.style.display = "block";
                  }}
                />
                <p className="text-sm text-muted-foreground mt-2 text-center error-message hidden">
                  Failed to load payment proof image
                </p>
                <div className="mt-2 text-center">
                  <a
                    href={orderDetails.paymentProof}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    View Full Size
                  </a>
                </div>
              </div>
            ) : (
              <div className="border rounded-lg p-4 bg-muted/50">
                <p className="text-sm text-muted-foreground text-center">
                  No payment proof submitted yet
                </p>
              </div>
            )}
            {deadlineInfo && orderDetails?.paymentStatus === "pending" && (
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
                        ? `⚠️ Payment deadline has passed! This order will be automatically canceled and deleted due to failure to pay.`
                        : deadlineInfo.isUrgent
                        ? `⚠️ Urgent: Only ${deadlineInfo.hoursRemaining} hour(s) remaining for customer to submit payment proof. Order will be canceled after deadline.`
                        : deadlineInfo.isWarning
                        ? `⚠️ Warning: Only ${deadlineInfo.daysRemaining} day(s) remaining for customer to submit payment proof. Order will be canceled after deadline.`
                        : `Customer has ${deadlineInfo.daysRemaining} day(s) remaining to submit payment proof. Order will be canceled if not submitted by deadline.`}
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
                    <li key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 border rounded">
                      <span className="font-medium">{item.title}</span>
                      <div className="flex gap-4 text-sm">
                        <span>Qty: {item.quantity}</span>
                        <span className="font-semibold">₱{formatCurrency(item.price)}</span>
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
                  <span className="break-words"><strong className="text-foreground">Customer Name:</strong> {orderDetails?.userId?.userName}</span>
                  <span className="break-words"><strong className="text-foreground">Email:</strong> {orderDetails?.userId?.email}</span>
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

        <div>
          <CommonForm
            formControls={[
              {
                label: "Order Status",
                name: "status",
                componentType: "select",
                options: statusOptions,
                disabled: isStatusLocked,
                helperText: isStatusLocked
                  ? "This order can no longer move to another status."
                  : null,
              },
            ]}
            formData={formData}
            setFormData={setFormData}
            buttonText={"Update Order Status"}
            onSubmit={handleUpdateStatus}
            isBtnDisabled={
              isStatusLocked ||
              !formData.status ||
              formData.status === currentStatus
            }
            isLoading={isUpdating}
            loadingText="Updating..."
          />
        </div>

        <Separator />

        <div className="grid gap-4">
          <div className="grid gap-2">
            <div className="font-medium">Archive Management</div>
            {canArchive && (
              <Button
                onClick={handleArchive}
                variant="outline"
                className="w-full sm:w-auto"
              >
                <Archive className="h-4 w-4 mr-2" />
                Archive Order
              </Button>
            )}
            {canUnarchive && (
              <Button
                onClick={handleUnarchive}
                variant="outline"
                className="w-full sm:w-auto"
              >
                <ArchiveRestore className="h-4 w-4 mr-2" />
                Unarchive Order
              </Button>
            )}
            {!canArchive && !canUnarchive && (
              <p className="text-sm text-muted-foreground">
                Only picked-up (completed) orders can be archived.
              </p>
            )}
          </div>
        </div>
      </div>
      
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
          orderStatus: orderDetails?.orderStatus === "pickedUp" ? "Picked Up" : orderDetails?.orderStatus,
          paymentStatus: orderDetails?.paymentStatus,
          totalAmount: orderDetails?.totalAmount ? `₱${formatCurrency(orderDetails.totalAmount)}` : undefined,
        }}
      />
    </DialogContent>
  );
}

export default AdminOrderDetailsView;
