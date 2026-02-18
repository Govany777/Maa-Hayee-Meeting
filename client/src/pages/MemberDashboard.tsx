import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, X, LogOut, Home, Edit2, TrendingUp, Calendar, Camera, UserCheck, QrCode, Lock } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import QRCodeGenerator from "@/components/QRCodeGenerator";
import { clearAuthToken } from "@/lib/authToken";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface MemberSession {
  memberId: string;
  username: string;
  name: string;
  phone: string;
  sequentialId?: string; // The readable ID
  dateOfBirth?: string;
  address?: string;
  fatherOfConfession?: string;
  academicStatus?: "student" | "graduate" | "";
  academicYear?: string;
}

export default function MemberDashboard() {
  const [, setLocation] = useLocation();
  const [memberSession, setMemberSession] = useState<MemberSession | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [attendanceStats, setAttendanceStats] = useState({
    totalAttendance: 0,
    attendancePercentage: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit Profile State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    dateOfBirth: "",
    address: "",
    fatherOfConfession: "",
    academicStatus: "" as "" | "student" | "graduate",
    academicYear: "",
  });

  // Password Reset State
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const updateProfileMutation = trpc.members.updateProfile.useMutation();
  const changePasswordMutation = trpc.members.changePassword.useMutation();
  const uploadMutation = trpc.members.uploadImage.useMutation();

  // التحقق من الجلسة عند تحميل الصفحة
  const checkSession = () => {
    // Check both local and session storage
    const localSession = localStorage.getItem("memberSession");
    const sessionOnly = sessionStorage.getItem("memberSession");
    const session = localSession || sessionOnly;

    if (!session) {
      setLocation("/members-registration");
      return;
    }

    try {
      const parsedSession = JSON.parse(session);

      // Check for 30-day expiry (if stored in localStorage)
      if (localSession && parsedSession.lastLogin) {
        const loginDate = new Date(parsedSession.lastLogin).getTime();
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        if (now - loginDate > thirtyDaysInMs) {
          localStorage.removeItem("memberSession");
          clearAuthToken();
          toast.error("انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى");
          setLocation("/members-registration");
          return;
        }
      }

      setMemberSession(parsedSession);
      if (parsedSession.imageUrl) setProfileImage(parsedSession.imageUrl);
    } catch (e) {
      console.error("Session parsing error", e);
      setLocation("/members-registration");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("memberSession");
    sessionStorage.removeItem("memberSession");
    clearAuthToken();
    toast.success("تم تسجيل الخروج بنجاح");
    setLocation("/members-registration");
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("حجم الصورة كبير جداً");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const max_size = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > max_size) {
              height *= max_size / width;
              width = max_size;
            }
          } else {
            if (height > max_size) {
              width *= max_size / height;
              height = max_size;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            setProfileImage(dataUrl);

            // Auto-save the image
            toast.promise(handleAutoUpdateImage(dataUrl), {
              loading: 'جاري حفظ الصورة...',
              success: 'تم حفظ الصورة بنجاح',
              error: (err: any) => {
                console.error("Upload error details:", err);
                return `فشل حفظ الصورة: ${err.message || 'خطأ غير معروف'}`;
              }
            });
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAutoUpdateImage = async (dataUrl: string) => {
    if (!memberSession) return;

    setIsLoading(true);
    try {
      const uploadResult = await uploadMutation.mutateAsync({
        base64: dataUrl,
        fileName: `profile-${memberSession.memberId}-${Date.now()}.jpg`
      });

      await updateProfileMutation.mutateAsync({
        memberId: memberSession.memberId,
        imageUrl: uploadResult.url
      });

      // Update session storage
      const updatedSession = { ...memberSession, imageUrl: uploadResult.url };
      setMemberSession(updatedSession);

      // Sync both storages
      if (localStorage.getItem("memberSession")) {
        localStorage.setItem("memberSession", JSON.stringify(updatedSession));
      }
      if (sessionStorage.getItem("memberSession")) {
        sessionStorage.setItem("memberSession", JSON.stringify(updatedSession));
      }

      profileQuery.refetch();
    } catch (error: any) {
      console.error("Auto update image error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!memberSession) return;
    setProfileImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    try {
      await updateProfileMutation.mutateAsync({
        memberId: memberSession.memberId,
        imageUrl: "" // Clear image
      });

      const updatedSession = { ...memberSession, imageUrl: "" };
      setMemberSession(updatedSession);

      if (localStorage.getItem("memberSession")) {
        localStorage.setItem("memberSession", JSON.stringify(updatedSession));
      }
      if (sessionStorage.getItem("memberSession")) {
        sessionStorage.setItem("memberSession", JSON.stringify(updatedSession));
      }

      toast.success("تم حذف الصورة بنجاح");
      profileQuery.refetch();
    } catch (error) {
      toast.error("فشل حذف الصورة");
    }
  };

  const handleLogout = () => {
    clearAuthToken();
    sessionStorage.removeItem("memberSession");
    localStorage.removeItem("memberSession");
    toast.success("تم تسجيل الخروج بنجاح");
    setLocation("/members-registration");
  };

  // استدعاء useQuery بدون شرط (يجب استدعاء جميع الـ hooks بدون شروط)
  const profileQuery = trpc.members.getProfile.useQuery(
    { memberId: memberSession?.memberId || "" },
    { enabled: !!memberSession?.memberId }
  );

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (memberSession && profileQuery?.data) {
      setAttendanceStats({
        totalAttendance: profileQuery.data.totalAttendance || 0,
        attendancePercentage: profileQuery.data.attendancePercentage || 0,
      });
      // Always sync profileImage with the DB value when it changes
      // This ensures that after a refresh or re-login, we use the DB value
      setProfileImage(profileQuery.data.imageUrl || null);
      // Sync edit form with profile data
      setEditForm({
        name: profileQuery.data.name || memberSession.name || "",
        phone: profileQuery.data.phone || memberSession.phone || "",
        dateOfBirth: profileQuery.data.dateOfBirth ? (typeof profileQuery.data.dateOfBirth === 'string' ? profileQuery.data.dateOfBirth : new Date(profileQuery.data.dateOfBirth).toISOString().split('T')[0]) : (memberSession.dateOfBirth || ""),
        address: profileQuery.data.address || memberSession.address || "",
        fatherOfConfession: profileQuery.data.fatherOfConfession || memberSession.fatherOfConfession || "",
        academicStatus: profileQuery.data.academicStatus || memberSession.academicStatus || "",
        academicYear: profileQuery.data.academicYear || memberSession.academicYear || "",
      });
    }
  }, [profileQuery?.data, memberSession]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberSession) return;
    setIsLoading(true);
    try {
      await updateProfileMutation.mutateAsync({
        memberId: memberSession.memberId,
        ...editForm,
        academicStatus: editForm.academicStatus === "" ? null : editForm.academicStatus
      });
      toast.success("تم تحديث البيانات بنجاح");
      setIsEditOpen(false);
      profileQuery.refetch();
    } catch (error: any) {
      toast.error("فشل تحديث البيانات: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberSession) return;
    if (newPassword.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    setIsLoading(true);
    try {
      await changePasswordMutation.mutateAsync({
        memberId: memberSession.memberId,
        newPassword
      });
      toast.success("تم تغيير كلمة المرور بنجاح");
      setIsPasswordOpen(false);
      setNewPassword("");
    } catch (error: any) {
      toast.error("فشل تغيير كلمة المرور: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!memberSession) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-bold">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#e2e8f0] to-[#cbd5e1] p-4 md:p-8 relative overflow-hidden">
      {/* Decorative Blobs for Glassmorphism Context */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-400/10 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-400/10 blur-[120px] rounded-full"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* رأس الصفحة العائم */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6 bg-white/40 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/40 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200">
              <UserCheck className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-800">ملفي الشخصي</h1>
              <p className="text-sm font-bold text-slate-500">مرحباً بك مجدداً في نظام الخدمة</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setLocation("/")}
              variant="outline"
              className="gap-2 h-12 px-6 rounded-2xl bg-white/50 border-white hover:bg-white transition-all shadow-sm"
            >
              <Home className="w-5 h-5 text-slate-600" />
              <span className="font-bold text-slate-700">الرئيسية</span>
            </Button>
            <Button
              onClick={handleLogout}
              variant="destructive"
              className="gap-2 h-12 px-6 rounded-2xl shadow-lg transition-all active:scale-95"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-bold">خروج</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* العمود الجانبي - الهوية والصورة */}
          <div className="lg:col-span-4 space-y-8">
            {/* بطاقة الشخصية الزجاجية */}
            <Card className="p-8 bg-white/60 backdrop-blur-2xl border-white/20 rounded-[3rem] shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-blue-500/5 to-transparent"></div>

              <div className="flex flex-col items-center relative z-10">
                <div className="relative group/photo mb-6">
                  <div
                    className="w-48 h-48 rounded-[3.5rem] overflow-hidden border-8 border-white/80 shadow-2xl bg-slate-100 flex items-center justify-center cursor-pointer transition-all duration-700 group-hover:scale-105 group-hover:rotate-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {profileImage ? (
                      <img
                        src={profileImage}
                        alt="Profile"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover/photo:scale-110"
                      />
                    ) : (
                      <div className="text-blue-200 flex flex-col items-center">
                        <Camera className="w-16 h-16 mb-2 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Add Photo</span>
                      </div>
                    )}
                  </div>

                  <div className="absolute -bottom-2 -left-2 flex gap-1">
                    <Button
                      type="button"
                      size="icon"
                      className="rounded-2xl h-12 w-12 shadow-xl bg-blue-600 hover:bg-blue-700 border-4 border-white transition-transform active:scale-90"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-5 w-5" />
                    </Button>
                    {profileImage && (
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        className="rounded-2xl h-12 w-12 shadow-xl border-4 border-white transition-transform active:scale-90"
                        onClick={handleRemoveImage}
                        disabled={isLoading}
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </div>

                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-black text-slate-800">{profileQuery?.data?.name || memberSession.name}</h2>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xs font-black text-blue-600 bg-blue-100/50 px-3 py-1 rounded-full border border-blue-200/30">
                      @{memberSession.username}
                    </span>
                    <span className="text-xs font-black text-indigo-600 bg-indigo-100/50 px-3 py-1 rounded-full border border-indigo-200/30 font-mono">
                      ID: {profileQuery.data?.memberId || memberSession.sequentialId || memberSession.memberId}
                    </span>
                  </div>
                </div>
              </div>

              {/* تفاصيل سريعة */}
              <div className="mt-10 space-y-4 pt-8 border-t border-white/40">
                <div className="flex items-center gap-4 group/item">
                  <div className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover/item:text-blue-500 transition-colors">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">تاريخ الميلاد</p>
                    <p className="font-bold text-slate-700">
                      {profileQuery?.data?.dateOfBirth ? (typeof profileQuery.data.dateOfBirth === 'string' ? profileQuery.data.dateOfBirth : new Date(profileQuery.data.dateOfBirth).toLocaleDateString('ar-EG')) : "غير محدد"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 group/item">
                  <div className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover/item:text-blue-500 transition-colors">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">الحالة الدراسية</p>
                    <p className="font-bold text-slate-700">
                      {profileQuery?.data?.academicStatus === 'student' ? `طالب - ${profileQuery?.data?.academicYear}` : profileQuery?.data?.academicStatus === 'graduate' ? 'خريج' : 'غير محدد'}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* بطاقة الهوية الرقمية */}
            <Card className="p-8 bg-gradient-to-br from-slate-800 to-slate-900 border-none rounded-[3rem] shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
              <div className="relative z-10 flex flex-col items-center gap-6">
                <div className="bg-white p-5 rounded-[2.5rem] shadow-[0_20px_50px_rgba(255,255,255,0.1)] group-hover:scale-105 transition-transform duration-500">
                  <QRCodeGenerator
                    value={profileQuery.data?.memberId || memberSession.sequentialId || memberSession.memberId}
                    size={160}
                    className="rounded-xl"
                  />
                </div>
                <div className="text-center">
                  <h3 className="text-white font-black text-xl mb-1 tracking-tight">هوية الحضور الرقمية</h3>
                  <p className="text-slate-400 text-xs font-bold leading-relaxed px-4">
                    أظهر هذا الكود للمسؤول لتسجيل حضورك في الاجتماع
                  </p>
                </div>
                <div className="w-full h-px bg-white/10 my-2"></div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-[10px] font-black text-white/60 tracking-[0.3em] uppercase">Status: Active</span>
                </div>
              </div>
            </Card>
          </div>

          {/* العمود الرئيسي - الإحصائيات والتفاصيل */}
          <div className="lg:col-span-8 space-y-8">
            {/* بطاقات أرقام زجاجية */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-8 bg-white/60 backdrop-blur-xl border border-white/40 rounded-[3rem] shadow-xl relative overflow-hidden flex items-center gap-6 group hover:shadow-2xl transition-all">
                <div className="w-20 h-20 rounded-[1.8rem] bg-blue-600/10 flex items-center justify-center text-blue-600">
                  <UserCheck className="w-10 h-10" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-500 uppercase tracking-wider mb-1">مرات الحضور</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black text-slate-800">{attendanceStats.totalAttendance}</span>
                    <span className="text-sm font-bold text-slate-400">مرة</span>
                  </div>
                </div>
                <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-blue-600/5 rounded-full blur-xl group-hover:scale-150 transition-transform"></div>
              </div>

              <div className="p-8 bg-white/60 backdrop-blur-xl border border-white/40 rounded-[3rem] shadow-xl relative overflow-hidden flex items-center gap-6 group hover:shadow-2xl transition-all">
                <div className="w-20 h-20 rounded-[1.8rem] bg-indigo-600/10 flex items-center justify-center text-indigo-600">
                  <TrendingUp className="w-10 h-10" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-500 uppercase tracking-wider mb-1">نسبة الحضور</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black text-slate-800">{attendanceStats.attendancePercentage}</span>
                    <span className="text-sm font-bold text-slate-400">%</span>
                  </div>
                </div>
                <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-indigo-600/5 rounded-full blur-xl group-hover:scale-150 transition-transform"></div>
              </div>
            </div>

            {/* تفاصيل الحضور زجاجية */}
            <Card className="p-10 bg-white/60 backdrop-blur-2xl border-white/40 rounded-[3rem] shadow-2xl">
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h3 className="text-2xl font-black text-slate-800 mb-1">تفاصيل ومتابعة الحضور</h3>
                  <p className="text-sm font-bold text-slate-500">مستوى حضورك بناءً على إجمالي الاجتماعات</p>
                </div>
              </div>

              <div className="space-y-10">
                <div className="relative pt-2">
                  <div className="flex justify-between items-baseline mb-4">
                    <span className="text-lg font-black text-slate-700">النمو التراكمي</span>
                    <span className="text-3xl font-black text-blue-600">{attendanceStats.attendancePercentage}%</span>
                  </div>
                  <div className="w-full h-5 bg-white shadow-inner rounded-full overflow-hidden p-1 border border-white/40">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${attendanceStats.attendancePercentage >= 80 ? 'from-green-500 to-green-400' : attendanceStats.attendancePercentage >= 50 ? 'from-blue-600 to-blue-500' : 'from-red-600 to-red-500'} transition-all duration-1000 ease-out shadow-lg`}
                      style={{ width: `${attendanceStats.attendancePercentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                    <span>Level 0</span>
                    <span>Intermediate</span>
                    <span>Professional</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-white/40">
                  <div className="p-5 bg-white/40 rounded-3xl border border-white/20">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">حالة الحضور</p>
                    <p className={`text-xl font-black ${attendanceStats.attendancePercentage >= 80 ? 'text-green-600' : attendanceStats.attendancePercentage >= 50 ? 'text-blue-600' : 'text-red-500'}`}>
                      {attendanceStats.attendancePercentage >= 80 ? 'ممتاز جداً' : attendanceStats.attendancePercentage >= 50 ? 'جيد جداً' : 'ضعيف'}
                    </p>
                  </div>
                  <div className="p-5 bg-white/40 rounded-3xl border border-white/20">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">الرتبة الحالية</p>
                    <p className="text-xl font-black text-slate-700">عضو نشط</p>
                  </div>
                  <div className="p-5 bg-white/40 rounded-3xl border border-white/20">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">أب الاعتراف</p>
                    <p className="text-xl font-black text-slate-700 truncate">{profileQuery.data?.fatherOfConfession || 'لم يحدد'}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* أزرار الإجراءات زجاجية */}
            <div className="flex flex-col md:flex-row gap-4">
              <Button
                onClick={() => setIsEditOpen(true)}
                className="flex-1 h-16 rounded-[2rem] gap-3 bg-white text-slate-800 border-2 border-white/50 hover:bg-slate-50 shadow-xl font-black text-lg transition-all active:scale-95"
              >
                <Edit2 className="w-6 h-6 text-blue-600" />
                <span>تعديل البيانات الشخصية</span>
              </Button>
              <Button
                onClick={() => setIsPasswordOpen(true)}
                className="flex-1 h-16 rounded-[2rem] gap-3 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-100 font-black text-lg transition-all active:scale-95"
              >
                <Lock className="w-6 h-6" />
                <span>إعادة تعيين كلمة المرور</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md bg-white/80 backdrop-blur-2xl border-white/40 rounded-[3rem] p-8 shadow-2xl" dir="rtl">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-right text-2xl font-black text-slate-800">تعديل البيانات الشخصية</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateProfile} className="flex flex-col max-h-[70vh]">
            <div className="space-y-5 overflow-y-auto px-1 py-4 flex-1">
              <div className="space-y-1.5 px-1">
                <Label htmlFor="edit-name" className="text-xs font-black text-slate-500 mr-2">الاسم الكامل</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="h-12 bg-white/50 border-0 shadow-inner rounded-xl font-bold"
                  required
                />
              </div>
              <div className="space-y-1.5 px-1">
                <Label htmlFor="edit-phone" className="text-xs font-black text-slate-500 mr-2">رقم الهاتف</Label>
                <Input
                  id="edit-phone"
                  value={editForm.phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                    setEditForm(prev => ({ ...prev, phone: val }));
                  }}
                  className="h-12 bg-white/50 border-0 shadow-inner rounded-xl font-bold font-mono"
                />
              </div>
              <div className="space-y-1.5 px-1">
                <Label className="text-xs font-black text-slate-500 mr-2">تاريخ الميلاد</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full justify-start text-right font-bold relative h-12 bg-white/50 border-0 shadow-inner rounded-xl hover:bg-white/80 ${!editForm.dateOfBirth && "text-muted-foreground"}`}
                    >
                      <Calendar className="absolute right-3 top-3.5 w-5 h-5 text-gray-400" />
                      {editForm.dateOfBirth ? (
                        format(new Date(editForm.dateOfBirth), "PPP", { locale: ar })
                      ) : (
                        <span>اختر التاريخ</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-3xl overflow-hidden border-0 shadow-2xl" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={editForm.dateOfBirth ? new Date(editForm.dateOfBirth) : undefined}
                      onSelect={(date) => setEditForm(prev => ({ ...prev, dateOfBirth: date ? date.toISOString().split('T')[0] : "" }))}
                      initialFocus
                      captionLayout="dropdown"
                      fromYear={1950}
                      toYear={new Date().getFullYear()}
                      locale={ar}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5 px-1">
                <Label className="text-xs font-black text-slate-500 mr-2">الحالة الدراسية</Label>
                <Select
                  value={editForm.academicStatus}
                  onValueChange={(val: any) => setEditForm(prev => ({ ...prev, academicStatus: val, academicYear: val === "graduate" ? "" : prev.academicYear }))}
                >
                  <SelectTrigger className="w-full h-12 bg-white/50 border-0 shadow-inner rounded-xl font-bold">
                    <SelectValue placeholder="اختر الحالة" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-0 shadow-xl bg-white/90 backdrop-blur-lg">
                    <SelectItem value="student" className="rounded-xl">طالب</SelectItem>
                    <SelectItem value="graduate" className="rounded-xl">خريج</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editForm.academicStatus === "student" && (
                <div className="space-y-1.5 px-1">
                  <Label className="text-xs font-black text-slate-500 mr-2">السنة الدراسية</Label>
                  <Select
                    value={editForm.academicYear}
                    onValueChange={(val) => setEditForm(prev => ({ ...prev, academicYear: val }))}
                  >
                    <SelectTrigger className="w-full h-12 bg-white/50 border-0 shadow-inner rounded-xl font-bold">
                      <SelectValue placeholder="اختر السنة" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-0 shadow-xl bg-white/90 backdrop-blur-lg">
                      {["أولى", "ثانية", "ثالثة", "رابعة", "خامسة", "سادسة"].map(year => (
                        <SelectItem key={year} value={year} className="rounded-xl">{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5 px-1">
                <Label htmlFor="edit-address" className="text-xs font-black text-slate-500 mr-2">العنوان</Label>
                <Input
                  id="edit-address"
                  value={editForm.address}
                  onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                  className="h-12 bg-white/50 border-0 shadow-inner rounded-xl font-bold"
                />
              </div>
              <div className="space-y-1.5 px-1">
                <Label htmlFor="edit-father" className="text-xs font-black text-slate-500 mr-2">أب الاعتراف</Label>
                <Input
                  id="edit-father"
                  value={editForm.fatherOfConfession}
                  onChange={(e) => setEditForm(prev => ({ ...prev, fatherOfConfession: e.target.value }))}
                  className="h-12 bg-white/50 border-0 shadow-inner rounded-xl font-bold"
                />
              </div>
            </div>
            <DialogFooter className="mt-6 gap-3 pt-6 border-t border-slate-100 flex flex-row">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="flex-1 h-14 rounded-2xl font-bold border-2 order-2 md:order-1">
                إلغاء
              </Button>
              <Button type="submit" disabled={isLoading} className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 font-black text-lg shadow-xl shadow-blue-100 transition-all active:scale-95 text-white order-1 md:order-2">
                {isLoading ? "جاري الحفظ..." : "حفظ التعديلات"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={isPasswordOpen} onOpenChange={setIsPasswordOpen}>
        <DialogContent className="max-w-md bg-white/80 backdrop-blur-2xl border-white/40 rounded-[3rem] p-8 shadow-2xl" dir="rtl">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-right text-2xl font-black text-slate-800">إعادة تعيين كلمة المرور</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-xs font-black text-slate-500 mr-2">كلمة المرور الجديدة</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="6 أحرف على الأقل"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-12 bg-white/50 border-0 shadow-inner rounded-xl font-bold font-mono"
                required
              />
            </div>
            <DialogFooter className="mt-8 gap-3">
              <Button type="submit" disabled={isLoading} className="flex-1 h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg shadow-xl shadow-indigo-100 transition-all active:scale-95">
                {isLoading ? "جاري التغيير..." : "تغيير كلمة المرور"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsPasswordOpen(false)} className="flex-1 h-14 rounded-2xl font-bold border-2">
                إلغاء
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

