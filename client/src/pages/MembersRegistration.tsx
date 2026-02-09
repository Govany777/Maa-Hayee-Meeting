import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Lock, User, Phone, AlertCircle, Home, Upload, X, Calendar, MapPin, Users, Camera } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface RegistrationFormData {
  username: string;
  password: string;
  confirmPassword: string;
  phone: string;
  fullName: string;
  dateOfBirth: string;
  address: string;
  fatherOfConfession: string;
}

export default function MembersRegistration() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState<RegistrationFormData>({
    username: "",
    password: "",
    confirmPassword: "",
    phone: "",
    fullName: "",
    dateOfBirth: "",
    address: "",
    fatherOfConfession: "",
  });
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"login" | "register">("register");
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const registerMutation = trpc.members.register.useMutation();
  const loginMutation = trpc.members.login.useMutation();
  const uploadMutation = trpc.members.uploadImage.useMutation();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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
            // Fill with white background to prevent blackness on transparency
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, width, height);

            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85); // Slightly higher quality
            setProfileImage(dataUrl);
            toast.success("تم اختيار الصورة بنجاح");
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setProfileImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.username || !formData.password || !formData.confirmPassword || !formData.phone || !formData.fullName) {
      setError("الرجاء ملء جميع الحقول المطلوبة");
      return;
    }

    if (formData.phone.length !== 11) {
      setError("رقم الهاتف يجب أن يكون 11 رقم بالضبط");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("كلمات المرور غير متطابقة");
      return;
    }

    if (formData.password.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    setIsLoading(true);
    try {
      let finalImageUrl = profileImage;

      // If we have a base64 image, upload it to storage first to handle large sizes
      if (profileImage && profileImage.startsWith('data:')) {
        try {
          const uploadResult = await uploadMutation.mutateAsync({
            base64: profileImage,
            fileName: `profile-${formData.username}-${Date.now()}.jpg`
          });
          finalImageUrl = uploadResult.url;
        } catch (uploadError) {
          console.error("Failed to upload image to storage:", uploadError);
          // Fallback to base64 if upload fails, though it might hit Firestore size limits
        }
      }

      const result = await registerMutation.mutateAsync({
        username: formData.username,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        phone: formData.phone,
        fullName: formData.fullName,
        dateOfBirth: formData.dateOfBirth,
        address: formData.address,
        fatherOfConfession: formData.fatherOfConfession,
        imageUrl: finalImageUrl || undefined,
      });

      toast.success("تم إنشاء الحساب بنجاح");
      // حفظ البيانات الكاملة في الجلسة
      sessionStorage.setItem("memberSession", JSON.stringify({
        ...result,
        fullName: formData.fullName,
        dateOfBirth: formData.dateOfBirth,
        address: formData.address,
        fatherOfConfession: formData.fatherOfConfession,
      }));
      // تأخير قليل للتأكد من حفظ البيانات
      setTimeout(() => {
        setLocation("/member-dashboard");
      }, 1000);
    } catch (error: any) {
      setError(error.message || "فشل إنشاء الحساب");
      toast.error(error.message || "فشل إنشاء الحساب");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!loginData.username || !loginData.password) {
      setError("الرجاء ملء جميع الحقول");
      return;
    }

    setIsLoading(true);
    try {
      const result = await loginMutation.mutateAsync({
        username: loginData.username,
        password: loginData.password,
      });
      sessionStorage.setItem("memberSession", JSON.stringify(result));
      toast.success("تم تسجيل الدخول بنجاح");
      setLocation("/member-dashboard");
    } catch (error: any) {
      setError(error.message || "فشل تسجيل الدخول");
      toast.error(error.message || "فشل تسجيل الدخول");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8 shadow-lg">
        {/* رأس البطاقة */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-2">
            أقباط الشباب - نظام الحضور
          </h1>
          <p className="text-gray-600">Maa Hayee Meeting</p>
        </div>

        {/* التبويبات */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => {
              setActiveTab("register");
              setError("");
            }}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${activeTab === "register"
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
          >
            إنشاء حساب جديد
          </button>
          <button
            onClick={() => {
              setActiveTab("login");
              setError("");
            }}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${activeTab === "login"
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
          >
            تسجيل دخول
          </button>
        </div>

        {/* رسالة الخطأ */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* نموذج التسجيل */}
        {activeTab === "register" && (
          <form onSubmit={handleRegister} className="space-y-4">
            {/* صورة شخصية احترافية */}
            <div className="flex flex-col items-center mb-6">
              <label className="text-sm font-bold text-slate-700 mb-3">الصورة الشخصية (اختياري)</label>
              <div className="relative group">
                <div
                  className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-xl bg-slate-100 flex items-center justify-center cursor-pointer transition-transform hover:scale-105"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {profileImage ? (
                    <img
                      src={profileImage}
                      alt="Profile Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-slate-400 flex flex-col items-center">
                      <Camera className="w-10 h-10 mb-1" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Upload</span>
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  size="icon"
                  className="absolute bottom-1 left-1 rounded-full h-9 w-9 shadow-lg bg-blue-600 hover:bg-blue-700 border-2 border-white"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                </Button>
                {profileImage && (
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="absolute -top-1 -right-1 rounded-full h-7 w-7 shadow-md border-2 border-white"
                    onClick={handleRemoveImage}
                  >
                    <X className="h-3.5 w-3.5" />
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
              <p className="text-[10px] text-slate-500 mt-2">اضغط على الدائرة لاختيار صورة</p>
            </div>

            {/* الاسم الكامل */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الاسم الكامل *
              </label>
              <div className="relative">
                <User className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="أدخل الاسم الكامل"
                  className="pr-10"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* رقم الهاتف */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                رقم الهاتف *
              </label>
              <div className="relative">
                <Phone className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                    setFormData({ ...formData, phone: val });
                  }}
                  placeholder="أدخل رقم الهاتف (11 رقم)"
                  className="pr-10"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* تاريخ الميلاد */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                تاريخ الميلاد
              </label>
              <div className="relative">
                <Calendar className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="pr-10"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* العنوان */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                العنوان
              </label>
              <div className="relative">
                <MapPin className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="أدخل العنوان"
                  className="pr-10"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* اب الاعتراف */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اب الاعتراف
              </label>
              <div className="relative">
                <Users className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  value={formData.fatherOfConfession}
                  onChange={(e) => setFormData({ ...formData, fatherOfConfession: e.target.value })}
                  placeholder="أدخل اسم اب الاعتراف"
                  className="pr-10"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* اسم المستخدم */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اسم المستخدم *
              </label>
              <div className="relative">
                <User className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="أدخل اسم المستخدم"
                  className="pr-10"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* كلمة المرور */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                كلمة المرور *
              </label>
              <div className="relative">
                <Lock className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="أدخل كلمة المرور (6 أحرف على الأقل)"
                  className="pr-10"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* تأكيد كلمة المرور */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                تأكيد كلمة المرور *
              </label>
              <div className="relative">
                <Lock className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="أعد إدخال كلمة المرور"
                  className="pr-10"
                  disabled={isLoading}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              disabled={isLoading}
            >
              {isLoading ? "جاري إنشاء الحساب..." : "إنشاء حساب"}
            </Button>
          </form>
        )}

        {/* نموذج تسجيل الدخول */}
        {activeTab === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اسم المستخدم
              </label>
              <div className="relative">
                <User className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  value={loginData.username}
                  onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                  placeholder="أدخل اسم المستخدم"
                  className="pr-10"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                كلمة المرور
              </label>
              <div className="relative">
                <Lock className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  placeholder="أدخل كلمة المرور"
                  className="pr-10"
                  disabled={isLoading}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              disabled={isLoading}
            >
              {isLoading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
            </Button>
          </form>
        )}

        {/* الزر العودة للرئيسية */}
        <div className="mt-6 border-t pt-4">
          <button
            onClick={() => setLocation("/")}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>العودة للصفحة الرئيسية</span>
          </button>
        </div>
      </Card>
    </div>
  );
}
