import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Lock, User, Phone, AlertCircle, Home, Upload, X, Calendar, MapPin, Users, Camera } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { setAuthToken } from "@/lib/authToken";
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

interface RegistrationFormData {
  username: string;
  password: string;
  confirmPassword: string;
  phone: string;
  fullName: string;
  dateOfBirth: string;
  address: string;
  fatherOfConfession: string;
  academicStatus: "student" | "graduate" | "";
  academicYear: string;
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
    academicStatus: "",
    academicYear: "",
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

  const [rememberMe, setRememberMe] = useState(false);

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
      const result = await registerMutation.mutateAsync({
        username: formData.username,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        phone: formData.phone,
        fullName: formData.fullName,
        dateOfBirth: formData.dateOfBirth,
        address: formData.address,
        fatherOfConfession: formData.fatherOfConfession,
        academicStatus: formData.academicStatus === "" ? null : formData.academicStatus,
        academicYear: formData.academicYear || null,
        imageUrl: undefined,
      });

      toast.success("تم إنشاء الحساب بنجاح");
      if (result.sessionToken) {
        setAuthToken(result.sessionToken);
      }

      const sessionData = {
        ...result,
        fullName: formData.fullName,
        dateOfBirth: formData.dateOfBirth,
        address: formData.address,
        fatherOfConfession: formData.fatherOfConfession,
        lastLogin: Date.now()
      };

      // Always remember registrations for easier first flow
      localStorage.setItem("memberSession", JSON.stringify(sessionData));

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
      if (result.sessionToken) {
        setAuthToken(result.sessionToken);
      }

      const sessionData = { ...result, lastLogin: Date.now() };

      if (rememberMe) {
        localStorage.setItem("memberSession", JSON.stringify(sessionData));
      } else {
        sessionStorage.setItem("memberSession", JSON.stringify(sessionData));
      }

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
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8 shadow-2xl bg-white/60 backdrop-blur-xl border-white/20 rounded-3xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>

        {/* رأس البطاقة */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-2 drop-shadow-sm">
            نظام عضوية ماء حي
          </h1>
          <p className="text-gray-700 font-bold opacity-70">Maa Hayee Meeting Members</p>
        </div>

        {/* التبويبات */}
        <div className="flex gap-4 mb-8 bg-white/40 p-2 rounded-2xl shadow-inner">
          <button
            onClick={() => {
              setActiveTab("register");
              setError("");
            }}
            className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all duration-300 ${activeTab === "register"
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-200"
              : "text-gray-700 hover:bg-white/50"
              }`}
          >
            إنشاء حساب جديد
          </button>
          <button
            onClick={() => {
              setActiveTab("login");
              setError("");
            }}
            className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all duration-300 ${activeTab === "login"
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-200"
              : "text-gray-700 hover:bg-white/50"
              }`}
          >
            تسجيل دخول
          </button>
        </div>

        {/* رسالة الخطأ */}
        {error && (
          <div className="mb-6 p-4 bg-red-600/10 backdrop-blur-sm border border-red-200 rounded-2xl flex gap-3 text-red-700 animate-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="text-sm font-bold">{error}</span>
          </div>
        )}

