import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { Calendar as CalendarIcon, Package } from "lucide-react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Badge } from "../ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { io } from "socket.io-client";
import { formatCurrency } from "@/lib/utils";

function timeUntil(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = d - now;
  if (diff <= 0) return "Expired";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days === 0) {
    if (hours <= 0) return "Due today";
    return `${hours}h left`;
  }
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

function getDeadlineStatus(deadline) {
  if (!deadline) return { status: "none", color: "muted" };
  const d = new Date(deadline);
  const now = new Date();
  const diff = d - now;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (diff <= 0) return { status: "expired", color: "destructive" };
  if (days === 0 && hours <= 24) return { status: "urgent", color: "destructive" };
  if (days <= 1) return { status: "warning", color: "default" };
  return { status: "upcoming", color: "secondary" };
}

// Calendar grid component
function CalendarGrid({ deadlines, currentMonth, onDateClick, selectedDate }) {
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Get first day of month and number of days
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();
  
  // Create a map of dates with deadlines
  const deadlinesByDate = useMemo(() => {
    const map = {};
    deadlines.forEach(d => {
      if (!d.deadline) return;
      const date = new Date(d.deadline);
      const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      if (!map[dateKey]) {
        map[dateKey] = [];
      }
      map[dateKey].push(d);
    });
    return map;
  }, [deadlines]);
  
  // Check if a date has deadlines
  const getDeadlinesForDate = (year, month, day) => {
    const dateKey = `${year}-${month}-${day}`;
    return deadlinesByDate[dateKey] || [];
  };
  
  // Get status for a date
  const getDateStatus = (year, month, day) => {
    const dateDeadlines = getDeadlinesForDate(year, month, day);
    if (dateDeadlines.length === 0) return null;
    
    const now = new Date();
    const date = new Date(year, month, day);
    const diff = date - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (diff <= 0) return { status: "expired", color: "bg-red-500" };
    if (days === 0) return { status: "urgent", color: "bg-orange-500" };
    if (days <= 1) return { status: "warning", color: "bg-yellow-500" };
    return { status: "upcoming", color: "bg-blue-500" };
  };
  
  const today = new Date();
  const isToday = (year, month, day) => {
    return year === today.getFullYear() && 
           month === today.getMonth() && 
           day === today.getDate();
  };
  
  const isSelected = (year, month, day) => {
    if (!selectedDate) return false;
    return year === selectedDate.getFullYear() && 
           month === selectedDate.getMonth() && 
           day === selectedDate.getDate();
  };
  
  // Generate calendar days
  const calendarDays = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }
  
  return (
    <div className="w-full">
      {/* Days of week header */}
      <div className="grid grid-cols-7 gap-0.5 lg:gap-1 mb-1 lg:mb-2">
        {daysOfWeek.map(day => (
          <div key={day} className="text-center text-[10px] lg:text-xs font-semibold text-muted-foreground py-0.5 lg:py-1">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5 lg:gap-1">
        {calendarDays.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }
          
          const dateDeadlines = getDeadlinesForDate(
            currentMonth.getFullYear(), 
            currentMonth.getMonth(), 
            day
          );
          const status = getDateStatus(
            currentMonth.getFullYear(), 
            currentMonth.getMonth(), 
            day
          );
          const todayClass = isToday(
            currentMonth.getFullYear(), 
            currentMonth.getMonth(), 
            day
          ) ? "ring-2 ring-primary" : "";
          const selectedClass = isSelected(
            currentMonth.getFullYear(), 
            currentMonth.getMonth(), 
            day
          ) ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950" : "";
          
          return (
            <button
              key={day}
              onClick={() => onDateClick(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day))}
              className={`
                min-h-[60px] lg:min-h-[80px] rounded-md text-xs lg:text-sm font-medium transition-all
                hover:ring-2 hover:ring-primary hover:ring-offset-1
                ${todayClass}
                ${selectedClass}
                ${dateDeadlines.length > 0 ? "font-bold bg-red-800 dark:bg-red-900" : ""}
                relative flex flex-col items-center justify-start p-1 lg:p-1.5 gap-0.5
              `}
              style={status ? { backgroundColor: status.color } : {}}
            >
              <div className={`text-xs lg:text-sm font-bold mb-0.5 ${dateDeadlines.length > 0 ? "text-white" : status ? "text-white" : "text-gray-900 dark:text-gray-100"}`}>{day}</div>
              {dateDeadlines.length > 0 && (() => {
                // Collect all products from all orders on this date
                const allProducts = [];
                dateDeadlines.forEach(deadline => {
                  if (deadline.cartItems && deadline.cartItems.length > 0) {
                    deadline.cartItems.forEach(item => {
                      allProducts.push({
                        name: item.title,
                        quantity: item.quantity || 1
                      });
                    });
                  } else {
                    // Fallback to order title if no cartItems
                    allProducts.push({
                      name: deadline.title,
                      quantity: 1
                    });
                  }
                });
                
                return (
                  <div className="flex flex-col gap-0.5 w-full text-[8px] lg:text-[9px] leading-tight overflow-hidden max-h-[60px] lg:max-h-[80px] overflow-y-auto">
                    {allProducts.map((product, idx) => (
                    <div 
                      key={idx} 
                      className={`truncate px-0.5 lg:px-1 py-0.5 rounded font-semibold ${
                        status 
                          ? "bg-white/30 text-white shadow-sm" 
                          : "bg-white/20 text-white dark:bg-white/25 shadow-sm"
                      }`}
                        title={product.quantity > 1 ? `${product.name} (x${product.quantity})` : product.name}
                    >
                        {product.quantity > 1 ? `${product.name} (x${product.quantity})` : product.name}
                    </div>
                  ))}
                    </div>
                );
              })()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function DeadlinesCalendar() {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [deadlines, setDeadlines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const selectedDateRef = useRef(null);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    let abort = false;
    async function fetchDeadlines() {
      if (!user?.id) return;
      setLoading(true);
      try {
        // Use correct endpoint without user ID (backend gets it from auth middleware)
        // Include credentials to send authentication cookies
        const res = await fetch(`http://localhost:5000/api/shop/order/deadlines`, {
          credentials: 'include', // Send cookies for authentication
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!res.ok) {
          // Handle HTTP error responses
          if (res.status === 401) {
            console.error("Authentication failed - user may need to log in again");
          } else {
            console.error(`Failed to fetch deadlines: HTTP ${res.status}`);
          }
          if (!abort) {
            setDeadlines([]);
          }
          return;
        }
        
        const json = await res.json();
        if (!abort) {
          if (json?.success) {
            setDeadlines(json.data || []);
          } else {
            console.error("Failed to fetch deadlines:", json.message || "Unknown error");
            setDeadlines([]);
          }
        }
      } catch (e) {
        console.error("Failed to fetch deadlines", e);
        if (!abort) {
          setDeadlines([]);
        }
      } finally {
        if (!abort) setLoading(false);
      }
    }

    fetchDeadlines();
    return () => {
      abort = true;
    };
  }, [user?.id]);

  // Set up Socket.IO listener for real-time order updates
  useEffect(() => {
    if (!user?.id) return;

    const socket = io("http://localhost:5000", {
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      socket.emit("register-user", user.id);
    });

    // Listen for order updates - refresh calendar when order is confirmed or picked up
    socket.on("order-updated", (payload) => {
      // If order status changed to "confirmed", refresh deadlines to show new payment deadline
      // If order status changed to "pickedUp", refresh deadlines to remove the deadline
      if (payload?.newStatus === "confirmed" || payload?.newStatus === "pickedUp") {
        // Refetch deadlines to update the calendar
        async function refreshDeadlines() {
          try {
            const res = await fetch(`http://localhost:5000/api/shop/order/deadlines`, {
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
              },
            });
            
            if (res.ok) {
              const json = await res.json();
              if (json?.success) {
                setDeadlines(json.data || []);
              }
            }
          } catch (e) {
            console.error("Failed to refresh deadlines:", e);
          }
        }
        refreshDeadlines();
      }
    });

    return () => {
      socket.off("order-updated");
      socket.disconnect();
    };
  }, [user?.id]);

  // Filter deadlines - show pending and confirmed orders with deadlines (including expired for calendar display)
  const activeDeadlines = useMemo(() => {
    return deadlines.filter(d => {
      // Show all pending and confirmed orders with deadlines, even if expired (for calendar visibility)
      return d.deadline && (d.status === "pending" || d.status === "confirmed");
    });
  }, [deadlines]);
  
  // Get only upcoming (non-expired) deadlines for badge count
  const upcomingDeadlines = useMemo(() => {
    return activeDeadlines.filter(d => {
      const deadlineDate = new Date(d.deadline);
      const now = new Date();
      return deadlineDate > now;
    });
  }, [activeDeadlines]);

  // Group deadlines by date
  const groupedDeadlines = useMemo(() => {
    const groups = {};
    activeDeadlines.forEach(d => {
      const dateKey = new Date(d.deadline).toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(d);
    });
    return groups;
  }, [activeDeadlines]);

  // Get deadlines for selected date
  const selectedDateDeadlines = useMemo(() => {
    if (!selectedDate) return [];
    return activeDeadlines.filter(d => {
      const deadlineDate = new Date(d.deadline);
      // Compare dates by year, month, and day only (ignore time)
      return deadlineDate.getFullYear() === selectedDate.getFullYear() &&
             deadlineDate.getMonth() === selectedDate.getMonth() &&
             deadlineDate.getDate() === selectedDate.getDate();
    });
  }, [selectedDate, activeDeadlines]);

  // Navigate months
  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  const handleDateClick = (date) => {
    // Check if this date has any deadlines
    const dateDeadlines = activeDeadlines.filter(d => {
      const deadlineDate = new Date(d.deadline);
      return deadlineDate.getFullYear() === date.getFullYear() &&
             deadlineDate.getMonth() === date.getMonth() &&
             deadlineDate.getDate() === date.getDate();
    });
    
    // Always select the date to show details
    setSelectedDate(date);
    
    // If there are deadlines, scroll to the details section
    if (dateDeadlines.length > 0) {
      // Use setTimeout to ensure the DOM has updated with the selected date details
      setTimeout(() => {
        if (selectedDateRef.current && scrollContainerRef.current) {
          const container = scrollContainerRef.current;
          const target = selectedDateRef.current;
          const containerRect = container.getBoundingClientRect();
          const targetRect = target.getBoundingClientRect();
          const scrollTop = container.scrollTop + (targetRect.top - containerRect.top) - 20; // 20px offset from top
          container.scrollTo({
            top: scrollTop,
            behavior: 'smooth'
          });
        }
      }, 200); // Slightly longer delay to ensure DOM is fully updated
    }
  };

  return (
    <TooltipProvider>
      <DropdownMenu open={calendarOpen} onOpenChange={setCalendarOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8 relative bg-secondary hover:bg-accent border-secondary text-foreground lg:h-10 lg:w-10"
              >
                <CalendarIcon className="w-4 h-4 lg:w-6 lg:h-6" />
                {upcomingDeadlines.length > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 w-4 lg:h-5 lg:w-5 flex items-center justify-center p-0 text-[10px] lg:text-xs bg-red-500 text-white">
                    {upcomingDeadlines.length > 9 ? "9+" : upcomingDeadlines.length}
                  </Badge>
                )}
                <span className="sr-only">Payment Deadlines</span>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Payment Deadlines ({upcomingDeadlines.length} upcoming)</p>
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent side="bottom" align="end" className="w-[calc(100vw-2rem)] max-w-[800px] max-h-[calc(100vh-8rem)] lg:max-h-[700px] overflow-hidden flex flex-col p-0 bg-white dark:bg-gray-900">
          {/* Google Calendar-style Header */}
          <div className="px-3 py-2 lg:px-4 lg:py-3 border-b bg-white dark:bg-gray-900 flex items-center justify-between">
            <div className="flex items-center gap-2 lg:gap-3 flex-1 min-w-0">
              <div className="flex items-center gap-1.5 lg:gap-2">
                <div className="w-6 h-6 lg:w-8 lg:h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <CalendarIcon className="h-3 w-3 lg:h-5 lg:w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs lg:text-sm font-medium text-gray-900 dark:text-white truncate">Payment Deadlines</h3>
                  <p className="text-[10px] lg:text-xs text-gray-500 dark:text-gray-400 truncate">BukSu EEU</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 lg:gap-2 flex-shrink-0">
              {upcomingDeadlines.length > 0 && (
                <Badge variant="secondary" className="text-[10px] lg:text-xs">
                  {upcomingDeadlines.length} upcoming
                </Badge>
              )}
            </div>
          </div>
          
          {/* Local Calendar View */}
          <div ref={scrollContainerRef} className="flex-1 overflow-auto bg-white dark:bg-gray-900 p-2 lg:p-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-sm text-muted-foreground">Loading calendar...</div>
              </div>
            ) : activeDeadlines.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8">
                <CalendarIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
                <p className="text-sm text-muted-foreground">No upcoming payment deadlines</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Calendar Navigation */}
                <div className="flex items-center justify-between mb-2 lg:mb-4">
                  <button
                    onClick={goToPreviousMonth}
                    className="p-1.5 lg:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md text-sm lg:text-base"
                  >
                    ←
                  </button>
                  <h3 className="text-sm lg:text-lg font-semibold text-center flex-1 px-2">
                    {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </h3>
                  <div className="flex gap-1 lg:gap-2">
                    <button
                      onClick={goToToday}
                      className="px-2 py-1 lg:px-3 lg:py-1 text-xs lg:text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md"
                    >
                      Today
                    </button>
                    <button
                      onClick={goToNextMonth}
                      className="p-1.5 lg:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md text-sm lg:text-base"
                    >
                      →
                    </button>
                  </div>
                </div>

                {/* Calendar Grid */}
                <CalendarGrid
                  deadlines={activeDeadlines}
                  currentMonth={currentMonth}
                  onDateClick={handleDateClick}
                  selectedDate={selectedDate}
                />

                {/* Selected Date Details */}
                {selectedDate && selectedDateDeadlines.length > 0 && (
                  <div ref={selectedDateRef} className="mt-4 lg:mt-6 pt-3 lg:pt-4 border-t">
                    <h4 className="text-xs lg:text-sm font-semibold mb-2 lg:mb-3">
                      {selectedDate.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </h4>
                    <div className="space-y-1.5 lg:space-y-2">
                      {selectedDateDeadlines.map((d) => {
                        const { status, color } = getDeadlineStatus(d.deadline);
                        const cartItems = d.cartItems || [];
                        return (
                          <div
                            key={d.orderId}
                            className="p-2 lg:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                            onClick={() => {
                              navigate(`/shop/account?tab=orders`);
                              setCalendarOpen(false);
                            }}
                          >
                            <div className="flex items-start justify-between gap-1.5 lg:gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs lg:text-sm font-medium truncate">
                                  Order ID: {d.orderId.substring(0, 8)}
                                </p>
                                <p className="text-[10px] lg:text-xs text-muted-foreground mb-1">
                                  Amount: ₱{formatCurrency(d.totalAmount)}
                                </p>
                                {cartItems.length > 0 && (
                                  <div className="mt-1.5 space-y-0.5">
                                    <p className="text-[10px] lg:text-xs font-semibold text-muted-foreground mb-0.5">
                                      Products ({cartItems.length}):
                                    </p>
                                    {cartItems.map((item, idx) => (
                                      <div key={idx} className="text-[10px] lg:text-xs text-muted-foreground pl-1.5 border-l-2 border-primary/30">
                                        • {item.title} {item.quantity > 1 && `(x${item.quantity})`}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-0.5 lg:gap-1 flex-shrink-0">
                                <Badge variant={color} className="text-[10px] lg:text-xs">
                                  {timeUntil(d.deadline)}
                                </Badge>
                                <span className="text-[10px] lg:text-xs text-muted-foreground">
                                  {new Date(d.deadline).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* All Deadlines List */}
                {!selectedDate && (
                  <div className="mt-6 pt-4 border-t">
                    <h4 className="text-sm font-semibold mb-3">Upcoming Deadlines</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {Object.entries(groupedDeadlines).map(([dateKey, deadlines]) => (
                        <div key={dateKey}>
                          <p className="text-xs font-medium text-muted-foreground mb-2">{dateKey}</p>
                          {deadlines.map((d) => {
                            const { status, color } = getDeadlineStatus(d.deadline);
                            const cartItems = d.cartItems || [];
                            return (
                              <div
                                key={d.orderId}
                                className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors mb-2"
                                onClick={() => {
                                  navigate(`/shop/account?tab=orders`);
                                  setCalendarOpen(false);
                                }}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                      Order ID: {d.orderId.substring(0, 8)}
                                    </p>
                                    <p className="text-xs text-muted-foreground mb-1">
                                      ₱{formatCurrency(d.totalAmount)} • {new Date(d.deadline).toLocaleTimeString('en-US', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </p>
                                    {cartItems.length > 0 && (
                                      <div className="mt-1 space-y-0.5">
                                        <p className="text-xs font-semibold text-muted-foreground mb-0.5">
                                          Products ({cartItems.length}):
                                        </p>
                                        {cartItems.map((item, idx) => (
                                          <div key={idx} className="text-xs text-muted-foreground pl-1.5 border-l-2 border-primary/30">
                                            • {item.title} {item.quantity > 1 && `(x${item.quantity})`}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <Badge variant={color} className="text-xs">
                                    {timeUntil(d.deadline)}
                                  </Badge>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t bg-white dark:bg-gray-900">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                navigate("/shop/account?tab=orders");
                setCalendarOpen(false);
              }}
            >
              <Package className="h-3 w-3 mr-1" />
              View All Orders
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
}
