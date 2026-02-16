import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QrCode, Users, RotateCcw, Home, Search, User, Lock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import jsQR from "jsqr";

export default function Attendance() {
  const [activeTab, setActiveTab] = useState<"scanner" | "search">("scanner");
  const [searchId, setSearchId] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [todayAttendance, setTodayAttendance] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const attendanceQuery = trpc.attendance.getTodayAttendance.useQuery();
  const recordMutation = trpc.attendance.recordAttendance.useMutation();
  const utils = trpc.useUtils();

  // Password Protection State
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState("");
  const [isPassDialogOpen, setIsPassDialogOpen] = useState(true);
  const PROTECTED_PASSWORD = "1010";

  const handlePasswordSubmit = () => {
    if (password === PROTECTED_PASSWORD) {
      setIsAuthorized(true);
      setIsPassDialogOpen(false);
      toast.success("تم الدخول بنجاح");
    } else {
      toast.error("كلمة المرور غير صحيحة");
      setPassword("");
    }
  };

  useEffect(() => {
    if (attendanceQuery.data) {
      setTodayAttendance(attendanceQuery.data);
    }
  }, [attendanceQuery.data]);

  const startCamera = async () => {
    // 1. تفعيل الحالة أولاً لضمان وجود عنصر الفيديو في الـ DOM
    setCameraActive(true);

    // 2. انتظار بسيط جداً لضمان أن الـ React انتهى من رسم الفيديو
    setTimeout(async () => {
      const constraints = [
        {
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        },
        { video: { facingMode: "environment" } },
        { video: true }
      ];

      let stream: MediaStream | null = null;
      let lastError: any = null;

      for (const constraint of constraints) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraint);
          if (stream) break;
        } catch (e) {
          lastError = e;
          continue;
        }
      }

      if (stream && videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.play();
        requestAnimationFrame(tick);
      } else {
        setCameraActive(false); // إرجاع الحالة للأصل لو فشل التشغيل
        console.error("Camera access error:", lastError);

        let errorMsg = "تأكد من إعطاء صلاحية الكاميرا للمتصفح";
        if (lastError?.name === "NotAllowedError") {
          errorMsg = "تم رفض إذن الكاميرا. يرجى تفعيله من إعدادات المتصفح بجانب رابط الموقع.";
        } else if (lastError?.name === "NotReadableError") {
          errorMsg = "الكاميرا مستخدمة من قبل تطبيق آخر حالياً.";
        }

        toast.error(errorMsg);
      }
    }, 100); // تأخير 100 ملي ثانية
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const tick = () => {
    if (!videoRef.current || !canvasRef.current) return;

    if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (context) {
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code && code.data) {
          const rawData = code.data.trim();
          let finalId = rawData;

          try {
            const qrData = JSON.parse(rawData);
            if (qrData && typeof qrData === 'object' && qrData.memberId) {
              finalId = qrData.memberId;
            } else if (typeof qrData === 'number' || typeof qrData === 'string') {
              finalId = qrData.toString();
            }
          } catch {
            // It's a plain string, keep as is
          }

          if (finalId) {
            console.log("Found QR code ID:", finalId);
            handleAttendance(finalId);
            stopCamera(); // إيقاف الكاميرا فور النجاح
            return;
          }
        }
      }
    }

    // استمرار الفحص طالما الكاميرا مفعلة
    if (videoRef.current.srcObject) {
      requestAnimationFrame(tick);
    }
  };

  const handleAttendance = async (memberId: string) => {
    if (!memberId) return;

    toast.info("جاري البحث عن العضو...");
    try {
      // Use getProfile which we've made strict to handle memberId lookups
      const member = await utils.members.getProfile.fetch({ memberId }).catch(() => null);

      if (!member) {
        toast.error("العضو غير موجود بقاعدة البيانات");
        return;
      }

      setSelectedMember(member);
      setIsDialogOpen(true);
    } catch (error: any) {
      console.error("Attendance lookup error:", error);
      toast.error("حدث خطأ أثناء تحميل بيانات العضو");
    }
  };

  const confirmAttendance = async () => {
    if (!selectedMember) return;

    try {
      await recordMutation.mutateAsync({
        memberId: selectedMember.id,
      });

      toast.success(`تم تسجيل حضور ${selectedMember.name} بنجاح`);
      setIsDialogOpen(false);
      setSelectedMember(null);
      attendanceQuery.refetch();

      if (cameraActive) {
        // Option to restart camera or just leave it stopped
      }
    } catch (error: any) {
      toast.error(error.message || "فشل تسجيل الحضور");
    }
  };

  const handleSearchAttendance = async () => {
    if (!searchId.trim()) {
      toast.error("الرجاء إدخال رقم تعريفي");
      return;
    }

    try {
      const member = await utils.members.getProfile.fetch({ memberId: searchId });
      if (!member) {
        toast.error("العضو غير موجود");
        return;
      }

      setSelectedMember(member);
      setIsDialogOpen(true);
    } catch (error: any) {
      console.error("Search error:", error);
      toast.error(error.message || "العضو غير موجود");
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* رأس الصفحة */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              تسجيل الحضور
            </h1>
            <p className="text-sm text-gray-600">نظام مسح QR Code</p>
          </div>
          <Button
            variant="outline"
            onClick={() => window.location.href = "/"}
            className="gap-2"
          >
            <Home className="w-4 h-4" />
            الرئيسية
          </Button>
        </div>
      </div>

      {/* Dialog حماية بكلمة مرور */}
      <Dialog open={isPassDialogOpen} onOpenChange={(open) => {
        if (!isAuthorized) setIsPassDialogOpen(true);
        else setIsPassDialogOpen(open);
      }}>
        <DialogContent className="max-w-sm" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <div className="mx-auto bg-blue-100 p-3 rounded-full w-fit mb-4">
              <Lock className="w-6 h-6 text-blue-600" />
            </div>
            <DialogTitle className="text-center">من فضلك أدخل كلمة المرور</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input
              type="password"
              placeholder="****"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handlePasswordSubmit()}
              className="text-center text-2xl tracking-widest font-bold"
              autoFocus
            />
            <Button
              onClick={handlePasswordSubmit}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6"
            >
              دخول
            </Button>
            <Button
              variant="ghost"
              onClick={() => window.location.href = "/"}
              className="w-full text-slate-500"
            >
              العودة للرئيسية
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {isAuthorized && (
        <div className="animate-in fade-in duration-500">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* الجزء الأيسر - مسح QR والبحث */}
              <div className="lg:col-span-2 space-y-6">
                {/* التبويبات */}
                <div className="flex gap-2 bg-white rounded-lg shadow p-2">
                  <button
                    onClick={() => setActiveTab("scanner")}
                    className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${activeTab === "scanner"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                  >
                    <QrCode className="w-4 h-4 inline mr-2" />
                    مسح QR Code
                  </button>
                  <button
                    onClick={() => setActiveTab("search")}
                    className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${activeTab === "search"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                  >
                    <Search className="w-4 h-4 inline mr-2" />
                    البحث
                  </button>
                </div>

                {/* محتوى التبويبات */}
                {activeTab === "scanner" ? (
                  <Card className="p-6">
                    <div className="space-y-4">
                      {!cameraActive ? (
                        <Button
                          onClick={startCamera}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg"
                        >
                          <QrCode className="w-6 h-6 ml-2" />
                          تشغيل الكاميرا
                        </Button>
                      ) : (
                        <Button
                          onClick={stopCamera}
                          className="w-full bg-red-600 hover:bg-red-700 text-white py-6 text-lg"
                        >
                          إيقاف الكاميرا
                        </Button>
                      )}

                      {cameraActive && (
                        <div className="space-y-4">
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className="w-full rounded-lg border-2 border-blue-400"
                            style={{ maxHeight: "400px" }}
                          />
                          <canvas ref={canvasRef} style={{ display: "none" }} />
                          <p className="text-center text-gray-600 text-sm">
                            وجه كود QR نحو الكاميرا
                          </p>
                        </div>
                      )}
                    </div>
                  </Card>
                ) : (
                  <Card className="p-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">الرقم التعريفي</label>
                        <Input
                          placeholder="أدخل الرقم التعريفي"
                          value={searchId}
                          onChange={(e) => setSearchId(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && handleSearchAttendance()}
                          dir="rtl"
                        />
                      </div>
                      <Button
                        onClick={handleSearchAttendance}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        بحث
                      </Button>
                    </div>
                  </Card>
                )}
              </div>

              {/* الجزء الأيمن - الويل */}
              <div className="space-y-6">
                {/* بطاقة العداد */}
                <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
                  <div className="text-center space-y-4">
                    <h3 className="text-lg font-bold">الحاضرون اليوم</h3>
                    <div className="text-5xl font-bold text-blue-600">
                      {todayAttendance.length}
                    </div>
                    <p className="text-gray-600 text-sm">شخص سجل حضوره</p>
                  </div>
                </Card>

                {/* قائمة الحاضرين */}
                <Card className="p-6">
                  <h3 className="text-lg font-bold mb-4">قائمة الحاضرين</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {todayAttendance.length > 0 ? (
                      todayAttendance.map((record, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-sm">{record.memberName}</p>
                            <p className="text-xs text-gray-600">{record.memberIdStr}</p>
                          </div>
                          <div className="text-xs text-green-600 font-semibold">✓</div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-gray-500 py-4">لا توجد سجلات حتى الآن</p>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dialog لتأكيد الحضور */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تأكيد الحضور</DialogTitle>
          </DialogHeader>

          {selectedMember && (
            <div className="space-y-4">
              <div className="flex flex-col items-center py-4">
                <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-slate-100 shadow-lg bg-slate-50 flex items-center justify-center">
                  {selectedMember.imageUrl ? (
                    <img
                      src={selectedMember.imageUrl}
                      alt={selectedMember.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedMember.name)}&background=random&size=256`;
                      }}
                    />
                  ) : (
                    <div className="text-slate-300 flex flex-col items-center">
                      <User className="w-16 h-16" />
                      <span className="text-xs font-bold uppercase mt-2 tracking-widest">No Image</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-600">الاسم</p>
                  <p className="font-semibold">{selectedMember.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">الرقم التعريفي</p>
                  <p className="font-mono text-sm">{selectedMember.memberId}</p>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={confirmAttendance}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={recordMutation.isPending}
                >
                  {recordMutation.isPending ? "جاري..." : "تأكيد الحضور"}
                </Button>
                <Button
                  onClick={() => setIsDialogOpen(false)}
                  variant="outline"
                  className="flex-1"
                >
                  إلغاء
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
