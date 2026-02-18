import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Lock, User, AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { setAuthToken } from "@/lib/authToken";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const loginMutation = trpc.admin.login.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      toast.error("الرجاء ملء جميع الحقول");
      return;
    }

    setIsLoading(true);
    try {
      const result = await loginMutation.mutateAsync({
        username,
        password,
      });

      // حفظ token للـ Authorization header (يعمل على Railway عند فشل cookies)
      if (result.sessionToken) {
        setAuthToken(result.sessionToken);
      }
      sessionStorage.setItem("adminSession", JSON.stringify({
        adminId: result.admin.id,
        username: result.admin.username,
      }));

      toast.success("تم تسجيل الدخول بنجاح");

      // انتظر قليلاً قبل الانتقال
      setTimeout(() => {
        setLocation("/dashboard");
      }, 500);
    } catch (error: any) {
      console.error("خطأ تسجيل الدخول:", error);
      toast.error(error.message || "فشل تسجيل الدخول");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-2 drop-shadow-sm">
            Maa Hayee
          </h1>
          <p className="text-gray-700 font-bold text-lg opacity-80">لوحة التحكم المركزية</p>
        </div>

        <Card className="p-10 shadow-2xl bg-white/60 backdrop-blur-xl border-white/20 rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>

          <div className="flex justify-center mb-8">
            <div className="bg-gradient-to-br from-blue-100/50 to-indigo-100/50 p-5 rounded-3xl shadow-inner group transition-all duration-500 hover:scale-110">
              <Lock className="w-10 h-10 text-blue-600 group-hover:rotate-12 transition-transform" />
            </div>
          </div>

          <h2 className="text-3xl font-black text-center mb-2 text-gray-900">تسجيل الدخول</h2>
          <p className="text-center text-gray-500 font-medium text-sm mb-8">
            يرجى إدخال بيانات المسؤول للوصول للنظام
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700 mr-2">اسم المستخدم</label>
              <div className="relative group">
                <User className="absolute right-4 top-4 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <Input
                  placeholder="أدخل اسم المستخدم"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-4 pr-12 h-14 bg-white/40 border-0 shadow-inner rounded-xl focus-visible:ring-2 focus-visible:ring-blue-500"
                  dir="rtl"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700 mr-2">كلمة المرور</label>
              <div className="relative group">
                <Lock className="absolute right-4 top-4 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <Input
                  type="password"
                  placeholder="أدخل كلمة المرور"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-4 pr-12 h-14 bg-white/40 border-0 shadow-inner rounded-xl focus-visible:ring-2 focus-visible:ring-blue-500"
                  dir="rtl"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="bg-blue-600/10 backdrop-blur-sm border border-blue-200/50 rounded-2xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-900 font-medium">
                تأكد من كتابة البيانات بشكل صحيح لتجنب قفل الحساب
              </p>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black h-14 text-xl rounded-2xl shadow-xl shadow-blue-200 transition-all active:scale-95"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                  جاري التحقق...
                </div>
              ) : "دخول مباشر"}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100">
            <button
              onClick={() => setLocation("/")}
              className="w-full flex items-center justify-center gap-3 h-12 rounded-xl text-gray-600 font-bold hover:bg-gray-50 transition-all active:scale-95"
            >
              <Home className="w-5 h-5" />
              <span>العودة للرئيسية</span>
            </button>
          </div>
        </Card>

        <div className="mt-10 text-center text-sm text-gray-900 font-bold opacity-60">
          <p>Maa Hayee Meeting Management System</p>
          <p>© 2025 All Rights Reserved</p>
        </div>
      </div>
    </div>

  );
}
