import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getOrderDetails, submitPaymentProof, archiveOrder, unarchiveOrder, getAllOrdersByUserId, resetOrderDetails } from "@/store/shop/order-slice";
import { generateReceiptPDF } from "@/utils/generateReceipt";
import { formatCurrency, formatOrderId } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { Download, Upload, CheckCircle2, FileImage, Archive, ArchiveRestore, Clock } from "lucide-react";
import BackButton from "@/components/common/back-button";
import posthog from "posthog-js";

const captureEvent = (eventName, properties) => {
  if (typeof posthog.capture !== "function") return;
  if (
    typeof posthog.has_opted_out_capturing === "function" &&
    posthog.has_opted_out_capturing()
  ) {
    return;
  }
  posthog.capture(eventName, properties);
};

function PaymentSuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch();
  const { toast } = useToast();
  const { orderDetails, isLoading, orderId: reduxOrderId } = useSelector((state) => state.shopOrder);
  const { user } = useSelector((state) => state.auth);
  const [paymentProofFile, setPaymentProofFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const trackedOrderRef = useRef(null);
  
  // Get orderId from URL params, location state, sessionStorage, or Redux state
  const getOrderId = () => {
    // First try URL parameter (from direct link or navigation)
    const urlOrderId = searchParams.get("orderId");
    if (urlOrderId) {
      sessionStorage.setItem("lastOrderId", urlOrderId);
      return urlOrderId;
    }
    // Then try location state (from navigation)
    if (location.state?.orderId) {
      // Store in sessionStorage as backup
      sessionStorage.setItem("lastOrderId", location.state.orderId);
      return location.state.orderId;
    }
    // Then try sessionStorage (in case page was refreshed)
    const storedOrderId = sessionStorage.getItem("lastOrderId");
    if (storedOrderId) {
      return storedOrderId;
    }
    // Finally try Redux state
    return reduxOrderId;
  };
  
  const orderId = getOrderId();

  // Reset order details when component unmounts to prevent unwanted dialog popup
  useEffect(() => {
    return () => {
      dispatch(resetOrderDetails());
    };
  }, [dispatch]);

  useEffect(() => {
    if (user?.id) {
      posthog.identify(user.id, {
        email: user?.email,
        name: user?.userName,
        role: user?.role,
      });
    }
  }, [user?.id, user?.email, user?.userName, user?.role]);

  useEffect(() => {
    if (!orderDetails?._id) return;
    if (trackedOrderRef.current === orderDetails._id) return;

    const items = (orderDetails.cartItems || []).map((item) => ({
      productId: item?.productId ?? item?.product?._id ?? null,
      title: item?.title ?? item?.product?.title ?? "",
      quantity: item?.quantity ?? 0,
      price: item?.price ?? item?.product?.price ?? 0,
    }));

    const itemsCount = items.reduce((total, item) => total + (item.quantity || 0), 0);
    const orderValue = Number(orderDetails.totalAmount) || 0;

    captureEvent("order_placed", {
      order_id: orderDetails._id,
      order_status: orderDetails.orderStatus ?? "unknown",
      payment_status: orderDetails.paymentStatus ?? "unknown",
      order_value: orderValue,
      currency: "PHP",
      items_count: itemsCount,
      items,
      has_payment_proof: Boolean(orderDetails.paymentProof),
      is_payment_paid: orderDetails.paymentStatus === "paid",
      customer_id: user?.id ?? null,
      customer_email: user?.email ?? null,
      customer_name: user?.userName ?? null,
      delivery_option: orderDetails.deliveryOption ?? null,
      created_at: orderDetails.createdAt ?? null,
      updated_at: orderDetails.updatedAt ?? null,
    });

    trackedOrderRef.current = orderDetails._id;
  }, [orderDetails, user?.email, user?.id, user?.userName]);

  useEffect(() => {
    console.log("PaymentSuccessPage - orderId:", orderId);
    console.log("PaymentSuccessPage - location.state:", location.state);
    console.log("PaymentSuccessPage - reduxOrderId:", reduxOrderId);
    
    if (orderId) {
      setError(null);
      console.log("Dispatching getOrderDetails for orderId:", orderId);
      dispatch(getOrderDetails(orderId))
        .then((result) => {
          console.log("getOrderDetails result:", result);
          if (!result.payload?.success) {
            setError("Failed to load order details. Please try again.");
            toast({
              title: "Error loading order",
              description: "Could not fetch order details. Please try again later.",
              variant: "destructive",
            });
          }
        })
        .catch((err) => {
          console.error("Error fetching order details:", err);
          setError("An error occurred while loading order details.");
          toast({
            title: "Error occurred",
            description: "Failed to load order details. Please try again.",
            variant: "destructive",
          });
        });
    } else {
      // If no orderId, redirect back to shop
      console.log("No orderId found, redirecting to shop");
      toast({
        title: "No order found",
        description: "Redirecting to shop...",
        variant: "destructive",
      });
      setTimeout(() => {
        navigate("/shop/home");
      }, 2000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const handleDownloadReceipt = () => {
    if (!orderDetails) return;

    const eligibleStatuses = ["confirmed", "readyForPickup", "pickedUp"];
    if (!eligibleStatuses.includes(orderDetails.orderStatus)) {
      toast({
        title: "Receipt not available yet",
        description: "The admin must confirm your order before a receipt can be generated.",
        variant: "destructive",
      });
      return;
    }

    try {
      generateReceiptPDF(orderDetails);
      captureEvent("receipt_downloaded", {
        order_id: orderDetails._id,
        order_value: Number(orderDetails.totalAmount) || 0,
        customer_id: user?.id ?? null,
        customer_email: user?.email ?? null,
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error generating PDF",
        description: "Failed to generate receipt. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file (JPG, PNG, etc.)",
          variant: "destructive",
        });
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }
      setPaymentProofFile(file);
    }
  };

  const handleSubmitPaymentProof = async () => {
    if (!paymentProofFile) {
      toast({
        title: "No file selected",
        description: "Please select a payment proof image to upload",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await dispatch(
        submitPaymentProof({ id: orderId, paymentProofFile })
      );
      
      if (result.payload?.success) {
        toast({
          title: "Payment proof submitted successfully!",
          description: "Your payment has been confirmed. Thank you! Redirecting to your orders...",
          variant: "success",
        });
        captureEvent("payment_proof_submitted", {
          order_id: orderDetails._id,
          customer_id: user?.id ?? null,
          has_payment_proof: true,
        });
        // Refresh order details to get updated payment status
        dispatch(getOrderDetails(orderId));
        setPaymentProofFile(null);
        // Reset file input
        const fileInput = document.getElementById("payment-proof-input");
        if (fileInput) fileInput.value = "";
        // Redirect to orders page after a short delay
        setTimeout(() => {
          navigate("/shop/account?tab=orders");
        }, 1500);
      } else {
        toast({
          title: "Submission failed",
          description: "Please try again later",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error occurred",
        description: "Failed to submit payment proof. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Debug logging
  console.log("PaymentSuccessPage render - isLoading:", isLoading, "orderDetails:", orderDetails, "error:", error, "orderId:", orderId);

  // Show loading state
  if (isLoading && !orderDetails) {
    console.log("Showing loading state");
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg">Loading order details...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || (!isLoading && !orderDetails && orderId)) {
    return (
      <div className="container mx-auto p-5 max-w-4xl">
        <div className="mb-4">
          <BackButton fallbackPath="/shop/home" />
        </div>
        <Card className="p-6">
          <CardHeader className="p-0 pb-6">
            <CardTitle className="text-3xl text-destructive">Error Loading Order</CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-4">
            <p className="text-muted-foreground">
              {error || "Could not load order details. Please try again."}
            </p>
            <div className="flex gap-3">
              <Button onClick={() => navigate("/shop/account?tab=orders")} variant="outline">
                View My Orders
              </Button>
              <Button onClick={() => navigate("/shop/home")}>
                Continue Shopping
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If no orderId and not loading, redirect
  if (!orderId && !isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg">Redirecting...</p>
        </div>
      </div>
    );
  }

  // Safety check - if we still don't have orderDetails, show error
  if (!orderDetails) {
    return (
      <div className="container mx-auto p-5 max-w-4xl">
        <div className="mb-4">
          <BackButton fallbackPath="/shop/home" />
        </div>
        <Card className="p-6">
          <CardHeader className="p-0 pb-6">
            <CardTitle className="text-3xl text-destructive">Order Not Found</CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-4">
            <p className="text-muted-foreground">
              Could not find order details. Please check your orders or contact support.
            </p>
            <div className="flex gap-3">
              <Button onClick={() => navigate("/shop/account?tab=orders")} variant="outline">
                View My Orders
              </Button>
              <Button onClick={() => navigate("/shop/home")}>
                Continue Shopping
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPaymentPaid = orderDetails.paymentStatus === "paid";
  const hasPaymentProof = orderDetails.paymentProof;
  const orderStatus = orderDetails.orderStatus;
  const receiptEligibleStatuses = ["confirmed", "readyForPickup", "pickedUp"];
  const canDownloadReceipt = receiptEligibleStatuses.includes(orderStatus);

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
        // Refresh order details
        dispatch(getOrderDetails(orderDetails._id));
        if (user?.id) {
          dispatch(getAllOrdersByUserId({ userId: user.id }));
        }
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
    }
  };

  const handleUnarchive = async () => {
    if (!orderDetails?._id || !user?.id) return;

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
        // Refresh order details
        dispatch(getOrderDetails(orderDetails._id));
        if (user?.id) {
          dispatch(getAllOrdersByUserId({ userId: user.id }));
        }
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
    }
  };

  return (
    <div className="container mx-auto p-5 max-w-4xl">
      <div className="mb-4">
        <BackButton fallbackPath="/shop/home" />
      </div>
      <Card className="p-6">
        <CardHeader className="p-0 pb-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
            <div>
              <CardTitle className="text-3xl">Order Placed Successfully!</CardTitle>
              <CardDescription className="text-base mt-2">
                Your order has been received. {canDownloadReceipt
                  ? "You can now download your receipt or submit payment proof."
                  : "You'll be able to download your receipt once an admin confirms your order."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0 space-y-6">
          {/* Order Summary */}
          <div className="bg-secondary/10 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-3">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order ID:</span>
                <span className="font-mono text-xs">{formatOrderId(orderDetails._id, orderDetails?.sequentialOrderNumber)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Amount:</span>
                <span className="font-bold">₱{formatCurrency(orderDetails.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Status:</span>
                <span className={`font-semibold ${
                  isPaymentPaid ? "text-green-600" : "text-yellow-600"
                }`}>
                  {orderDetails.paymentStatus?.toUpperCase() || "PENDING"}
                </span>
              </div>
              {!isPaymentPaid && (
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Payment Deadline:
                  </span>
                  <div className="text-right">
                    {deadlineInfo ? (
                      <>
                        <span className={`font-semibold ${
                          deadlineInfo.isExpired 
                            ? "text-red-600" 
                            : deadlineInfo.isUrgent 
                            ? "text-orange-600" 
                            : deadlineInfo.isWarning 
                            ? "text-yellow-600" 
                            : "text-foreground"
                        }`}>
                          {deadlineInfo.deadline.toLocaleDateString()} {deadlineInfo.deadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {!deadlineInfo.isExpired && (
                          <p className={`text-xs mt-1 ${
                            deadlineInfo.isUrgent 
                              ? "text-orange-600 font-semibold" 
                              : deadlineInfo.isWarning 
                              ? "text-yellow-600 font-semibold" 
                              : "text-muted-foreground"
                          }`}>
                            {deadlineInfo.daysRemaining > 0 
                              ? `${deadlineInfo.daysRemaining} day${deadlineInfo.daysRemaining !== 1 ? 's' : ''} remaining`
                              : `${deadlineInfo.hoursRemaining} hour${deadlineInfo.hoursRemaining !== 1 ? 's' : ''} remaining`}
                          </p>
                        )}
                        {deadlineInfo.isExpired && (
                          <p className="text-xs mt-1 text-red-600 font-semibold">
                            Deadline has passed
                          </p>
                        )}
                      </>
                    ) : (
                      <span className="text-muted-foreground text-sm italic">
                        Will start after admin confirms order
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Ordered Products */}
          {orderDetails.cartItems && orderDetails.cartItems.length > 0 && (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-3">Ordered Products</h3>
              <div className="space-y-3">
                {orderDetails.cartItems.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
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
                      <h4 className="font-semibold text-foreground truncate">{item.title}</h4>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="text-muted-foreground">Qty: <span className="font-medium text-foreground">{item.quantity}</span></span>
                        <span className="text-muted-foreground">Price: <span className="font-semibold text-primary">₱{formatCurrency(item.price)}</span></span>
                      </div>
                      <div className="mt-1 text-sm font-semibold text-foreground">
                        Subtotal: <span className="text-primary">₱{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Download Receipt Section */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Download className="h-5 w-5" />
              Download Receipt
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {canDownloadReceipt
                ? "Download your payment receipt as a PDF file for your records."
                : "Receipts become available after an admin confirms your order."}
            </p>
            <Button
              onClick={handleDownloadReceipt}
              variant="outline"
              className="w-full sm:w-auto"
              disabled={!canDownloadReceipt}
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF Receipt
            </Button>
          </div>

          {/* Payment Proof Submission Section */}
          {!isPaymentPaid && (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Submit Payment Proof
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {canDownloadReceipt
                  ? "Upload a screenshot or photo of your payment confirmation to verify your payment."
                  : "Payment proof submission will be available once an admin confirms your order."}
              </p>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="payment-proof-input">Payment Proof Image</Label>
                  <Input
                    id="payment-proof-input"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="cursor-pointer"
                    disabled={!canDownloadReceipt}
                  />
                  <p className="text-xs text-muted-foreground">
                    {canDownloadReceipt
                      ? "Accepted formats: JPG, PNG, GIF (Max 5MB)"
                      : "Please wait for admin confirmation before submitting payment proof."}
                  </p>
                </div>

                {paymentProofFile && (
                  <div className="flex items-center gap-2 p-3 bg-secondary/10 rounded-lg">
                    <FileImage className="h-5 w-5 text-primary" />
                    <span className="text-sm flex-1">{paymentProofFile.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPaymentProofFile(null);
                        const fileInput = document.getElementById("payment-proof-input");
                        if (fileInput) fileInput.value = "";
                      }}
                      disabled={!canDownloadReceipt}
                    >
                      Remove
                    </Button>
                  </div>
                )}

                <Button
                  onClick={handleSubmitPaymentProof}
                  disabled={!canDownloadReceipt || !paymentProofFile || isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? (
                    "Submitting..."
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Submit Payment Proof
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Payment Already Submitted */}
          {isPaymentPaid && hasPaymentProof && (
            <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-950/20">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-lg text-green-700 dark:text-green-400">
                  Payment Confirmed
                </h3>
              </div>
              <p className="text-sm text-green-600 dark:text-green-400">
                Your payment proof has been submitted and verified. Thank you!
              </p>
            </div>
          )}

          {/* Archive/Unarchive Section */}
          {(canArchive() || orderDetails?.isArchived) && (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-3">Archive Management</h3>
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
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={() => navigate("/shop/account?tab=orders")}
              variant="outline"
              className="flex-1"
            >
              View My Orders
            </Button>
            <Button
              onClick={() => navigate("/shop/home")}
              className="flex-1"
            >
              Continue Shopping
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default PaymentSuccessPage;
