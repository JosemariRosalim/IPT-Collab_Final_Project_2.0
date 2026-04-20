import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import StarRatingComponent from "@/components/common/star-rating";
import { useToast } from "@/components/ui/use-toast";
import {
  getProductReviewsForAdmin,
  hideReview,
  unhideReview,
} from "@/store/admin/review-slice";
import { Eye, EyeOff, Loader2, Package } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { categoryOptionsMap } from "@/config";

function ProductReviewsDialog({ open, onOpenChange, product }) {
  const dispatch = useDispatch();
  const { toast } = useToast();
  const { reviews, isLoading } = useSelector((state) => state.adminReview);

  useEffect(() => {
    if (open && product?._id) {
      dispatch(getProductReviewsForAdmin(product._id));
    }
  }, [open, product?._id, dispatch]);

  const handleHideReview = async (reviewId) => {
    try {
      const result = await dispatch(hideReview(reviewId));
      if (result.payload?.success) {
        toast({
          title: "Review hidden successfully",
          variant: "success",
        });
        // Refresh reviews
        dispatch(getProductReviewsForAdmin(product._id));
      } else {
        toast({
          title: "Failed to hide review",
          description: result.payload?.message || "An error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Failed to hide review",
        description: "An error occurred",
        variant: "destructive",
      });
    }
  };

  const handleUnhideReview = async (reviewId) => {
    try {
      const result = await dispatch(unhideReview(reviewId));
      if (result.payload?.success) {
        toast({
          title: "Review unhidden successfully",
          variant: "success",
        });
        // Refresh reviews
        dispatch(getProductReviewsForAdmin(product._id));
      } else {
        toast({
          title: "Failed to unhide review",
          description: result.payload?.message || "An error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Failed to unhide review",
        description: "An error occurred",
        variant: "destructive",
      });
    }
  };

  // Calculate average rating from visible reviews
  const averageRating = useMemo(() => {
    if (!reviews || reviews.length === 0) return 0;
    const visibleReviews = reviews.filter((r) => !r.isHidden);
    if (visibleReviews.length === 0) return 0;
    return (
      visibleReviews.reduce((sum, review) => sum + review.reviewValue, 0) /
      visibleReviews.length
    );
  }, [reviews]);

  const isOutOfStock = product?.totalStock === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Product Details & Reviews</DialogTitle>
        </DialogHeader>

        {/* Product Information Section */}
        {product && (
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Product Image */}
              <div
                className={`relative rounded-lg bg-muted/30 flex items-center justify-center p-4 min-h-[200px] ${
                  isOutOfStock ? "grayscale opacity-75" : ""
                }`}
              >
                <img
                  src={product?.image}
                  alt={product?.title}
                  className={`max-w-full max-h-[300px] object-contain rounded ${
                    isOutOfStock ? "grayscale" : ""
                  }`}
                />
              </div>

              {/* Product Details */}
              <div className="flex flex-col space-y-4">
                <div>
                  <h2
                    className={`text-2xl font-bold mb-2 ${
                      isOutOfStock ? "text-gray-600" : ""
                    }`}
                  >
                    {product?.title}
                  </h2>
                  <p className="text-muted-foreground text-sm mb-4">
                    {product?.description || "No description available"}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <p
                    className={`text-3xl font-bold ${
                      isOutOfStock ? "text-gray-600" : "text-primary"
                    }`}
                  >
                    ₱{formatCurrency(product?.price)}
                  </p>
                  <Badge
                    className={`${
                      product?.totalStock === 0
                        ? "bg-red-500 hover:bg-red-600"
                        : product?.totalStock < 10
                        ? "bg-orange-500 hover:bg-orange-600"
                        : "bg-green-500 hover:bg-green-600"
                    }`}
                  >
                    {product?.totalStock === 0
                      ? "Out of Stock"
                      : `${product?.totalStock} available`}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      <StarRatingComponent rating={averageRating} />
                    </div>
                    <span className="text-muted-foreground text-sm">
                      ({averageRating.toFixed(2)})
                    </span>
                    <span className="text-muted-foreground text-sm">
                      ({reviews?.filter((r) => !r.isHidden).length || 0} reviews)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1 p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Category</p>
                    <p className="font-semibold text-sm">
                      {categoryOptionsMap[product?.category] || "Not specified"}
                    </p>
                  </div>
                  <div className="space-y-1 p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Stock</p>
                    <div className="flex items-center gap-1">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <p className="font-semibold text-sm">
                        {product?.totalStock || 0} units
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <Separator className="my-6" />

        {/* Reviews Section */}
        <div>
          <h3 className="text-xl font-semibold mb-4">Customer Reviews</h3>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : reviews && reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div
                  key={review._id}
                  className={`p-4 rounded-lg border ${
                    review.isHidden
                      ? "bg-muted/50 opacity-60 border-dashed"
                      : "bg-card"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <Avatar className="h-10 w-10 border">
                        <AvatarFallback>
                          {review?.userName?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{review?.userName}</h3>
                          {review.isHidden && (
                            <Badge variant="secondary" className="text-xs">
                              Hidden
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <StarRatingComponent rating={review?.reviewValue} />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {review?.reviewMessage}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(review?.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {review.isHidden ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnhideReview(review._id)}
                          className="flex items-center gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          Unhide
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleHideReview(review._id)}
                          className="flex items-center gap-2"
                        >
                          <EyeOff className="h-4 w-4" />
                          Hide
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No reviews yet for this product.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ProductReviewsDialog;

