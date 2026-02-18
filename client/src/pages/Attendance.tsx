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
    <div className="min-h-screen bg-transparent">
      {/* رأس الصفحة */}
      <div className="bg-white/70 backdrop-blur-md shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              تسجيل الحضور
            </h1>
            <p className="text-xs md:text-sm text-gray-600">نظام مسح QR Code المتطور</p>
          </div>
          <Button
            variant="outline"
            onClick={() => window.location.href = "/"}
            className="gap-2 bg-white/50 backdrop-blur-sm"
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
        <DialogContent className="max-w-sm bg-white/80 backdrop-blur-xl border-white/20" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <div className="mx-auto bg-blue-100/50 p-4 rounded-2xl w-fit mb-4">
              <Lock className="w-8 h-8 text-blue-600" />
            </div>
            <DialogTitle className="text-center text-xl font-bold">من فضلك أدخل كلمة المرور</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input
              type="password"
              placeholder="****"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handlePasswordSubmit()}
              className="text-center text-2xl tracking-widest font-bold h-14 bg-white/50"
              autoFocus
            />
            <Button
              onClick={handlePasswordSubmit}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-14 text-lg shadow-lg shadow-blue-100"
            >
              دخول
            </Button>
            <Button
              variant="ghost"
              onClick={() => window.location.href = "/"}
              className="w-full text-slate-500 hover:bg-white/30"
            >
              العودة للرئيسية
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {isAuthorized && (
        <div className="animate-in fade-in duration-500">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* الجزء الأيسر - مسح QR والبحث */}
              <div className="lg:col-span-2 space-y-8">
                {/* التبويبات */}
                <div className="flex gap-2 bg-white/40 backdrop-blur-md rounded-2xl shadow-lg border border-white/30 p-2">
                  <button
                    onClick={() => setActiveTab("scanner")}
                    className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all duration-300 ${activeTab === "scanner"
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                      : "text-gray-700 hover:bg-white/50"
                      }`}
                  >
                    <QrCode className="w-5 h-5 inline ml-2" />
                    مسح QR Code
                  </button>
                  <button
                    onClick={() => setActiveTab("search")}
                    className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all duration-300 ${activeTab === "search"
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                      : "text-gray-700 hover:bg-white/50"
                      }`}
                  >
                    <Search className="w-5 h-5 inline ml-2" />
                    البحث اليدوي
                  </button>
                </div>

                {/* محتوى التبويبات */}
                {activeTab === "scanner" ? (
                  <Card className="p-8 bg-white/60 backdrop-blur-lg border-0 shadow-xl rounded-3xl overflow-hidden">
                    <div className="space-y-6">
                      {!cameraActive ? (
                        <div className="flex flex-col items-center space-y-6">
                          <div className="bg-blue-50 p-8 rounded-full">
                            <QrCode className="w-16 h-16 text-blue-600" />
                          </div>
                          <div className="text-center">
                            <h3 className="text-xl font-bold mb-2">كاميرا المسح جاهزة</h3>
                            <p className="text-gray-600 mb-6">اضغط على الزر أدناه لتشغيل الكاميرا ومسح الكود</p>
                          </div>
                          <Button
                            onClick={startCamera}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white h-16 text-xl rounded-2xl shadow-xl shadow-blue-100 transition-all active:scale-95"
                          >
                            <QrCode className="w-7 h-7 ml-3" />
                            تشغيل الكاميرا الآن
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div className="relative group">
                            <video
                              ref={videoRef}
                              autoPlay
                              playsInline
                              className="w-full rounded-2xl border-4 border-blue-400/30 shadow-2xl"
                              style={{ maxHeight: "400px", objectFit: "cover" }}
                            />
                            <div className="absolute inset-0 border-2 border-white/20 rounded-2xl pointer-events-none"></div>
                            <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                              LIVE
                            </div>
                          </div>
                          <canvas ref={canvasRef} style={{ display: "none" }} />
                          <div className="flex flex-col gap-4">
                            <p className="text-center text-gray-700 font-medium">
                              يرجى توجيه الكود داخل إطار الكاميرا
                            </p>
                            <Button
                              onClick={stopCamera}
                              variant="destructive"
                              className="w-full h-14 rounded-xl text-lg shadow-lg"
                            >
                              إيقاف الكاميرا
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                ) : (
                  <Card className="p-8 bg-white/60 backdrop-blur-lg border-0 shadow-xl rounded-3xl">
                    <div className="space-y-6">
                      <div className="flex flex-col items-center text-center space-y-4 mb-4">
                        <div className="bg-indigo-50 p-6 rounded-full">
                          <Search className="w-10 h-10 text-indigo-600" />
                        </div>
                        <h3 className="text-xl font-bold">بحث يدوي</h3>
                        <p className="text-gray-600">يمكنك تسجيل الحضور بإدخال الرقم التعريفي للعضو يدوياً</p>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700 mr-1">الرقم التعريفي (Member ID)</label>
                        <Input
                          placeholder="أدخل الرقم مثلاً: 123456"
                          value={searchId}
                          onChange={(e) => setSearchId(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && handleSearchAttendance()}
                          className="h-14 text-lg bg-white/50 rounded-xl"
                          dir="rtl"
                        />
                      </div>
                      <Button
                        onClick={handleSearchAttendance}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-14 text-lg rounded-xl shadow-lg shadow-indigo-100"
                      >
                        بحث وتسجيل حضور
                      </Button>
                    </div>
                  </Card>
                )}
              </div>

              {/* الجزء الأيمن - الإحصائيات والقائمة */}
              <div className="space-y-8">
                {/* بطاقة العداد */}
                <Card className="p-8 bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-0 shadow-2xl rounded-3xl relative overflow-hidden group">
                  <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
                    <Users className="w-32 h-32" />
                  </div>
                  <div className="text-center space-y-4 relative z-10">
                    <h3 className="text-lg font-bold opacity-90 uppercase tracking-wider">الحاضرون اليوم</h3>
                    <div className="text-7xl font-black drop-shadow-lg">
                      {todayAttendance.length}
                    </div>
                    <p className="text-blue-100 font-medium">شخص سجل حضوره</p>
                  </div>
                </Card>

                {/* قائمة الحاضرين */}
                <Card className="p-8 bg-white/60 backdrop-blur-lg border-0 shadow-xl rounded-3xl flex flex-col h-[500px]">
                  <h3 className="text-xl font-bold mb-6 flex items-center justify-between">
                    سجل الحضور اليوم
                    <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full">LIVE</span>
                  </h3>
                  <div className="space-y-3 overflow-y-auto pr-1 flex-1 custom-scrollbar">
                    {todayAttendance.length > 0 ? (
                      todayAttendance.map((record, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-4 p-4 bg-white/50 backdrop-blur-sm rounded-2xl hover:bg-white/80 transition-all border border-transparent hover:border-blue-100 group"
                        >
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 text-blue-700 flex items-center justify-center text-base font-black shadow-sm group-hover:rotate-6 transition-transform">
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{record.memberName}</p>
                            <p className="text-xs text-gray-500 font-mono">{record.memberIdStr}</p>
                          </div>
                          <div className="bg-green-100 text-green-600 p-1.5 rounded-full shadow-inner">
                            <RotateCcw className="w-3 h-3 rotate-45" />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full opacity-40">
                        <Users className="w-16 h-16 mb-2" />
                        <p className="text-center font-bold">لا توجد سجلات بعد</p>
                      </div>
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
