import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Camera, Search, AlertCircle, CheckCircle, Play, Pause, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import jsQR from "jsqr";

export default function AttendanceScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [searchId, setSearchId] = useState("");
  const [scannedMember, setScannedMember] = useState<any>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const getMemberQuery = trpc.members.getProfile.useQuery(
    { memberId: searchId.trim() },
    { enabled: searchId.trim().length > 0 }
  );

  const recordAttendanceMutation = trpc.attendance.recordAttendance.useMutation();
  const getTodayQuery = trpc.attendance.getTodayAttendance.useQuery();

  // تشغيل الكاميرا
  const startCamera = async () => {
    try {
      setCameraError(null);
      const constraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
        setIsScanning(true);
      }
    } catch (error: any) {
      let errorMsg = "فشل تشغيل الكاميرا";
      if (error.name === "NotAllowedError") {
        errorMsg = "تم رفض الوصول إلى الكاميرا. الرجاء السماح بالوصول.";
      } else if (error.name === "NotFoundError") {
        errorMsg = "لم يتم العثور على كاميرا على جهازك";
      }
      setCameraError(errorMsg);
      toast.error(errorMsg);
    }
  };

  // إيقاف الكاميرا
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
    }
    setIsCameraActive(false);
    setIsScanning(false);
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }
  };

  // مسح QR Code
  useEffect(() => {
    if (!isScanning || !isCameraActive) return;

    const scanQR = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas || !video.videoWidth) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code) {
        try {
          const qrData = JSON.parse(code.data);
          if (qrData.memberId) {
            setSearchId(qrData.memberId);
            setIsScanning(false);
          }
        } catch {
          // محاولة استخدام البيانات مباشرة
          if (code.data.trim()) {
            setSearchId(code.data.trim());
            setIsScanning(false);
          }
        }
      }
    };

    scanIntervalRef.current = setInterval(scanQR, 300);

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, [isScanning, isCameraActive]);

  // معالجة البحث
  useEffect(() => {
    if (getMemberQuery.data) {
      setScannedMember(getMemberQuery.data);
      handleRecordAttendance(getMemberQuery.data);
    }
  }, [getMemberQuery.data]);

  // تسجيل الحضور
  const handleRecordAttendance = async (member: any) => {
    try {
      await recordAttendanceMutation.mutateAsync({
        memberId: member.id,
      });

      toast.success(`✓ تم تسجيل حضور ${member.name}`);
      getTodayQuery.refetch();

      // إعادة تعيين بعد 2 ثانية
      setTimeout(() => {
        setScannedMember(null);
        setSearchId("");
        setIsScanning(true);
      }, 2000);
    } catch (error: any) {
      toast.error(error.message || "فشل تسجيل الحضور");
      setIsScanning(true);
    }
  };

  const todayAttendance = getTodayQuery.data || [];

  return (
    <div className="space-y-6">
      {/* قسم الكاميرا */}
      <Card className="p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Camera className="w-5 h-5 text-blue-600" />
          مسح QR Code من الكاميرا
        </h3>

        {cameraError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-red-800 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">خطأ في الكاميرا</p>
              <p className="text-sm">{cameraError}</p>
            </div>
          </div>
        )}

        {!isCameraActive ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Camera className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">انقر على الزر أدناه لتشغيل الكاميرا</p>
            <Button
              onClick={startCamera}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              size="lg"
            >
              <Camera className="w-5 h-5" />
              تشغيل الكاميرا
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />

              {isScanning && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="border-4 border-green-500 w-48 h-48 rounded-lg animate-pulse" />
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => setIsScanning(!isScanning)}
                variant="outline"
                className="flex-1 gap-2"
              >
                {isScanning ? (
                  <>
                    <Pause className="w-4 h-4" />
                    إيقاف المسح
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    استئناف المسح
                  </>
                )}
              </Button>

              <Button
                onClick={stopCamera}
                variant="destructive"
                className="flex-1 gap-2"
              >
                <X className="w-4 h-4" />
                إيقاف الكاميرا
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* قسم البحث بالرقم التعريفي */}
      <Card className="p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Search className="w-5 h-5 text-green-600" />
          البحث بالرقم التعريفي
        </h3>

        <div className="flex gap-2">
          <Input
            placeholder="أدخل الرقم التعريفي..."
            value={searchId}
            onChange={(e) => setSearchId(e.target.value.trim())}
            dir="rtl"
            className="flex-1"
          />
          <Button
            onClick={() => setSearchId("")}
            variant="outline"
          >
            مسح
          </Button>
        </div>

        {getMemberQuery.isLoading && (
          <p className="text-center text-gray-600 mt-4">جاري البحث...</p>
        )}
      </Card>

      {/* بيانات العضو المكتشف */}
      {scannedMember && (
        <Card className="p-6 bg-green-50 border-2 border-green-300">
          <div className="flex items-start gap-4">
            {scannedMember.imageUrl && (
              <img
                src={scannedMember.imageUrl}
                alt={scannedMember.name}
                className="w-24 h-24 rounded-lg object-cover border-2 border-green-300"
              />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h4 className="text-xl font-bold text-green-900">
                  {scannedMember.name}
                </h4>
              </div>
              <p className="text-sm text-green-700">
                الرقم التعريفي: {scannedMember.memberId}
              </p>
              {scannedMember.phone && (
                <p className="text-sm text-green-700">
                  الهاتف: {scannedMember.phone}
                </p>
              )}
              <p className="text-sm font-semibold text-green-600 mt-3">
                ✓ تم تسجيل الحضور بنجاح
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* قائمة الحاضرين اليوم */}
      <Card className="p-6">
        <h3 className="text-lg font-bold mb-4">
          الحاضرون اليوم ({todayAttendance.length})
        </h3>

        {todayAttendance.length > 0 ? (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {todayAttendance.map((record: any, idx: number) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{record.memberName}</p>
                  <p className="text-xs text-gray-600">#{record.memberIdStr}</p>
                </div>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-semibold">
                  حاضر
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">لا توجد سجلات حتى الآن</p>
        )}
      </Card>
    </div>
  );
}
