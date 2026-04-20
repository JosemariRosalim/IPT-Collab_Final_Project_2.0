import { Fragment, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchSalesReport,
  fetchMonthlySalesReport,
  fetchYearlySalesReport,
  fetchInventoryReport,
} from "@/store/superadmin/report-slice";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, RefreshCw, ListOrdered, Calendar, Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

const rangeOptions = [
  { id: "daily", label: "Daily (last 7 days)" },
  { id: "weekly", label: "Weekly (last 8 weeks)" },
  { id: "monthly", label: "Monthly (last 6 months)" },
];

const formatNumber = (formatter, value) =>
  formatter.format(Number(value || 0));

const SummaryCard = ({ title, description, metric, meta }) => (
  <Card className="flex-1 min-w-[220px] bg-gradient-to-br from-white to-secondary/10 dark:from-card dark:to-background/60">
    <CardHeader className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <CardDescription>{description}</CardDescription>
      <CardTitle className="text-3xl font-black tracking-tight">
        {metric}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground">{meta}</p>
    </CardContent>
  </Card>
);

function SuperAdminReports() {
  const dispatch = useDispatch();
  const { toast } = useToast();
  const [selectedRange, setSelectedRange] = useState("daily");
  const [monthlyParams, setMonthlyParams] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  });
  const [yearlyParams, setYearlyParams] = useState({
    year: new Date().getFullYear(),
  });
  const [inventoryParams, setInventoryParams] = useState({
    year: "",
    month: "",
  });

  const {
    salesReport,
    monthlySalesReport,
    yearlySalesReport,
    inventoryReport,
  } = useSelector((state) => state.superAdminReports);

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        maximumFractionDigits: 2,
      }),
    []
  );

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-PH", {
        maximumFractionDigits: 0,
      }),
    []
  );

  useEffect(() => {
    dispatch(fetchSalesReport()).unwrap().catch((message) => {
      toast({
        title: "Unable to load reports",
        description: message,
        variant: "destructive",
      });
    });
  }, [dispatch, toast]);

  const handleRefreshSales = () => {
    dispatch(fetchSalesReport())
      .unwrap()
      .then(() =>
        toast({
          title: "Reports refreshed",
          description: "Latest sales metrics fetched successfully.",
          variant: "success",
        })
      )
      .catch((message) =>
        toast({
          title: "Refresh failed",
          description: message,
          variant: "destructive",
        })
      );
  };

  const handleGenerateMonthlyReport = () => {
    dispatch(fetchMonthlySalesReport(monthlyParams))
      .unwrap()
      .then(() =>
        toast({
          title: "Monthly report generated",
          description: "Monthly sales report fetched successfully.",
          variant: "success",
        })
      )
      .catch((message) =>
        toast({
          title: "Report generation failed",
          description: message,
          variant: "destructive",
        })
      );
  };

  const handleGenerateYearlyReport = () => {
    dispatch(fetchYearlySalesReport(yearlyParams))
      .unwrap()
      .then(() =>
        toast({
          title: "Yearly report generated",
          description: "Yearly sales report fetched successfully.",
          variant: "success",
        })
      )
      .catch((message) =>
        toast({
          title: "Report generation failed",
          description: message,
          variant: "destructive",
        })
      );
  };

  const handleGenerateInventoryReport = () => {
    const params = {};
    if (inventoryParams.year) params.year = inventoryParams.year;
    if (inventoryParams.month) params.month = inventoryParams.month;

    dispatch(fetchInventoryReport(params))
      .unwrap()
      .then(() =>
        toast({
          title: "Inventory report generated",
          description: "Inventory report fetched successfully.",
          variant: "success",
        })
      )
      .catch((message) =>
        toast({
          title: "Report generation failed",
          description: message,
          variant: "destructive",
        })
      );
  };

  const overview = salesReport?.data?.overview;
  const generatedAt = salesReport?.data?.generatedAt
    ? new Date(salesReport.data.generatedAt).toLocaleString()
    : "—";
  const activeSeries = salesReport?.data?.series?.[selectedRange] || [];
  const itemsByDay = salesReport?.data?.itemsByDay || [];

  const renderSummaryCards = () => {
    if (salesReport.isLoading || !overview) {
      return (
        <div className="flex w-full gap-4 flex-wrap">
          {[1, 2, 3].map((item) => (
            <Skeleton
              key={item}
              className="h-32 flex-1 min-w-[220px] bg-muted/50"
            />
          ))}
        </div>
      );
    }

    return (
      <div className="flex w-full gap-4 flex-wrap">
        <SummaryCard
          title="Daily"
          description="Today's revenue"
          metric={formatNumber(currencyFormatter, overview?.daily?.totalSales)}
          meta={`${overview?.daily?.orderCount || 0} orders • Avg ${formatNumber(
            currencyFormatter,
            overview?.daily?.avgOrderValue || 0
          )}`}
        />
        <SummaryCard
          title="Weekly"
          description="This week's revenue"
          metric={formatNumber(currencyFormatter, overview?.weekly?.totalSales)}
          meta={`${overview?.weekly?.orderCount || 0} orders • Avg ${formatNumber(
            currencyFormatter,
            overview?.weekly?.avgOrderValue || 0
          )}`}
        />
        <SummaryCard
          title="Monthly"
          description="Revenue this month"
          metric={formatNumber(
            currencyFormatter,
            overview?.monthly?.totalSales
          )}
          meta={`${overview?.monthly?.orderCount || 0} orders • Avg ${formatNumber(
            currencyFormatter,
            overview?.monthly?.avgOrderValue || 0
          )}`}
        />
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-primary">
            Reports
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary">Super Admin Panel</Badge>
          </div>
        </div>
      </div>

      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sales">Sales Overview</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Sales</TabsTrigger>
          <TabsTrigger value="yearly">Yearly Sales</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Sales Overview</h2>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary">Generated at {generatedAt}</Badge>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleRefreshSales}
              disabled={salesReport.isLoading}
            >
              {salesReport.isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>

          {renderSummaryCards()}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Sales trends</CardTitle>
                <CardDescription>
                  Compare revenue and volume across daily, weekly, or monthly
                  buckets.
                </CardDescription>
              </div>
              <Select value={selectedRange} onValueChange={setSelectedRange}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Choose range" />
                </SelectTrigger>
                <SelectContent>
                  {rangeOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {salesReport.isLoading ? (
                <Skeleton className="h-40 w-full bg-muted/50" />
              ) : activeSeries.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No paid orders found for this period yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Total Sales</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead>Average Order</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeSeries.map((bucket, index) => {
                      const dayItems = itemsByDay.find(
                        (day) => day.label === bucket.label
                      );

                      return (
                        <TableRow key={`${bucket.label}-${index}`}>
                          <TableCell className="font-semibold">
                            {bucket.label}
                          </TableCell>
                          <TableCell>
                            {formatNumber(currencyFormatter, bucket.totalSales)}
                          </TableCell>
                          <TableCell>
                            {formatNumber(numberFormatter, bucket.orderCount)}
                          </TableCell>
                          <TableCell>
                            {formatNumber(
                              currencyFormatter,
                              bucket.avgOrderValue || 0
                            )}
                          </TableCell>
                          <TableCell>
                            {formatNumber(numberFormatter, bucket.totalItems || 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            {dayItems ? (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="ghost">
                                    <ListOrdered className="mr-2 h-4 w-4" />
                                    View details
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl">
                                  <DialogHeader>
                                    <DialogTitle>
                                      Items sold on {dayItems.label}
                                    </DialogTitle>
                                  </DialogHeader>
                                  <div className="max-h-[60vh] overflow-auto">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Product</TableHead>
                                          <TableHead>Qty</TableHead>
                                          <TableHead>Unit Price</TableHead>
                                          <TableHead>Revenue</TableHead>
                                          <TableHead>Customers</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {dayItems.items.map((item) => (
                                          <Fragment key={item.productId}>
                                            <TableRow>
                                              <TableCell className="font-medium">
                                                {item.title}
                                              </TableCell>
                                              <TableCell>
                                                {formatNumber(
                                                  numberFormatter,
                                                  item.quantity
                                                )}
                                              </TableCell>
                                              <TableCell>
                                                {formatNumber(
                                                  currencyFormatter,
                                                  item.price
                                                )}
                                              </TableCell>
                                              <TableCell>
                                                {formatNumber(
                                                  currencyFormatter,
                                                  item.revenue
                                                )}
                                              </TableCell>
                                              <TableCell>
                                                <div className="text-sm font-semibold">
                                                  {item.buyers?.length || 0} buyer
                                                  {item.buyers?.length === 1
                                                    ? ""
                                                    : "s"}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                  {item.buyers
                                                    ?.slice(0, 2)
                                                    .map(
                                                      (buyer) =>
                                                        buyer.userName ||
                                                        buyer.email ||
                                                        "Guest"
                                                    )
                                                    .join(", ")}
                                                  {item.buyers &&
                                                    item.buyers.length > 2 &&
                                                    "…"}
                                                </div>
                                              </TableCell>
                                            </TableRow>
                                            {item.buyers && item.buyers.length > 0 && (
                                              <TableRow className="bg-muted/40">
                                                <TableCell colSpan={5}>
                                                  <div className="space-y-2">
                                                    {item.buyers.map((buyer) => (
                                                      <div
                                                        key={`${buyer.orderId}-${buyer.userId}`}
                                                        className="flex flex-wrap items-center justify-between text-sm"
                                                      >
                                                        <div className="flex flex-col">
                                                          <span className="font-medium">
                                                            {buyer.userName ||
                                                              buyer.email ||
                                                              "Guest"}
                                                          </span>
                                                          {buyer.email && (
                                                            <span className="text-xs text-muted-foreground">
                                                              {buyer.email}
                                                            </span>
                                                          )}
                                                        </div>
                                                        <div className="text-sm font-medium">
                                                          {formatNumber(
                                                            numberFormatter,
                                                            buyer.quantity
                                                          )}{" "}
                                                          pcs •{" "}
                                                          {formatNumber(
                                                            currencyFormatter,
                                                            buyer.revenue
                                                          )}
                                                        </div>
                                                      </div>
                                                    ))}
                                                  </div>
                                                </TableCell>
                                              </TableRow>
                                            )}
                                          </Fragment>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Monthly Sales Report
              </CardTitle>
              <CardDescription>
                Generate detailed sales reports for specific months
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monthly-year">Year</Label>
                  <Input
                    id="monthly-year"
                    type="number"
                    value={monthlyParams.year}
                    onChange={(e) =>
                      setMonthlyParams((prev) => ({
                        ...prev,
                        year: parseInt(e.target.value),
                      }))
                    }
                    min="2020"
                    max={new Date().getFullYear()}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthly-month">Month</Label>
                  <Select
                    value={monthlyParams.month.toString()}
                    onValueChange={(value) =>
                      setMonthlyParams((prev) => ({
                        ...prev,
                        month: parseInt(value),
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          {new Date(0, i).toLocaleDateString("en-US", {
                            month: "long",
                          })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                onClick={handleGenerateMonthlyReport}
                disabled={monthlySalesReport.isLoading}
                className="w-full"
              >
                {monthlySalesReport.isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Calendar className="mr-2 h-4 w-4" />
                )}
                Generate Monthly Report
              </Button>
            </CardContent>
          </Card>

          {monthlySalesReport.data && (
            <Card>
              <CardHeader>
                <CardTitle>{monthlySalesReport.data.period}</CardTitle>
                <CardDescription>
                  Total Sales: {formatNumber(currencyFormatter, monthlySalesReport.data.summary.totalSales)} • 
                  Orders: {formatNumber(numberFormatter, monthlySalesReport.data.summary.orderCount)} • 
                  Items: {formatNumber(numberFormatter, monthlySalesReport.data.summary.totalItems)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Day</TableHead>
                      <TableHead>Total Sales</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead>Average Order</TableHead>
                      <TableHead>Items</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlySalesReport.data.dailyBreakdown.map((day) => (
                      <TableRow key={day.label}>
                        <TableCell className="font-semibold">{day.label}</TableCell>
                        <TableCell>{formatNumber(currencyFormatter, day.totalSales)}</TableCell>
                        <TableCell>{formatNumber(numberFormatter, day.orderCount)}</TableCell>
                        <TableCell>{formatNumber(currencyFormatter, day.avgOrderValue)}</TableCell>
                        <TableCell>{formatNumber(numberFormatter, day.totalItems)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="yearly" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Yearly Sales Report
              </CardTitle>
              <CardDescription>
                Generate comprehensive sales reports for entire years
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="yearly-year">Year</Label>
                <Input
                  id="yearly-year"
                  type="number"
                  value={yearlyParams.year}
                  onChange={(e) =>
                    setYearlyParams((prev) => ({
                      ...prev,
                      year: parseInt(e.target.value),
                    }))
                  }
                  min="2020"
                  max={new Date().getFullYear()}
                />
              </div>
              <Button
                onClick={handleGenerateYearlyReport}
                disabled={yearlySalesReport.isLoading}
                className="w-full"
              >
                {yearlySalesReport.isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Calendar className="mr-2 h-4 w-4" />
                )}
                Generate Yearly Report
              </Button>
            </CardContent>
          </Card>

          {yearlySalesReport.data && (
            <Card>
              <CardHeader>
                <CardTitle>{yearlySalesReport.data.period}</CardTitle>
                <CardDescription>
                  Total Sales: {formatNumber(currencyFormatter, yearlySalesReport.data.summary.totalSales)} • 
                  Orders: {formatNumber(numberFormatter, yearlySalesReport.data.summary.orderCount)} • 
                  Items: {formatNumber(numberFormatter, yearlySalesReport.data.summary.totalItems)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Total Sales</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead>Average Order</TableHead>
                      <TableHead>Items</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {yearlySalesReport.data.monthlyBreakdown.map((month) => (
                      <TableRow key={month.label}>
                        <TableCell className="font-semibold">{month.label}</TableCell>
                        <TableCell>{formatNumber(currencyFormatter, month.totalSales)}</TableCell>
                        <TableCell>{formatNumber(numberFormatter, month.orderCount)}</TableCell>
                        <TableCell>{formatNumber(currencyFormatter, month.avgOrderValue)}</TableCell>
                        <TableCell>{formatNumber(numberFormatter, month.totalItems)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Inventory Report
              </CardTitle>
              <CardDescription>
                Generate inventory reports showing stock levels and movements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="inventory-year">Year (Optional)</Label>
                  <Input
                    id="inventory-year"
                    type="number"
                    value={inventoryParams.year}
                    onChange={(e) =>
                      setInventoryParams((prev) => ({
                        ...prev,
                        year: e.target.value,
                      }))
                    }
                    placeholder="Leave empty for current"
                    min="2020"
                    max={new Date().getFullYear()}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inventory-month">Month (Optional)</Label>
                  <Select
                    value={inventoryParams.month}
                    onValueChange={(value) =>
                      setInventoryParams((prev) => ({
                        ...prev,
                        month: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Leave empty for yearly/current" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {Array.from({ length: 12 }, (_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          {new Date(0, i).toLocaleDateString("en-US", {
                            month: "long",
                          })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                onClick={handleGenerateInventoryReport}
                disabled={inventoryReport.isLoading}
                className="w-full"
              >
                {inventoryReport.isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Package className="mr-2 h-4 w-4" />
                )}
                Generate Inventory Report
              </Button>
            </CardContent>
          </Card>

          {inventoryReport.data && (
            <Card>
              <CardHeader>
                <CardTitle>Inventory Report - {inventoryReport.data.period}</CardTitle>
                <CardDescription>
                  Total Products: {formatNumber(numberFormatter, inventoryReport.data.summary.totalProducts)} • 
                  Total Stock Value: {formatNumber(currencyFormatter, inventoryReport.data.summary.totalStockValue)} • 
                  Low Stock Items: {formatNumber(numberFormatter, inventoryReport.data.summary.lowStockItems)} • 
                  Out of Stock: {formatNumber(numberFormatter, inventoryReport.data.summary.outOfStockItems)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Sold (Period)</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Remaining</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventoryReport.data.inventory.map((item) => (
                      <TableRow key={item.productId}>
                        <TableCell className="font-semibold">{item.title}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>
                          <Badge variant={item.currentStock <= 10 ? "destructive" : item.currentStock === 0 ? "secondary" : "default"}>
                            {formatNumber(numberFormatter, item.currentStock)}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.price}</TableCell>
                        <TableCell>{formatNumber(numberFormatter, item.soldQuantity)}</TableCell>
                        <TableCell>{item.revenue}</TableCell>
                        <TableCell>
                          <Badge variant={item.remainingStock <= 10 ? "destructive" : "outline"}>
                            {formatNumber(numberFormatter, item.remainingStock)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default SuperAdminReports;


