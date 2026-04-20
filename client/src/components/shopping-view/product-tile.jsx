import { Card, CardContent, CardFooter } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { categoryOptionsMap } from "@/config";
import { formatCurrency } from "@/lib/utils";

function ShoppingProductTile({
  product,
  handleGetProductDetails,
  handleAddtoCart,
  handleBuyNow,
}) {
  const isOutOfStock = product?.totalStock === 0;
  
  return (
    <Card
      className={`w-full max-w-sm mx-auto hover:shadow-2xl hover:shadow-primary/20 hover:scale-105 hover:-translate-y-1 transition-all duration-300 ease-in-out border-2 hover:border-secondary/50 ${
        isOutOfStock ? "grayscale opacity-75" : ""
      }`}
    >
      <div onClick={() => handleGetProductDetails(product?._id)} className="cursor-pointer">
        <div className="relative h-[150px] bg-muted/30 flex items-center justify-center rounded-t-lg overflow-hidden">
          <img
            src={product?.image}
            alt={product?.title}
            className={`max-w-full max-h-full object-contain transition-transform duration-500 ease-in-out hover:scale-105 ${
              isOutOfStock ? "grayscale" : ""
            }`}
          />
          {product?.totalStock === 0 ? (
            <Badge className="absolute top-1 left-1 bg-red-500 hover:bg-red-600 text-[10px] px-1.5 py-0.5">
              Out Of Stock
            </Badge>
          ) : product?.totalStock < 10 ? (
            <Badge className="absolute top-1 left-1 bg-red-500 hover:bg-red-600 text-[10px] px-1.5 py-0.5">
              {`Only ${product?.totalStock} left`}
            </Badge>
          ) : null}
        </div>
        <CardContent className="p-2">
          <h2
            className={`text-sm font-bold mb-1 line-clamp-2 ${
              isOutOfStock ? "text-gray-600" : ""
            }`}
          >
            {product?.title}
          </h2>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-muted-foreground">
              {categoryOptionsMap[product?.category]}
            </span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span
              className={`text-base font-semibold ${
                isOutOfStock ? "text-gray-600" : "text-primary"
              }`}
            >
              ₱{formatCurrency(product?.price)}
            </span>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
              product?.totalStock === 0 
                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" 
                : product?.totalStock < 10 
                ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            }`}>
              {product?.totalStock === 0 ? "Out" : `${product?.totalStock} left`}
            </span>
          </div>
        </CardContent>
      </div>
      <CardFooter className="p-2 pt-0">
        {product?.totalStock === 0 ? (
          <Button className="w-full opacity-60 cursor-not-allowed h-8 text-xs">
            Out Of Stock
          </Button>
        ) : (
          <div className="flex w-full gap-2">
            <Button
              onClick={() => handleAddtoCart(product?._id, product?.totalStock)}
              className="flex-1 h-8 text-xs transition-transform duration-200 ease-out hover:-translate-y-1 hover:scale-105 hover:shadow-lg"
            >
              Add to cart
            </Button>
            <Button
              onClick={() =>
                (handleBuyNow || handleAddtoCart)(
                  product?._id,
                  product?.totalStock
                )
              }
              className="flex-1 h-8 text-xs transition-transform duration-200 ease-out hover:-translate-y-1 hover:scale-105 hover:shadow-lg"
            >
              Buy Now
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

export default ShoppingProductTile;
