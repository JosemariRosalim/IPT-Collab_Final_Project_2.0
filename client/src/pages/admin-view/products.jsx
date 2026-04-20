import ProductImageUpload from "@/components/admin-view/image-upload";
import AdminProductTile from "@/components/admin-view/product-tile";
import ProductReviewsDialog from "@/components/admin-view/product-reviews-dialog";
import { ArchiveConfirmationDialog } from "@/components/common/archive-confirmation-dialog";
import CommonForm from "@/components/common/form";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/lib/utils";
import { categoryOptionsMap } from "@/config";
import { addProductFormElements } from "@/config";
import {
  addNewProduct,
  archiveProduct,
  unarchiveProduct,
  editProduct,
  fetchAllProducts,
  lockProduct,
  unlockProduct,
} from "@/store/admin/products-slice";
import { Fragment, useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getSocket, joinAdminRoom } from "@/utils/socket";

const initialFormData = {
  image: null,
  title: "",
  description: "",
  category: "",
  price: "",
  totalStock: "",
  averageReview: 0,
};

function AdminProducts() {
  const [openCreateProductsDialog, setOpenCreateProductsDialog] =
    useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showProductReviewsDialog, setShowProductReviewsDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [imageFile, setImageFile] = useState(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState("");
  const [imageLoadingState, setImageLoadingState] = useState(false);
  const [currentEditedId, setCurrentEditedId] = useState(null);
  const [openArchiveDialog, setOpenArchiveDialog] = useState(false);
  const [productToArchive, setProductToArchive] = useState(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isArchivingMode, setIsArchivingMode] = useState(true);

  const { productList } = useSelector((state) => state.adminProducts);
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const { toast } = useToast();

  function onSubmit(event) {
    event.preventDefault();

    // For editing, submit directly without review
    if (currentEditedId !== null) {
      dispatch(
        editProduct({
          id: currentEditedId,
          formData: {
            ...formData,
            userId: user?.id, // Include userId for 2PL
          },
        })
      ).then((data) => {
        console.log(data, "edit");

        if (data?.payload?.success) {
          dispatch(fetchAllProducts());
          setFormData(initialFormData);
          setOpenCreateProductsDialog(false);
          setCurrentEditedId(null);
          toast({
            title: "Product updated successfully",
            variant: "success",
          });
        } else if (data?.payload?.message) {
          toast({
            title: "Failed to update product",
            description: data?.payload?.message,
            variant: "destructive",
          });
        }
      });
    } else {
      // For new products, show review dialog first
      setShowReviewDialog(true);
    }
  }

  function handleConfirmAdd() {
    dispatch(
      addNewProduct({
        ...formData,
        image: uploadedImageUrl,
      })
    ).then((data) => {
      if (data?.payload?.success) {
        dispatch(fetchAllProducts());
        setOpenCreateProductsDialog(false);
        setShowReviewDialog(false);
        setImageFile(null);
        setFormData(initialFormData);
        setUploadedImageUrl("");
        toast({
          title: "Product added successfully",
          variant: "success",
        });
      }
    });
  }

  function handleBackToEdit() {
    setShowReviewDialog(false);
  }

  function handleArchive(getCurrentProductId, product) {
    if (!user?._id && !user?.id) {
      toast({
        title: "Authentication required",
        description: "Please log in again to archive products.",
        variant: "destructive",
      });
      return;
    }

    setProductToArchive({ id: getCurrentProductId, ...product });
    setIsArchivingMode(true);
    setOpenArchiveDialog(true);
  }

  function handleArchiveConfirm() {
    if (!productToArchive?.id) return;

    setIsArchiving(true);
    const adminId = user?._id || user?.id;
    dispatch(archiveProduct({ id: productToArchive.id, adminId }))
      .then((data) => {
        if (data?.payload?.success) {
          toast({
            title: "Product archived successfully",
            description: data?.payload?.message || "The product has been archived.",
            variant: "success",
          });
          dispatch(fetchAllProducts());
          setOpenArchiveDialog(false);
          setProductToArchive(null);
        } else {
          toast({
            title: "Failed to archive product",
            description: data?.payload?.message || "Please try again later.",
            variant: "destructive",
          });
        }
      })
      .finally(() => {
        setIsArchiving(false);
      });
  }

  function handleUnarchive(getCurrentProductId, product) {
    if (!user?._id && !user?.id) {
      toast({
        title: "Authentication required",
        description: "Please log in again to unarchive products.",
        variant: "destructive",
      });
      return;
    }

    setProductToArchive({ id: getCurrentProductId, ...product });
    setIsArchivingMode(false);
    setOpenArchiveDialog(true);
  }

  function handleUnarchiveConfirm() {
    if (!productToArchive?.id) return;

    setIsArchiving(true);
    const adminId = user?._id || user?.id;
    dispatch(unarchiveProduct({ id: productToArchive.id, adminId }))
      .then((data) => {
        if (data?.payload?.success) {
          toast({
            title: "Product unarchived successfully",
            description: data?.payload?.message || "The product has been unarchived.",
            variant: "success",
          });
          dispatch(fetchAllProducts());
          setOpenArchiveDialog(false);
          setProductToArchive(null);
        } else {
          toast({
            title: "Failed to unarchive product",
            description: data?.payload?.message || "Please try again later.",
            variant: "destructive",
          });
        }
      })
      .finally(() => {
        setIsArchiving(false);
      });
  }

  // Handle acquiring lock when starting to edit (2PL - Phase 1: Growing Phase)
  function handleEditProduct(product) {
    if (!user?.id) {
      toast({
        title: "Authentication required",
        description: "Please log in to edit products",
        variant: "destructive",
      });
      return;
    }

    // Attempt to acquire lock
    dispatch(lockProduct({ 
      id: product._id, 
      userId: user.id,
      userName: user.userName 
    })).then((data) => {
      if (data?.payload?.success) {
        // Lock acquired successfully
        setOpenCreateProductsDialog(true);
        setCurrentEditedId(product._id);
        setFormData(product);
        toast({
          title: "Edit mode activated",
          description: "You have 5 minutes to edit this product. The lock will automatically expire after that.",
          variant: "success",
        });
      } else {
        // Lock acquisition failed (product locked by another user)
        toast({
          title: "Product is locked",
          description: data?.payload?.message || "This product is currently being edited by another user",
          variant: "destructive",
        });
      }
    });
  }

  // Handle releasing lock when closing dialog (2PL - Phase 2: Shrinking Phase)
  function handleCloseDialog() {
    if (currentEditedId && user?.id) {
      // Release the lock
      dispatch(unlockProduct({ id: currentEditedId, userId: user.id })).then((data) => {
        if (data?.payload?.success) {
          console.log("Lock released successfully");
        }
      });
    }
    setOpenCreateProductsDialog(false);
    setCurrentEditedId(null);
    setFormData(initialFormData);
  }

  function handleViewReviews(product) {
    setSelectedProduct(product);
    setShowProductReviewsDialog(true);
  }

  function isFormValid() {
    return Object.keys(formData)
      .filter((currentKey) => currentKey !== "averageReview")
      .map((key) => formData[key] !== "")
      .every((item) => item);
  }

  useEffect(() => {
    dispatch(fetchAllProducts());
  }, [dispatch]);

  // Socket.IO real-time updates
  useEffect(() => {
    console.log("[Socket Client] Setting up socket listeners...");
    
    // Initialize socket and join admin room
    const socket = getSocket();
    
    // Remove any existing listeners first to prevent duplicates
    socket.off("product-updated");
    socket.off("admin-room-joined");
    
    // Listen for admin room join confirmation
    const handleAdminRoomJoined = (data) => {
      console.log("[Socket Client] ✅ Confirmed joined admin-room:", data);
    };

    // Listen for product updates
    const handleProductUpdate = (data) => {
      console.log("[Socket Client] 🔔 Product update received:", data);
      console.log("[Socket Client] Action:", data.action);
      console.log("[Socket Client] Product:", data.product?.title);
      // Refresh product list when any product is updated
      dispatch(fetchAllProducts());
    };

    socket.on("admin-room-joined", handleAdminRoomJoined);
    socket.on("product-updated", handleProductUpdate);
    console.log("[Socket Client] Listeners attached for: admin-room-joined, product-updated");

    // Join admin room after listeners are set up
    joinAdminRoom();

    // Cleanup
    return () => {
      console.log("[Socket Client] Cleaning up socket listeners");
      socket.off("admin-room-joined", handleAdminRoomJoined);
      socket.off("product-updated", handleProductUpdate);
    };
  }, [dispatch]);

  console.log(formData, "productList");

  return (
    <Fragment>
      <div className="mb-5 w-full flex justify-end">
        <Button onClick={() => setOpenCreateProductsDialog(true)}>
          Add New Product
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        {productList && productList.length > 0
          ? productList.map((productItem) => (
              <AdminProductTile
                key={productItem._id}
                handleEdit={handleEditProduct}
                product={productItem}
                handleArchive={handleArchive}
                handleUnarchive={handleUnarchive}
                handleViewReviews={handleViewReviews}
                currentUser={user}
              />
            ))
          : null}
      </div>
      <Sheet
        open={openCreateProductsDialog}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseDialog();
          }
        }}
      >
        <SheetContent side="right" className="overflow-auto">
          <SheetHeader>
            <SheetTitle>
              {currentEditedId !== null ? "Edit Product" : "Add New Product"}
            </SheetTitle>
          </SheetHeader>
          <ProductImageUpload
            imageFile={imageFile}
            setImageFile={setImageFile}
            uploadedImageUrl={uploadedImageUrl}
            setUploadedImageUrl={setUploadedImageUrl}
            setImageLoadingState={setImageLoadingState}
            imageLoadingState={imageLoadingState}
            isEditMode={currentEditedId !== null}
          />
          <div className="py-6">
            <CommonForm
              onSubmit={onSubmit}
              formData={formData}
              setFormData={setFormData}
              buttonText={currentEditedId !== null ? "Edit" : "Add"}
              formControls={addProductFormElements}
              isBtnDisabled={!isFormValid()}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Review/Verification Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-primary">
              Review Product Details
            </DialogTitle>
            <DialogDescription>
              Please verify all information is correct before adding the product to the system.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Product Image Preview */}
            {uploadedImageUrl && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground">Product Image</h3>
                <div className="relative w-full rounded-lg border-2 border-primary/20 bg-muted/30 p-4 flex items-center justify-center">
                  <img
                    src={uploadedImageUrl}
                    alt="Product Preview"
                    className="max-w-full max-h-96 object-contain rounded"
                  />
                </div>
              </div>
            )}

            {/* Product Details */}
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Category</p>
                  <p className="font-semibold text-primary">
                    {categoryOptionsMap[formData.category] || "Not selected"}
                  </p>
                </div>
                <div className="space-y-1 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Stock Quantity</p>
                  <p className="font-semibold text-primary">
                    {formData.totalStock || "0"} units
                  </p>
                </div>
              </div>

              <div className="space-y-1 p-3 bg-secondary/10 rounded-lg border border-secondary/30">
                <p className="text-xs text-muted-foreground">Product Name</p>
                <p className="font-bold text-lg">{formData.title || "Not provided"}</p>
              </div>

              <div className="space-y-1 p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Description</p>
                <p className="text-sm">{formData.description || "Not provided"}</p>
              </div>

              <div className="space-y-1 p-3 bg-primary/10 rounded-lg border border-primary/30">
                <p className="text-xs text-muted-foreground">Price</p>
                <p className="font-bold text-2xl text-primary">
                  ₱{formatCurrency(formData.price || 0)}
                </p>
              </div>
            </div>

            {/* Warning if missing image */}
            {!uploadedImageUrl && (
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-lg border border-orange-300 dark:border-orange-700">
                <p className="text-sm font-semibold">⚠️ No product image uploaded</p>
                <p className="text-xs mt-1">It's recommended to add an image before publishing.</p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleBackToEdit}
            >
              Go Back to Edit
            </Button>
            <Button
              type="button"
              onClick={handleConfirmAdd}
              className="bg-primary hover:bg-primary/90"
            >
              Confirm & Add Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Reviews Dialog */}
      <ProductReviewsDialog
        open={showProductReviewsDialog}
        onOpenChange={setShowProductReviewsDialog}
        product={selectedProduct}
      />

      {/* Archive/Unarchive Confirmation Dialog */}
      <ArchiveConfirmationDialog
        open={openArchiveDialog}
        onOpenChange={setOpenArchiveDialog}
        isLoading={isArchiving}
        onConfirm={isArchivingMode ? handleArchiveConfirm : handleUnarchiveConfirm}
        archiveType="product"
        isArchiving={isArchivingMode}
        itemDetails={{
          itemId: productToArchive?._id,
          itemTitle: productToArchive?.title,
          price: productToArchive?.price ? `₱${productToArchive.price}` : undefined,
          status: productToArchive?.totalStock === 0 ? "Out of Stock" : "In Stock",
        }}
      />
    </Fragment>
  );
}

export default AdminProducts;
