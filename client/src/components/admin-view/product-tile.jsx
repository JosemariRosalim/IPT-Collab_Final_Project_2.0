import { Button } from "../ui/button";
import { Card, CardContent, CardFooter } from "../ui/card";
import { Badge } from "../ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Package, Lock, Edit3 } from "lucide-react";

function AdminProductTile({
  product,
  handleEdit,
  handleArchive,
  handleUnarchive,
  handleViewReviews,
  currentUser,
}) {
  const isArchived = product?.isArchived;
  const isOutOfStock = product?.totalStock === 0;
  const isLocked = product?.isLocked;
  const isLockedByCurrentUser = isLocked && product?.lockedBy === currentUser?.id;
  const isLockedByOther = isLocked && !isLockedByCurrentUser;
  const shouldGrayOut = isArchived || isOutOfStock;
  
  return (
    <Card className={`w-full max-w-sm mx-auto hover:shadow-xl hover:scale-105 hover:-translate-y-1 transition-all duration-300 ease-in-out ${shouldGrayOut ? 'grayscale opacity-75' : ''}`}>
      <div>
        <div 
          className="relative overflow-hidden cursor-pointer"
          onClick={() => handleViewReviews && handleViewReviews(product)}
          title="Click to view reviews"
        >
          <img
            src={product?.image}
            alt={product?.title}
            className={`w-full h-[200px] object-cover rounded-t-lg transition-transform duration-500 ease-in-out hover:scale-110 ${shouldGrayOut ? 'grayscale' : ''}`}
          />
          {isArchived && (
            <Badge className="absolute top-2 left-2 bg-gray-600 hover:bg-gray-700 text-xs text-white">
              Archived
            </Badge>
          )}
          {isLockedByOther && (
            <Badge className="absolute top-10 left-2 bg-yellow-600 hover:bg-yellow-700 text-xs text-white flex items-center gap-1">
              <Lock className="h-3 w-3" />
              Editing: {product?.lockedByName}
            </Badge>
          )}
          {isLockedByCurrentUser && (
            <Badge className="absolute top-10 left-2 bg-blue-600 hover:bg-blue-700 text-xs text-white flex items-center gap-1">
              <Edit3 className="h-3 w-3" />
              You're editing
            </Badge>
          )}
          {product?.totalStock === 0 ? (
            <Badge className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-xs">
              Out Of Stock
            </Badge>
          ) : product?.totalStock < 10 ? (
            <Badge className="absolute top-2 right-2 bg-orange-500 hover:bg-orange-600 text-xs">
              Low Stock
            </Badge>
          ) : (
            <Badge className="absolute top-2 right-2 bg-green-500 hover:bg-green-600 text-xs">
              In Stock
            </Badge>
          )}
        </div>
        <CardContent className="p-3">
          <h2 
            className={`text-base font-bold mb-1 mt-1 line-clamp-2 cursor-pointer hover:text-primary transition-colors ${shouldGrayOut ? 'text-gray-600' : ''}`}
            onClick={() => handleViewReviews && handleViewReviews(product)}
            title="Click to view reviews"
          >
            {product?.title}
          </h2>
          <div className="flex justify-between items-center mb-2">
            <span className={`text-lg font-semibold ${shouldGrayOut ? 'text-gray-600' : 'text-primary'}`}>
              ₱{formatCurrency(product?.price)}
            </span>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Package className="h-3 w-3" />
              <span className="font-semibold">
                {product?.totalStock} units
              </span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 p-3 pt-0">
          {isLockedByOther && (
            <div className="w-full text-xs text-yellow-600 font-medium text-center bg-yellow-50 p-2 rounded">
              🔒 {product?.lockedByName} is editing - Edit and Archive disabled
            </div>
          )}
          {isLockedByCurrentUser && (
            <div className="w-full text-xs text-blue-600 font-medium text-center bg-blue-50 p-2 rounded">
               You're editing 
            </div>
          )}
          <div className="flex justify-between items-center gap-2 w-full">
            <Button
              onClick={() => handleEdit(product)}
              disabled={isLockedByOther}
              className="flex-1 h-9 text-sm"
              variant={isLockedByOther ? "secondary" : "default"}
            >
              {isLockedByOther ? (
                <>
                  <Lock className="h-4 w-4 mr-1" />
                  Locked
                </>
              ) : (
                "Edit"
              )}
            </Button>
            {!isArchived ? (
              <Button 
                onClick={() => handleArchive(product?._id, product)}
                disabled={isLocked}
                variant={isLocked ? "secondary" : "destructive"}
                className="flex-1 h-9 text-sm"
                title={isLocked ? "Cannot archive while product is being edited" : "Archive product"}
              >
                {isLocked ? (
                  <>
                    <Lock className="h-4 w-4 mr-1" />
                    Archive
                  </>
                ) : (
                  "Archive"
                )}
              </Button>
            ) : (
              <Button 
                onClick={() => handleUnarchive(product?._id, product)}
                disabled={isLocked}
                variant={isLocked ? "secondary" : "default"}
                className={`flex-1 h-9 text-sm ${!isLocked ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                title={isLocked ? "Cannot unarchive while product is being edited" : "Unarchive product"}
              >
                {isLocked ? (
                  <>
                    <Lock className="h-4 w-4 mr-1" />
                    Unarchive
                  </>
                ) : (
                  "Unarchive"
                )}
              </Button>
            )}
          </div>
        </CardFooter>
      </div>
    </Card>
  );
}

export default AdminProductTile;
