"use client";

import { useEffect, useState } from "react";
import { format, differenceInSeconds, startOfWeek, addDays, startOfMonth, endOfMonth, isSameDay, getDaysInMonth, isAfter, setHours, setMinutes } from "date-fns";
import { Clock, MapPin, Calendar, CheckCircle, AlertTriangle, AlertCircle } from "lucide-react";

type AttendanceRecord = {
  id: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  isSuspectedProxy: boolean;
};

export default function AttendanceDashboard() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionForm, setCorrectionForm] = useState({ date: "", checkIn: "", checkOut: "", reason: "" });

  // current time for timer
  const [now, setNow] = useState(new Date());
  
  const todayRecord = records.find(r => isSameDay(new Date(r.date), new Date()));

  useEffect(() => {
    fetchRecords();
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchRecords = async () => {
    try {
      const start = startOfMonth(new Date());
      const end = endOfMonth(new Date());
      
      const res = await fetch(`/api/attendance?startDate=${start.toISOString()}&endDate=${end.toISOString()}`);
      if (!res.ok) throw new Error("Failed to fetch records");
      
      const data = await res.json();
      setRecords(data.records || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setActionLoading(true);
    setError(null);
    try {
      if (!navigator.geolocation) throw new Error("Geolocation is not supported by your browser");
      
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const payload = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        screen: `${window.screen.width}x${window.screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };

      const res = await fetch("/api/attendance/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to check in");
      
      await fetchRecords();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/attendance/check-out", {
        method: "POST",
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to check out");
      
      await fetchRecords();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const submitCorrection = async () => {
    try {
      const res = await fetch("/api/attendance/correction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...correctionForm,
          checkIn: correctionForm.checkIn ? `${correctionForm.date}T${correctionForm.checkIn}:00` : undefined,
          checkOut: correctionForm.checkOut ? `${correctionForm.date}T${correctionForm.checkOut}:00` : undefined,
        })
      });
      if (!res.ok) throw new Error("Failed to submit request");
      setShowCorrectionModal(false);
      alert("Correction request submitted!");
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-black border-t-transparent rounded-full dark:border-white dark:border-t-transparent" /></div>;

  // Compute stats
  let totalHours = 0;
  let presentDays = 0;
  let lateArrivals = 0;
  
  records.forEach(r => {
    if (r.status === "PRESENT" || r.status === "HALF_DAY") presentDays++;
    
    if (r.checkIn) {
      const checkInTime = new Date(r.checkIn);
      const nineAM = setMinutes(setHours(new Date(r.checkIn), 9), 15); // > 9:15 is late
      if (isAfter(checkInTime, nineAM)) lateArrivals++;
      
      if (r.checkOut) {
        totalHours += differenceInSeconds(new Date(r.checkOut), checkInTime) / 3600;
      } else if (isSameDay(new Date(r.date), new Date())) {
        totalHours += differenceInSeconds(now, checkInTime) / 3600;
      }
    }
  });

  // Calculate elapsed time today
  let elapsedStr = "00:00:00";
  if (todayRecord?.checkIn && !todayRecord.checkOut) {
    const secs = differenceInSeconds(now, new Date(todayRecord.checkIn));
    const h = Math.floor(secs / 3600).toString().padStart(2, "0");
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    elapsedStr = `${h}:${m}:${s}`;
  } else if (todayRecord?.checkOut) {
    const secs = differenceInSeconds(new Date(todayRecord.checkOut), new Date(todayRecord.checkIn!));
    const h = Math.floor(secs / 3600).toString().padStart(2, "0");
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    elapsedStr = `${h}:${m}:${s}`;
  }

  // Generate weekly strip
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  // Generate monthly heatmap
  const monthStart = startOfMonth(now);
  const daysInMonth = getDaysInMonth(now);
  const monthDays = Array.from({ length: daysInMonth }).map((_, i) => addDays(monthStart, i));

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "PRESENT": return "bg-green-500";
      case "HALF_DAY": return "bg-yellow-500";
      case "ABSENT": return "bg-red-500";
      default: return "bg-zinc-100 dark:bg-zinc-800";
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
        <button 
          onClick={() => setShowCorrectionModal(true)}
          className="text-sm px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-900 font-medium"
        >
          Regularize Attendance
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-center border border-red-200">
          <AlertTriangle className="mr-3 h-5 w-5 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 bg-white dark:bg-zinc-950 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Total Hours (This Month)</h3>
          <p className="text-4xl font-bold mt-2 tracking-tight">{totalHours.toFixed(1)}<span className="text-lg text-zinc-400 ml-1">hrs</span></p>
        </div>
        <div className="p-6 bg-white dark:bg-zinc-950 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Present Days</h3>
          <p className="text-4xl font-bold mt-2 tracking-tight">{presentDays}</p>
        </div>
        <div className="p-6 bg-white dark:bg-zinc-950 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Late Arrivals</h3>
          <p className="text-4xl font-bold mt-2 tracking-tight text-amber-500">{lateArrivals}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Card */}
        <div className="p-8 bg-white dark:bg-zinc-950 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center min-h-[360px] relative overflow-hidden">
          <div className="absolute top-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-500" />
          
          <h2 className="text-xl font-semibold mb-1">Today's Check-in</h2>
          <p className="text-sm text-zinc-500 mb-8">{format(now, "EEEE, MMMM do, yyyy")}</p>
          
          <div className="text-6xl font-mono mb-10 font-light tracking-tighter">{elapsedStr}</div>
          
          {!todayRecord ? (
            <button 
              onClick={handleCheckIn}
              disabled={actionLoading}
              className="px-10 py-4 bg-zinc-900 text-white dark:bg-white dark:text-black rounded-full font-medium text-lg hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:opacity-50 transition-all shadow-md flex items-center group"
            >
              <MapPin className="mr-2 h-5 w-5 group-hover:-translate-y-1 transition-transform" />
              {actionLoading ? "Processing..." : "Check In Now"}
            </button>
          ) : !todayRecord.checkOut ? (
            <button 
              onClick={handleCheckOut}
              disabled={actionLoading}
              className="px-10 py-4 bg-red-500 text-white rounded-full font-medium text-lg hover:bg-red-600 disabled:opacity-50 transition-all shadow-md flex items-center group"
            >
              <Clock className="mr-2 h-5 w-5 group-hover:rotate-12 transition-transform" />
              {actionLoading ? "Processing..." : "Check Out"}
            </button>
          ) : (
            <div className="flex flex-col items-center">
              <div className="flex items-center text-green-600 bg-green-50 dark:bg-green-950/30 px-6 py-3 rounded-full mb-2">
                <CheckCircle className="mr-2 h-5 w-5" />
                <span className="font-medium">Shift completed</span>
              </div>
              <span className="text-sm text-zinc-500">Checked out at {format(new Date(todayRecord.checkOut), "h:mm a")}</span>
            </div>
          )}
          
          {todayRecord?.isSuspectedProxy && (
            <div className="mt-6 flex items-center text-red-600 bg-red-50 dark:bg-red-950/30 px-4 py-2 rounded-lg text-sm font-medium border border-red-100 dark:border-red-900/50">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              Suspected proxy check-in flagged
            </div>
          )}
        </div>

        <div className="space-y-6 flex flex-col">
          {/* Weekly Strip */}
          <div className="p-6 bg-white dark:bg-zinc-950 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 flex-1">
            <h2 className="text-lg font-semibold mb-6 flex items-center">
              <Calendar className="mr-2 h-5 w-5 text-zinc-400" /> This Week
            </h2>
            <div className="flex justify-between items-center px-2">
              {weekDays.map(day => {
                const rec = records.find(r => isSameDay(new Date(r.date), day));
                const isToday = isSameDay(day, now);
                return (
                  <div key={day.toISOString()} className="flex flex-col items-center">
                    <span className={`text-xs mb-3 ${isToday ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-zinc-500'}`}>
                      {format(day, "EEE")}
                    </span>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${getStatusColor(rec?.status)} ${!rec ? 'opacity-40' : ''} ${isToday ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-zinc-950' : ''}`}>
                      {rec?.status === "PRESENT" && <CheckCircle className="w-5 h-5 text-white/90" />}
                      {rec?.status === "HALF_DAY" && <Clock className="w-5 h-5 text-white/90" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Monthly Heatmap */}
          <div className="p-6 bg-white dark:bg-zinc-950 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 flex-1">
            <h2 className="text-lg font-semibold mb-6">Monthly Overview</h2>
            <div className="grid grid-cols-7 gap-2">
              {['M','T','W','T','F','S','S'].map((d, i) => (
                <div key={`head-${i}`} className="text-center text-xs text-zinc-400 font-medium pb-2">{d}</div>
              ))}
              {Array.from({ length: monthStart.getDay() === 0 ? 6 : monthStart.getDay() - 1 }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {monthDays.map(day => {
                const rec = records.find(r => isSameDay(new Date(r.date), day));
                const isFuture = isAfter(day, now);
                return (
                  <div 
                    key={day.toISOString()} 
                    title={`${format(day, "MMM d")} - ${rec?.status || 'No record'}`}
                    className={`aspect-square rounded-md ${getStatusColor(rec?.status)} ${!rec ? 'opacity-30' : 'opacity-100'} ${isFuture ? 'opacity-10 bg-zinc-100 dark:bg-zinc-800' : ''} transition-opacity cursor-help`}
                  />
                );
              })}
            </div>
            <div className="mt-6 flex items-center justify-end space-x-4 text-xs text-zinc-500">
              <div className="flex items-center"><div className="w-3 h-3 rounded-sm bg-green-500 mr-1.5"/> Present</div>
              <div className="flex items-center"><div className="w-3 h-3 rounded-sm bg-yellow-500 mr-1.5"/> Half</div>
              <div className="flex items-center"><div className="w-3 h-3 rounded-sm bg-red-500 mr-1.5"/> Absent</div>
            </div>
          </div>
        </div>
      </div>

      {showCorrectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Regularize Attendance</h3>
              <button onClick={() => setShowCorrectionModal(false)} className="text-zinc-500 hover:text-black dark:hover:text-white">&times;</button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Date</label>
                <input 
                  type="date"
                  value={correctionForm.date}
                  onChange={e => setCorrectionForm({...correctionForm, date: e.target.value})}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-transparent"
                />
              </div>
              <div className="flex gap-4">
                <div className="space-y-1.5 flex-1">
                  <label className="text-sm font-medium">Check In</label>
                  <input 
                    type="time"
                    value={correctionForm.checkIn}
                    onChange={e => setCorrectionForm({...correctionForm, checkIn: e.target.value})}
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-transparent"
                  />
                </div>
                <div className="space-y-1.5 flex-1">
                  <label className="text-sm font-medium">Check Out</label>
                  <input 
                    type="time"
                    value={correctionForm.checkOut}
                    onChange={e => setCorrectionForm({...correctionForm, checkOut: e.target.value})}
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-transparent"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Reason</label>
                <textarea 
                  value={correctionForm.reason}
                  onChange={e => setCorrectionForm({...correctionForm, reason: e.target.value})}
                  placeholder="e.g. Forgot to punch in"
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-transparent resize-none h-24"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 flex justify-end space-x-3">
              <button 
                onClick={() => setShowCorrectionModal(false)}
                className="px-4 py-2 rounded-md font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button 
                onClick={submitCorrection}
                disabled={!correctionForm.date || !correctionForm.reason}
                className="px-4 py-2 rounded-md font-medium bg-black text-white dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-50"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
