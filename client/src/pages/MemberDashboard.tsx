import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, X, LogOut, Home, Edit2, TrendingUp, Calendar, Camera, UserCheck, QrCode } from "lucide-react";
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

interface MemberSession {
  memberId: string;
  username: string;
  name: string;
  phone: string;
  sequentialId?: string; // The readable ID
  dateOfBirth?: string;
  address?: string;
  fatherOfConfession?: string;
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
  });

  // Password Reset State
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const updateProfileMutation = trpc.members.updateProfile.useMutation();
  const changePasswordMutation = trpc.members.changePassword.useMutation();
  const uploadMutation = trpc.members.uploadImage.useMutation();

  // التحقق من الجلسة عند تحميل الصفحة
  const checkSession = () => {
    const session = sessionStorage.getItem("memberSession");
    if (!session) {
      setLocation("/members-registration");
      return;
    }
    const parsedSession = JSON.parse(session);
    setMemberSession(parsedSession);
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
      sessionStorage.setItem("memberSession", JSON.stringify(updatedSession));

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
      sessionStorage.setItem("memberSession", JSON.stringify(updatedSession));

      toast.success("تم حذف الصورة بنجاح");
      profileQuery.refetch();
    } catch (error) {
      toast.error("فشل حذف الصورة");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("memberSession");
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
        ...editForm
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* رأس الصفحة */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
            ملفي الشخصي
          </h1>
          <div className="flex gap-2">
            <Button
              onClick={() => setLocation("/")}
              variant="outline"
              className="gap-2"
            >
              <Home className="w-4 h-4" />
              <span>الرئيسية</span>
            </Button>
            <Button
              onClick={handleLogout}
              variant="destructive"
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>خروج</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* بطاقة الملف الشخصي */}
          <Card className="lg:col-span-1 p-6">
            <div className="space-y-6">
              {/* الصورة الشخصية الاحترافية */}
              <div className="flex flex-col items-center">
                <div className="relative group">
                  <div
                    className="w-40 h-40 rounded-full overflow-hidden border-4 border-white shadow-xl bg-slate-100 flex items-center justify-center cursor-pointer transition-transform hover:scale-105"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {profileImage ? (
                      <img
                        src={profileImage}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-slate-400 flex flex-col items-center">
                        <Camera className="w-12 h-12 mb-1" />
                        <span className="text-xs font-bold uppercase tracking-wider">Change</span>
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    className="absolute bottom-2 left-2 rounded-full h-10 w-10 shadow-lg bg-blue-600 hover:bg-blue-700 border-2 border-white"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-5 w-5" />
                  </Button>
                  {profileImage && (
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="absolute top-1 right-1 rounded-full h-8 w-8 shadow-md border-2 border-white"
                      onClick={handleRemoveImage}
                      disabled={isLoading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </div>
              </div>

              {/* معلومات العضو */}
              <div className="space-y-3 border-t pt-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase">اسم المستخدم</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {memberSession.username}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">الاسم الكامل</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {profileQuery?.data?.name || memberSession.name}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">رقم الهاتف</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {profileQuery?.data?.phone || memberSession.phone}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">تاريخ الميلاد</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {profileQuery?.data?.dateOfBirth ? (typeof profileQuery.data.dateOfBirth === 'string' ? profileQuery.data.dateOfBirth : new Date(profileQuery.data.dateOfBirth).toLocaleDateString('ar-EG')) : memberSession.dateOfBirth || "غير محدد"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">العنوان</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {profileQuery?.data?.address || memberSession.address || "غير محدد"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">اب الاعتراف</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {profileQuery?.data?.fatherOfConfession || memberSession.fatherOfConfession || "غير محدد"}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Digital ID / QR Code Card */}
          <Card className="lg:col-span-1 p-6 bg-white shadow-sm border-none overflow-hidden relative">
            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-bl-full -mr-10 -mt-10"></div>
            <div className="flex flex-col items-center space-y-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-blue-600" />
                هوية الحضور الرقمية
              </h3>

              <div className="p-4 bg-white border-2 border-slate-100 rounded-2xl shadow-inner">
                <QRCodeGenerator
                  value={memberSession.sequentialId || memberSession.memberId}
                  size={180}
                  className="rounded-lg"
                />
              </div>

              <div className="text-center">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Coded ID</p>
                <p className="text-lg font-mono font-bold text-blue-600 bg-blue-50 px-4 py-1 rounded-full border border-blue-100">
                  {memberSession.sequentialId || memberSession.memberId}
                </p>
              </div>

              <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                استخدم هذا الكود لتسجيل حضورك <br /> في الاجتماع عبر الكاميرا
              </p>
            </div>
          </Card>

          {/* إحصائيات الحضور */}
          <div className="lg:col-span-3 space-y-6">
            {/* بطاقات الإحصائيات الرئيسية */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* عدد مرات الحضور */}
              <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 font-medium mb-2">عدد مرات الحضور</p>
                    <p className="text-4xl font-bold text-blue-700">
                      {attendanceStats.totalAttendance}
                    </p>
                    <p className="text-xs text-blue-500 mt-2">مرة حضور</p>
                  </div>
                  <div className="bg-blue-200 p-4 rounded-full">
                    <Calendar className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
              </Card>

              {/* نسبة الحضور */}
              <Card className="p-6 bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-indigo-600 font-medium mb-2">نسبة الحضور</p>
                    <p className="text-4xl font-bold text-indigo-700">
                      {attendanceStats.attendancePercentage}%
                    </p>
                    <p className="text-xs text-indigo-500 mt-2">من إجمالي الاجتماعات</p>
                  </div>
                  <div className="bg-indigo-200 p-4 rounded-full">
                    <TrendingUp className="w-8 h-8 text-indigo-600" />
                  </div>
                </div>
              </Card>
            </div>

            {/* تفاصيل إحصائيات الحضور */}
            <Card className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">تفاصيل الحضور</h2>

              <div className="space-y-4">
                {/* شريط التقدم */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">نسبة الحضور</span>
                    <span className="text-sm font-bold text-gray-900">
                      {attendanceStats.attendancePercentage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${attendanceStats.attendancePercentage}%` }}
                    ></div>
                  </div>
                </div>

                {/* معلومات إضافية */}
                <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase mb-1">إجمالي الحضور</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {attendanceStats.totalAttendance}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase mb-1">حالة الحضور</p>
                    <p className={`text-lg font-bold ${attendanceStats.attendancePercentage >= 80 ? 'text-green-600' : attendanceStats.attendancePercentage >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {attendanceStats.attendancePercentage >= 80 ? 'ممتاز' : attendanceStats.attendancePercentage >= 50 ? 'جيد' : 'يحتاج تحسين'}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* أزرار الإجراءات */}
            <div className="flex gap-3">
              <Button
                onClick={() => setIsEditOpen(true)}
                className="flex-1 gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                <Edit2 className="w-4 h-4" />
                <span>تعديل البيانات</span>
              </Button>
              <Button
                onClick={() => setIsPasswordOpen(true)}
                variant="outline"
                className="flex-1"
              >
                إعادة تعيين كلمة المرور
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">تعديل البيانات الشخصية</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateProfile} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">الاسم الكامل</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">رقم الهاتف</Label>
              <Input
                id="edit-phone"
                value={editForm.phone}
                onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-dob">تاريخ الميلاد</Label>
              <Input
                id="edit-dob"
                type="date"
                value={editForm.dateOfBirth}
                onChange={(e) => setEditForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">العنوان</Label>
              <Input
                id="edit-address"
                value={editForm.address}
                onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-father">اب الاعتراف</Label>
              <Input
                id="edit-father"
                value={editForm.fatherOfConfession}
                onChange={(e) => setEditForm(prev => ({ ...prev, fatherOfConfession: e.target.value }))}
              />
            </div>
            <DialogFooter className="mt-6 flex-row-reverse gap-2">
              <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                {isLoading ? "جاري الحفظ..." : "حفظ التغييرات"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                إلغاء
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={isPasswordOpen} onOpenChange={setIsPasswordOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">إعادة تعيين كلمة المرور</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">كلمة المرور الجديدة</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="6 أحرف على الأقل"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <DialogFooter className="mt-6 flex-row-reverse gap-2">
              <Button type="submit" disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700">
                {isLoading ? "جاري التغيير..." : "تغيير كلمة المرور"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsPasswordOpen(false)}>
                إلغاء
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
