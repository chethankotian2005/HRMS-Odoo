"use client";
import { useEffect, useState, useRef } from "react";
import { ClipboardList, CheckCircle2, XCircle, Bell } from "lucide-react";

interface Notification {
  id: string; type: string; title: string; body: string;
  isRead: boolean; createdAt: string; entityId?: string;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifs = () => {
    fetch("/api/notifications").then((r) => r.json()).then((d) => {
      setNotifications(d.notifications ?? []);
      setUnreadCount(d.unreadCount ?? 0);
    });
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const markAllRead = async () => {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ markAllRead: true }) });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const typeIcon: Record<string, React.ReactNode> = {
    LEAVE_SUBMITTED: <ClipboardList className="h-5 w-5 text-blue-500" />,
    LEAVE_APPROVED: <CheckCircle2 className="h-5 w-5 text-green-500" />,
    LEAVE_REJECTED: <XCircle className="h-5 w-5 text-red-500" />,
  };

  return (
    <div className="relative" ref={ref}>
      <button
        id="notification-bell"
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none"
        aria-label="Notifications">
        <Bell className="h-6 w-6 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="font-semibold text-gray-800 text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline">Mark all read</button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">No notifications</p>
            ) : notifications.map((n) => (
              <div key={n.id} className={`px-4 py-3 hover:bg-gray-50 transition-colors ${!n.isRead ? "bg-blue-50" : ""}`}>
                <div className="flex gap-2">
                  <div className="flex-shrink-0 pt-1">
                    {typeIcon[n.type] ?? <Bell className="h-5 w-5 text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!n.isRead ? "font-semibold text-gray-900" : "text-gray-700"}`}>{n.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{n.body}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString("en-IN")}</p>
                  </div>
                  {!n.isRead && <span className="h-2 w-2 rounded-full bg-blue-500 mt-1 flex-shrink-0" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}