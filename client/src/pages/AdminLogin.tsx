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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-2">
            Maa Hayee Meeting
          </h1>
          <p className="text-gray-600">لوحة التحكم</p>
        </div>

        <Card className="p-8 shadow-xl">
          <div className="flex justify-center mb-6">
            <div className="bg-gradient-to-br from-blue-100 to-indigo-100 p-4 rounded-full">
              <Lock className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-center mb-2">تسجيل الدخول</h2>
          <p className="text-center text-gray-600 text-sm mb-6">
            أدخل بيانات اعتمادك للوصول إلى لوحة التحكم
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">اسم المستخدم</label>
              <div className="relative">
                <User className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="أدخل اسم المستخدم"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-4 pr-10"
                  dir="rtl"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  type="password"
                  placeholder="أدخل كلمة المرور"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-4 pr-10"
                  dir="rtl"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                استخدم بيانات اعتمادك الخاصة للوصول إلى لوحة التحكم
              </p>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-2"
              disabled={isLoading}
            >
              {isLoading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
            </Button>
          </form>

          <div className="mt-6 space-y-4">
            {/*
            <div className="text-center">
              <p className="text-sm text-gray-600">
                هل تريد إنشاء حساب جديد؟{" "}
                <button
                  onClick={() => setLocation("/admin-register")}
                  className="text-blue-600 hover:text-blue-700 font-semibold"
                >
                  سجل هنا
                </button>
              </p>
            </div> */}

            <div className="border-t pt-4">
              <button
                onClick={() => setLocation("/")}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Home className="w-4 h-4" />
                <span>العودة للصفحة الرئيسية</span>
              </button>
            </div>
          </div>
        </Card>

        <div className="mt-8 text-center text-sm text-gray-600">
          <p>نظام إدارة الحضور والغياب</p>
          <p>© 2025 أقباط الشباب</p>
        </div>
      </div>
    </div>
  );
}
