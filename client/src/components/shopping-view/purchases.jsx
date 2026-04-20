import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { useDispatch, useSelector } from "react-redux";
import { formatCurrency } from "@/lib/utils";
import { getAllOrdersByUserId, archiveOrder, unarchiveOrder } from "@/store/shop/order-slice";
import { ArchiveConfirmationDialog } from "../common/archive-confirmation-dialog";
import { addToCart, fetchCartItems } from "@/store/shop/cart-slice";
import { useToast } from "../ui/use-toast";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import StarRatingComponent from "../common/star-rating";
import { addReview, getReviews } from "@/store/shop/review-slice";
import { ShoppingCart, Star, Archive, ArchiveRestore, ArrowLeft } from "lucide-react";

function RatingDialog({ open, onOpenChange, product, orderId }) {
  const [rating, setRating] = useState(0);
  const [reviewMsg, setReviewMsg] = useState("");
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { reviews } = useSelector((state) => state.shopReview);
  const { toast } = useToast();

  useEffect(() => {
    if (product && open) {
      dispatch(getReviews(product.productId));
    }
  }, [product, open, dispatch]);

  function handleRatingChange(getRating) {
    setRating(getRating);
  }

  function handleAddReview() {
    if (rating === 0) {
      toast({
        title: "Please select a rating",
        variant: "destructive",
      });
      return;
    }

    if (!reviewMsg.trim()) {
      toast({
        title: "Please write a review message",
        variant: "destructive",
      });
      return;
    }

    dispatch(
      addReview({
        productId: product?.productId,
        userId: user?.id,
        userName: user?.userName,
        reviewMessage: reviewMsg,
        reviewValue: rating,
      })
    ).then((data) => {
      if (data.payload.success) {
        setRating(0);
        setReviewMsg("");
        dispatch(getReviews(product?.productId));
        toast({
          title: "Review added successfully!",
          variant: "success",
        });
        onOpenChange(false);
      } else {
        toast({
          title: data.payload.message || "Failed to add review",
          variant: "destructive",
        });
      }
    });
  }

  // Check if user already reviewed this product
  const existingReview = reviews?.find(
    (r) => String(r.userId) === String(user?.id)
  );

  function handleDialogClose() {
    setRating(0);
    setReviewMsg("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Rate Product</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <img
              src={product?.image}
              alt={product?.title}
              className="w-16 h-16 object-contain rounded"
            />
            <div>
              <h3 className="font-semibold">{product?.title}</h3>
              <p className="text-sm text-muted-foreground">₱{formatCurrency(product?.price)}</p>
            </div>
          </div>

          {existingReview ? (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                You have already reviewed this product.
              </p>
              <div className="mt-2">
                <div className="flex items-center gap-2 mb-2">
                  <StarRatingComponent rating={existingReview.reviewValue} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {existingReview.reviewMessage}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div>
                <Label>Rating</Label>
                <div className="flex items-center gap-2 mt-2">
                  <StarRatingComponent
                    rating={rating}
                    handleRatingChange={handleRatingChange}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="review-message">Your Review</Label>
                <Textarea
                  id="review-message"
                  placeholder="Share your experience with this product..."
                  value={reviewMsg}
                  onChange={(e) => setReviewMsg(e.target.value)}
                  className="mt-2 min-h-[100px]"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleDialogClose}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button onClick={handleAddReview} className="flex-1">
                  Submit Review
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ShoppingPurchases() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { orderList } = useSelector((state) => state.shopOrder);
  const { toast } = useToast();
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [openArchiveDialog, setOpenArchiveDialog] = useState(false);
  const [orderToArchive, setOrderToArchive] = useState(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isArchivingMode, setIsArchivingMode] = useState(true);

  useEffect(() => {
    if (user?.id) {
      dispatch(getAllOrdersByUserId({ userId: user.id, archived: showArchived ? "true" : "false" }));
    }
  }, [dispatch, user?.id, showArchived]);

  // Filter only successful purchases (paid orders)
  // Exclude archived orders when showing active purchases, include them when showing archived
  const successfulPurchases = orderList?.filter((order) => {
    const isPaid = order.paymentStatus === "paid";
    const matchesArchivedFilter = showArchived ? order.isArchived : !order.isArchived;
    return isPaid && matchesArchivedFilter;
  }) || [];

  function handleRateProduct(product, orderId) {
    setSelectedProduct(product);
    setSelectedOrderId(orderId);
    setRatingDialogOpen(true);
  }

  async function handleBuyAgain(order) {
    if (!order.cartItems || order.cartItems.length === 0) {
      toast({
        title: "No items to add to cart",
        variant: "destructive",
      });
      return;
    }

    try {
      // Add all items sequentially to ensure proper order
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
      
      // Refresh cart and show success message
      await dispatch(fetchCartItems(user?.id));
      toast({
        title: `Added ${order.cartItems.length} item(s) to cart!`,
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Some items could not be added to cart",
        variant: "destructive",
      });
    }
  }

  const handleArchivePurchase = async (order) => {
    if (!order._id || !user?.id) return;
    setOrderToArchive(order);
    setIsArchivingMode(true);
    setOpenArchiveDialog(true);
  };

  const handleArchiveConfirm = async () => {
    if (!orderToArchive?._id || !user?.id) return;

    setIsArchiving(true);
    try {
      const result = await dispatch(
        archiveOrder({ id: orderToArchive._id, userId: user.id })
      );

      if (result.payload?.success) {
        toast({
          title: "Purchase archived successfully",
          description: "The purchase has been moved to archived.",
          variant: "success",
        });
        dispatch(getAllOrdersByUserId({ userId: user.id, archived: showArchived ? "true" : "false" }));
        setOpenArchiveDialog(false);
        setOrderToArchive(null);
      } else {
        toast({
          title: "Failed to archive purchase",
          description: result.payload?.message || "Please try again later.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error occurred",
        description: "Failed to archive purchase. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsArchiving(false);
    }
  };

  const handleUnarchivePurchase = async (order) => {
    if (!order._id || !user?.id) return;
    setOrderToArchive(order);
    setIsArchivingMode(false);
    setOpenArchiveDialog(true);
  };

  const handleUnarchiveConfirm = async () => {
    if (!orderToArchive?._id || !user?.id) return;

    setIsArchiving(true);
    try {
      const result = await dispatch(
        unarchiveOrder({ id: orderToArchive._id, userId: user.id })
      );

      if (result.payload?.success) {
        toast({
          title: "Purchase restored successfully",
          description: "The purchase has been restored to your active purchases.",
          variant: "success",
        });
        dispatch(getAllOrdersByUserId({ userId: user.id, archived: showArchived ? "true" : "false" }));
        setOpenArchiveDialog(false);
        setOrderToArchive(null);
      } else {
        toast({
          title: "Failed to restore purchase",
          description: result.payload?.message || "Please try again later.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error occurred",
        description: "Failed to restore purchase. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsArchiving(false);
    }
  };

  if (successfulPurchases.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>My Purchases</CardTitle>
            <Button
              variant={showArchived ? "default" : "outline"}
              size="sm"
              onClick={() => setShowArchived(!showArchived)}
            >
              {showArchived ? (
                <>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4 mr-2" />
                  Show Archived Purchases
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{showArchived ? "No archived purchases yet." : "No successful purchases yet."}</p>
            <p className="text-sm mt-2">
              {showArchived 
                ? "Your archived purchases will appear here."
                : "Your successful purchases will appear here."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>My Purchases</CardTitle>
            <Button
              variant={showArchived ? "default" : "outline"}
              size="sm"
              onClick={() => setShowArchived(!showArchived)}
            >
              {showArchived ? (
                <>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4 mr-2" />
                  Show Archived Purchases
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {successfulPurchases.map((order) => {
              const pickedUpDate = order.orderStatus === "pickedUp" && order.orderUpdateDate
                ? new Date(order.orderUpdateDate).toLocaleDateString()
                : new Date(order.orderUpdateDate || order.orderDate).toLocaleDateString();
              
              return (
                <div
                  key={order._id}
                  className="border rounded-lg p-4 space-y-4 hover:shadow-md transition-shadow bg-white"
                >
                  {/* Order Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-muted-foreground">Order ID:</span>
                        <span className="font-semibold">{order._id.slice(-8).toUpperCase()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-muted-foreground">
                          {order.orderStatus === "pickedUp" ? "Picked up on:" : "Completed on:"}
                        </span>
                        <span>{pickedUpDate}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {order.orderStatus === "pickedUp" && (
                        <Badge className="bg-green-500 hover:bg-green-600 text-white">
                          Picked Up
                        </Badge>
                      )}
                      <Badge className="bg-green-500 hover:bg-green-600 text-white">
                        Paid
                      </Badge>
                      {order.isArchived && (
                        <Badge variant="outline" className="border-orange-500 text-orange-500">
                          Archived
                        </Badge>
                      )}
                      <span className="text-lg font-bold text-primary ml-auto">
                        ₱{order.totalAmount}
                      </span>
                    </div>
                  </div>

                  {/* Products */}
                  <div className="space-y-3">
                    {order.cartItems?.map((item, index) => (
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRateProduct(item, order._id)}
                          className="flex items-center gap-2 bg-sky-50 hover:bg-sky-100 border-sky-200 text-sky-700 flex-shrink-0"
                        >
                          <Star className="w-4 h-4" />
                          Rate
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Buy Again and Archive Actions */}
                  <div className="pt-3 border-t flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center">
                    <Button
                      variant="secondary"
                      onClick={() => handleBuyAgain(order)}
                      className="w-full sm:w-auto flex items-center gap-2"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Buy Again
                    </Button>
                    <div className="flex gap-2 w-full sm:w-auto">
                      {!order.isArchived && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleArchivePurchase(order)}
                          className="flex items-center gap-2"
                        >
                          <Archive className="w-4 h-4" />
                          Archive
                        </Button>
                      )}
                      {order.isArchived && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnarchivePurchase(order)}
                          className="flex items-center gap-2"
                        >
                          <ArchiveRestore className="w-4 h-4" />
                          Unarchive
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Rating Dialog */}
      <RatingDialog
        open={ratingDialogOpen}
        onOpenChange={setRatingDialogOpen}
        product={selectedProduct}
        orderId={selectedOrderId}
      />

      {/* Archive/Unarchive Confirmation Dialog */}
      <ArchiveConfirmationDialog
        open={openArchiveDialog}
        onOpenChange={setOpenArchiveDialog}
        isLoading={isArchiving}
        onConfirm={isArchivingMode ? handleArchiveConfirm : handleUnarchiveConfirm}
        archiveType="order"
        isArchiving={isArchivingMode}
        itemDetails={{
          itemId: orderToArchive?._id,
          paymentStatus: orderToArchive?.paymentStatus,
          totalAmount: orderToArchive?.totalAmount ? `₱${orderToArchive.totalAmount}` : undefined,
        }}
      />
    </>
  );
}

export default ShoppingPurchases;