        {/* نموذج التسجيل */}
        {activeTab === "register" && (
          <form onSubmit={handleRegister} className="space-y-6 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* الاسم الكامل */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700 mr-2"> الاسم الكامل *</label>
                <div className="relative group">
                  <User className="absolute right-4 top-3.5 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  <Input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="أدخل الاسم الرباعي"
                    className="pr-12 h-12 bg-white/40 border-0 shadow-inner rounded-xl focus-visible:ring-2 focus-visible:ring-blue-500"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* رقم الهاتف */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700 mr-2">رقم الهاتف *</label>
                <div className="relative group">
                  <Phone className="absolute right-4 top-3.5 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                      setFormData({ ...formData, phone: val });
                    }}
                    placeholder="01xxxxxxxxx"
                    className="pr-12 h-12 bg-white/40 border-0 shadow-inner rounded-xl focus-visible:ring-2 focus-visible:ring-blue-500"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* تاريخ الميلاد */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700 mr-2">تاريخ الميلاد</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full justify-start text-right font-bold pr-12 relative h-12 bg-white/40 border-0 shadow-inner rounded-xl hover:bg-white/60 ${!formData.dateOfBirth && "text-muted-foreground"}`}
                      disabled={isLoading}
                    >
                      <Calendar className="absolute right-4 top-3.5 w-5 h-5 text-gray-400" />
                      {formData.dateOfBirth ? (
                        format(new Date(formData.dateOfBirth), "PPP", { locale: ar })
                      ) : (
                        <span>اختر التاريخ</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-3xl overflow-hidden border-0 shadow-2xl" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={formData.dateOfBirth ? new Date(formData.dateOfBirth) : undefined}
                      onSelect={(date) => setFormData({ ...formData, dateOfBirth: date ? date.toISOString().split('T')[0] : "" })}
                      initialFocus
                      captionLayout="dropdown"
                      fromYear={1950}
                      toYear={new Date().getFullYear()}
                      locale={ar}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* العنوان */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700 mr-2">العنوان</label>
                <div className="relative group">
                  <MapPin className="absolute right-4 top-3.5 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  <Input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="السكن الحالي"
                    className="pr-12 h-12 bg-white/40 border-0 shadow-inner rounded-xl focus-visible:ring-2 focus-visible:ring-blue-500"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* الحالة الدراسية */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700 mr-2">الحالة الدراسية *</label>
                <Select
                  value={formData.academicStatus}
                  onValueChange={(val: any) => setFormData({ ...formData, academicStatus: val, academicYear: val === "graduate" ? "" : formData.academicYear })}
                  disabled={isLoading}
                >
                  <SelectTrigger className="w-full h-12 bg-white/40 border-0 shadow-inner rounded-xl focus:ring-2 focus:ring-blue-500 font-bold">
                    <SelectValue placeholder="اختر الحالة" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-0 shadow-xl bg-white/90 backdrop-blur-lg">
                    <SelectItem value="student" className="rounded-xl">طالب</SelectItem>
                    <SelectItem value="graduate" className="rounded-xl">خريج</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* السنة الدراسية */}
              {formData.academicStatus === "student" && (
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700 mr-2">السنة الدراسية</label>
                  <Select
                    value={formData.academicYear}
                    onValueChange={(val) => setFormData({ ...formData, academicYear: val })}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="w-full h-12 bg-white/40 border-0 shadow-inner rounded-xl focus:ring-2 focus:ring-blue-500 font-bold">
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

              {/* أب الاعتراف */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700 mr-2">أب الاعتراف</label>
                <div className="relative group">
                  <Users className="absolute right-4 top-3.5 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  <Input
                    type="text"
                    value={formData.fatherOfConfession}
                    onChange={(e) => setFormData({ ...formData, fatherOfConfession: e.target.value })}
                    placeholder="اسم القدس"
                    className="pr-12 h-12 bg-white/40 border-0 shadow-inner rounded-xl focus-visible:ring-2 focus-visible:ring-blue-500"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100/50 pt-6 mt-4 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* اسم المستخدم */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-900 mr-2">اسم المستخدم للدخول *</label>
                  <div className="relative group">
                    <User className="absolute right-4 top-3.5 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    <Input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="Username"
                      className="pr-12 h-12 bg-white/30 border-2 border-blue-500/20 shadow-sm rounded-xl focus-visible:ring-2 focus-visible:ring-blue-500 font-bold"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* كلمة المرور */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-900 mr-2">كلمة المرور *</label>
                  <div className="relative group">
                    <Lock className="absolute right-4 top-3.5 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    <Input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="********"
                      className="pr-12 h-12 bg-white/30 border-2 border-blue-500/20 shadow-sm rounded-xl focus-visible:ring-2 focus-visible:ring-blue-500 font-bold"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>

              {/* تأكيد كلمة المرور */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-900 mr-2">تأكيد كلمة المرور *</label>
                <div className="relative group">
                  <Lock className="absolute right-4 top-3.5 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  <Input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="أعد إدخال كلمة المرور"
                    className="pr-12 h-12 bg-white/30 border-2 border-blue-500/20 shadow-sm rounded-xl focus-visible:ring-2 focus-visible:ring-blue-500 font-bold"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black h-14 text-xl rounded-2xl shadow-xl shadow-blue-200 transition-all active:scale-95 mt-4"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                  جاري الحفظ...
                </div>
              ) : "إنشاء الحساب الآن"}
            </Button>
          </form>
        )}

        {/* نموذج تسجيل الدخول */}
        {activeTab === "login" && (
          <form onSubmit={handleLogin} className="space-y-6 py-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700 mr-2">اسم المستخدم</label>
              <div className="relative group">
                <User className="absolute right-4 top-3.5 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <Input
                  type="text"
                  value={loginData.username}
                  onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                  placeholder="Username"
                  className="pr-12 h-14 bg-white/40 border-0 shadow-inner rounded-xl focus-visible:ring-2 focus-visible:ring-blue-500 font-bold"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700 mr-2">كلمة المرور</label>
              <div className="relative group">
                <Lock className="absolute right-4 top-3.5 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <Input
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  placeholder="********"
                  className="pr-12 h-14 bg-white/40 border-0 shadow-inner rounded-xl focus-visible:ring-2 focus-visible:ring-blue-500 font-bold"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* تذكرني */}
            <div className="flex items-center gap-2 mb-4 px-2">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 focus:ring-blue-500 text-blue-600 transition-all cursor-pointer"
              />
              <label htmlFor="rememberMe" className="text-sm font-bold text-gray-600 cursor-pointer select-none">
                تذكرني على هذا الجهاز لمدة شهر
              </label>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black h-16 text-xl rounded-2xl shadow-xl shadow-blue-200 transition-all active:scale-95"
              disabled={isLoading}
            >
              {isLoading ? "جاري الدخول..." : "تسجيل الدخول"}
            </Button>
          </form>
        )}

        {/* الزر العودة للرئيسية */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <button
            onClick={() => setLocation("/")}
            className="w-full flex items-center justify-center gap-3 h-12 rounded-xl text-gray-500 font-bold hover:bg-white/50 transition-all active:scale-95"
          >
            <Home className="w-5 h-5" />
            <span>العودة للصفحة الرئيسية</span>
          </button>
        </div>
      </Card>
    </div>

  );
}
