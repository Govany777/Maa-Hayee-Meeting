import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Building2, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function Housing() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50 to-orange-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Card className="p-8 shadow-lg">
          <div className="text-center space-y-6">
            <div className="bg-gradient-to-br from-amber-100 to-orange-50 p-6 rounded-full inline-block">
              <Building2 className="w-16 h-16 text-amber-600" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">قسم الإسكان</h1>
            <p className="text-gray-600">مرحباً بك في قسم الإسكان - Maa Hayee Meeting</p>
            <div className="pt-4">
              <Button
                variant="outline"
                onClick={() => setLocation("/")}
                className="gap-2"
              >
                <Home className="w-5 h-5" />
                العودة للرئيسية
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
