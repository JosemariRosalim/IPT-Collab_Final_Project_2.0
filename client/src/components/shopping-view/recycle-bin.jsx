import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Dialog } from "../ui/dialog";
import ShoppingOrderDetailsView from "./order-details";
import {
  getAllOrdersByUserId,
  getOrderDetails,
  resetOrderDetails,
  deleteCancelledOrder,
} from "@/store/shop/order-slice";
import { addToCart, fetchCartItems } from "@/store/shop/cart-slice";
import { useToast } from "../ui/use-toast";
import { ArrowLeft, ShoppingCart, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatOrderId } from "@/lib/utils";

const formatDateTime = (dateInput) => {
  if (!dateInput) return "N/A";

  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

function ShoppingRecycleBin({ onBack }) {
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { orderList, orderDetails, isLoading } = useSelector(
    (state) => state.shopOrder
  );
  const { toast } = useToast();

  useEffect(() => {
    dispatch(resetOrderDetails());
  }, [dispatch]);

  useEffect(() => {
    if (user?.id) {
      dispatch(getAllOrdersByUserId({ userId: user.id }));
    }
  }, [dispatch, user?.id]);

useEffect(() => {
  if (orderDetails) {
    setOpenDetailsDialog(true);
  } else {
    setOpenDetailsDialog(false);
  }
}, [orderDetails]);

  const cancelledOrders = useMemo(
    () =>
      orderList?.filter((order) => order.orderStatus === "cancelled") || [],
    [orderList]
  );

  const handleFetchOrderDetails = (orderId) => {
    if (!orderId) {
      return;
    }
    dispatch(getOrderDetails(orderId));
  };

  const handleDialogToggle = (open) => {
    if (!open) {
      dispatch(resetOrderDetails());
    }
    setOpenDetailsDialog(open);
  };

  const handleBuyAgain = async (order) => {
    if (!order || !order.cartItems || order.cartItems.length === 0 || !user?.id) {
      toast({
        title: "No items to add to cart",
        variant: "destructive",
      });
      return;
    }

    setProcessingId(order._id);
    try {
      // Add all items sequentially to ensure proper order
      const promises = order.cartItems.map((item) =>
        dispatch(
          addToCart({
            productId: item.productId,
            quantity: item.quantity,
          })
        )
      );

      await Promise.all(promises);
      
      // Refresh cart and show success message
      await dispatch(fetchCartItems());
      toast({
        title: `Added ${order.cartItems.length} item(s) to cart!`,
        variant: "success",
      });

      // Navigate to checkout page
      navigate("/shop/checkout");
    } catch (error) {
      toast({
        title: "Some items could not be added to cart",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!orderId || !user?.id) return;

    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this cancelled order? This action cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    setProcessingId(orderId);
    try {
      const result = await dispatch(
        deleteCancelledOrder({ id: orderId, userId: user.id })
      ).unwrap();

      toast({
        title: "Order deleted",
        description:
          result.message || "The cancelled order has been removed permanently.",
        variant: "success",
      });

      dispatch(getAllOrdersByUserId({ userId: user.id }));
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
      setProcessingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <CardTitle>Recycle Bin</CardTitle>
              <Badge variant="outline" className="uppercase tracking-wide">
                View Cancelled Orders
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Buy again or permanently delete orders you have cancelled.
            </p>
          </div>
          <Button
            variant="ghost"
            className="flex items-center gap-2"
            onClick={() => {
              if (onBack) {
                onBack();
              } else {
                navigate("/shop/account?tab=orders");
              }
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && cancelledOrders.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <p>Loading cancelled orders…</p>
          </div>
        ) : cancelledOrders.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground space-y-4">
            <Trash2 className="w-12 h-12 mx-auto opacity-40" />
            <div>
              <p className="font-medium">No cancelled orders yet.</p>
              <p className="text-sm mt-1">
                Orders that you cancel will appear here for quick reference.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Cancelled On</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Payment Status</TableHead>
                    <TableHead>Cancellation Reason</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cancelledOrders.map((order) => (
                    <TableRow key={order._id}>
                      <TableCell className="font-medium break-all">
                        {formatOrderId(order._id, order.sequentialOrderNumber)}
                      </TableCell>
                      <TableCell>
                        {formatDateTime(order.orderUpdateDate || order.orderDate)}
                      </TableCell>
                      <TableCell>{order.orderDate?.split("T")[0]}</TableCell>
                      <TableCell>
                        <Badge
                          className={`py-1 px-3 ${
                            order.paymentStatus === "paid"
                              ? "bg-green-500 hover:bg-green-600"
                              : order.paymentStatus === "failed"
                              ? "bg-red-600 hover:bg-red-700"
                              : "bg-yellow-500 hover:bg-yellow-600"
                          }`}
                        >
                          {order.paymentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {order.cancellationReason ? (
                          <Badge className="bg-red-600 hover:bg-red-700 text-white">
                            {order.cancellationReason}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>₱{order.totalAmount}</TableCell>
                      <TableCell>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleFetchOrderDetails(order._id)}
                          >
                            View Details
                          </Button>
                          {/* Only show buy again button if order was not cancelled due to failure to pay */}
                          {order.cancellationReason !== "Cancelled due to failure to pay" && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleBuyAgain(order)}
                              disabled={processingId === order._id}
                              className="flex items-center gap-2"
                            >
                              <ShoppingCart className="h-4 w-4" />
                              Buy Again
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteOrder(order._id)}
                            disabled={processingId === order._id}
                            className="flex items-center gap-2"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>

      <Dialog open={openDetailsDialog} onOpenChange={handleDialogToggle}>
        {orderDetails && (
          <ShoppingOrderDetailsView orderDetails={orderDetails} />
        )}
      </Dialog>
    </Card>
  );
}

export default ShoppingRecycleBin;

