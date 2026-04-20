import { Outlet, useNavigate } from "react-router-dom";
import AdminSideBar from "./sidebar";
import AdminHeader from "./header";
import { useState, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { getAdminProfile } from "@/store/admin/profile-slice";
import { io } from "socket.io-client";
import { addNotification, setConnectionStatus } from "@/store/notifications/notification-slice";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/lib/utils";

function AdminLayout() {
  const [openSidebar, setOpenSidebar] = useState(false);
  const dispatch = useDispatch();
  const socketRef = useRef(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    dispatch(getAdminProfile())
      .unwrap()
      .catch((error) => {
        if (!isMounted) return;

        if (error?.status === 403) {
          const message =
            error?.message ||
            "This administrator account has been archived by a superadmin.";

          toast({
            title: "Account Archived",
            description:
              "Redirecting you to the login page. Please contact a superadmin for assistance.",
            variant: "destructive",
          });

          navigate(
            `/auth/login?archivedMessage=${encodeURIComponent(message)}`,
            { replace: true }
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, [dispatch, toast]);

  // WebSocket connection for real-time notifications
  useEffect(() => {
    // Connect to WebSocket server
    socketRef.current = io("http://localhost:5000", {
      transports: ["websocket"],
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("Connected to WebSocket server");
      dispatch(setConnectionStatus(true));
      // Join admin room to receive notifications
      socket.emit("join-admin-room");
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from WebSocket server");
      dispatch(setConnectionStatus(false));
    });

    // Listen for new order notifications
    socket.on("new-order", (orderData) => {
      console.log("New order received:", orderData);
      
      // Add notification to Redux store
      dispatch(addNotification({
        target: "admin",
        type: "new-order",
        title: "New Order Received",
        message: `Order from ${orderData.userName || "Unknown User"} - ₱${formatCurrency(orderData.totalAmount) || "0.00"}`,
        orderId: orderData.orderId,
        orderData: orderData,
      }));

      // Show toast notification
      toast({
        title: "New Order Received!",
        description: `Order from ${orderData.userName || "Unknown User"} - ₱${formatCurrency(orderData.totalAmount) || "0.00"}`,
        duration: 5000,
        variant: "success",
      });
    });

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [dispatch, toast, navigate]);

  return (
    <div className="flex min-h-screen w-full">
      {/* admin sidebar */}
      <AdminSideBar open={openSidebar} setOpen={setOpenSidebar} />
      <div className="flex flex-1 flex-col lg:ml-64">
        {/* admin header */}
        <AdminHeader setOpen={setOpenSidebar} />
        <main className="flex-1 flex-col flex bg-gradient-to-br from-blue-50/50 to-yellow-50/30 dark:from-muted/20 dark:to-background p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}


export default AdminLayout;
