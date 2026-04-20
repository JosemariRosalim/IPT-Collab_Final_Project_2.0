import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Archive, ArchiveRestore } from "lucide-react";

export function ArchiveConfirmationDialog({
  open,
  onOpenChange,
  isLoading,
  onConfirm,
  archiveType = "item",
  isArchiving = true,
  itemDetails = {},
}) {
  const getTitle = () => {
    if (isArchiving) {
      switch (archiveType) {
        case "product":
          return "Archive Product";
        case "order":
          return "Archive Order";
        case "admin":
          return "Archive Admin";
        default:
          return "Archive Item";
      }
    }

    switch (archiveType) {
      case "product":
        return "Unarchive Product";
      case "order":
        return "Unarchive Order";
      case "admin":
        return "Unarchive Admin";
      default:
        return "Unarchive Item";
    }
  };

  const getDescription = () => {
    if (isArchiving) {
      switch (archiveType) {
        case "product":
          return "Are you sure you want to archive this product? Archived products will not be visible to customers.";
        case "order":
          return "Are you sure you want to archive this order? Archived orders will be moved to the archive section.";
        case "admin":
          return "Are you sure you want to archive this admin? Archived admins will not be able to access the system.";
        default:
          return "Are you sure you want to archive this item?";
      }
    }

    switch (archiveType) {
      case "product":
        return "Are you sure you want to unarchive this product? The product will become visible to customers again.";
      case "order":
        return "Are you sure you want to unarchive this order? The order will reappear in the main orders list.";
      case "admin":
        return "Are you sure you want to unarchive this admin? This admin will be able to access the system again.";
      default:
        return "Are you sure you want to unarchive this item?";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <DialogTitle>{getTitle()}</DialogTitle>
          </div>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {Object.keys(itemDetails).length > 0 && (
            <div className="p-3 bg-secondary/10 rounded-lg">
              {itemDetails.itemId && (
                <p className="text-sm">
                  <strong>ID:</strong> {itemDetails.itemId}
                </p>
              )}
              {(itemDetails.itemName || itemDetails.itemTitle) && (
                <p className="text-sm">
                  <strong>Name:</strong> {itemDetails.itemName || itemDetails.itemTitle}
                </p>
              )}
              {itemDetails.status && (
                <p className="text-sm">
                  <strong>Status:</strong> {itemDetails.status}
                </p>
              )}
              {itemDetails.orderStatus && (
                <p className="text-sm">
                  <strong>Order Status:</strong> {itemDetails.orderStatus}</p>
              )}
              {itemDetails.paymentStatus && (
                <p className="text-sm">
                  <strong>Payment Status:</strong> {itemDetails.paymentStatus}</p>
              )}
              {itemDetails.totalAmount && (
                <p className="text-sm">
                  <strong>Total Amount:</strong> {itemDetails.totalAmount}</p>
              )}
            </div>
          )}

          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
            <p className="text-sm text-orange-800 dark:text-orange-200 font-medium">
              {isArchiving
                ? "⚠️ Warning: This action will archive the item. You can unarchive it later if needed."
                : "⚠️ Warning: This action will unarchive the item."}
            </p>
          </div>
        </div>

        <DialogFooter>
          <div className="flex flex-col sm:flex-row gap-2 justify-end w-full">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={onConfirm}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isArchiving ? <Archive className="h-4 w-4" /> : <ArchiveRestore className="h-4 w-4" />}
              {isLoading ? "Processing..." : isArchiving ? "Yes, Archive" : "Yes, Unarchive"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
