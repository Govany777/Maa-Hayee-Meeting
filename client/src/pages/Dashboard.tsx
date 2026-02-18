// Last Sync: 2026-02-09 - Force sync dashboard updates
import { useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  User,
  Users,
  Search,
  Plus,
  Calendar,
  Settings,
  LogOut,
  Phone,
  BarChart,
  UserCheck,
  MapPin,
  Camera,
  UserPlus,
  QrCode,
  Upload,
  Edit2,
  Trash2,
  X,
  Lock,
} from "lucide-react";
import { motion, useInView } from "framer-motion";
import QRCodeGenerator from "@/components/QRCodeGenerator";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { clearAuthToken } from "@/lib/authToken";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const MONTHS_AR = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

// Helper Component for Member Card
function MemberCard({ member, onEdit, onDelete, onViewQr }: any) {
  return (
    <Card className="p-0 overflow-hidden group hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] transition-all duration-500 border border-white/20 bg-white/40 backdrop-blur-md rounded-[2.5rem] relative">
      <div className="relative aspect-square bg-slate-100/30 overflow-hidden border-b border-white/10">
        {member.imageUrl ? (
          <img
            src={member.imageUrl}
            alt={member.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random&size=256`;
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-blue-200 bg-white/10">
            <User className="w-20 h-20 opacity-30 animate-pulse" />
            <span className="text-[10px] font-black uppercase mt-3 tracking-[0.3em] text-blue-400 opacity-50">Profile Ready</span>
          </div>
        )}

        {/* QR Code Mini Preview */}
        <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-sm p-1.5 rounded-2xl shadow-xl z-10 scale-90 origin-top-left border border-white transition-transform group-hover:scale-100">
          <QRCodeGenerator value={member.memberId || member.memberIdSequential?.toString() || member.id} size={42} includeMargin={false} />
        </div>

        {/* Hover Actions Overlay */}
        <div className="absolute inset-0 bg-blue-600/10 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-4 z-20">
          <Button
            size="icon"
            className="h-14 w-14 rounded-2xl shadow-2xl bg-white text-blue-600 hover:bg-blue-600 hover:text-white transform translate-y-4 group-hover:translate-y-0 transition-all duration-300"
            onClick={() => onViewQr(member)}
          >
            <QrCode className="h-7 w-7" />
          </Button>
          <Button
            size="icon"
            className="h-14 w-14 rounded-2xl shadow-2xl bg-white text-amber-500 hover:bg-amber-500 hover:text-white transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 delay-75"
            onClick={() => onEdit(member)}
          >
            <Edit2 className="h-7 w-7" />
          </Button>
          <Button
            size="icon"
            className="h-14 w-14 rounded-2xl shadow-2xl bg-white text-red-500 hover:bg-red-500 hover:text-white transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 delay-150"
            onClick={() => onDelete(member.id, member.name)}
          >
            <Trash2 className="h-7 w-7" />
          </Button>
        </div>
      </div>

      <div className="p-6 relative">
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-12 -mt-12 blur-2xl"></div>

        <div className="flex flex-col mb-4">
          <div className="flex items-center justify-between gap-2 overflow-hidden">
            <h4 className="font-black text-xl text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors">{member.name}</h4>
          </div>
          <div className="flex gap-2 items-center mt-2">
            <span className="text-[10px] font-black text-blue-600 bg-blue-100/50 border border-blue-200/50 px-3 py-1 rounded-full w-fit shadow-sm">
              ID: {member.memberId || member.memberIdSequential}
            </span>
            {member.hasAccount && (
              <span className="bg-green-100/50 text-green-700 text-[10px] font-black px-3 py-1 rounded-full flex items-center gap-1 border border-green-200/50">
                <UserCheck className="w-3 h-3" />
                ACTIVE
              </span>
            )}
          </div>
        </div>

        <div className="space-y-3 text-sm font-bold text-slate-500">
          {member.phone && (
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-gray-50/50 text-slate-400">
                <Phone className="w-3.5 h-3.5" />
              </div>
              <span className="group-hover:text-slate-700 transition-colors">{member.phone}</span>
            </div>
          )}
          {member.academicStatus && (
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full shadow-sm ${member.academicStatus === 'student' ? 'bg-amber-400' : 'bg-indigo-400'}`} />
              <span className="text-slate-600">
                {member.academicStatus === 'student' ? `طالب ${member.academicYear ? `- ${member.academicYear}` : ''}` : 'خريج'}
              </span>
            </div>
          )}
          {member.fatherOfConfession && (
            <div className="flex items-center gap-3 pt-2 border-t border-slate-100/50">
              <Users className="w-4 h-4 text-slate-300" />
              <span className="text-xs text-slate-400 italic">أب الاعتراف: <span className="text-slate-600 font-black">{member.fatherOfConfession}</span></span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// Animated Wrapper for Member Cards
function AnimatedMemberItem({ children, index }: { children: React.ReactNode, index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.2, once: true });

  return (
    <motion.div
      ref={ref}
      initial={{ scale: 0.8, opacity: 0, y: 20 }}
      animate={inView ? { scale: 1, opacity: 1, y: 0 } : { scale: 0.8, opacity: 0, y: 20 }}
      transition={{
        duration: 0.4,
        delay: (index % 4) * 0.1, // Stagger effect based on column
        ease: [0.21, 0.47, 0.32, 0.98]
      }}
      className="h-full"
    >
      {children}
    </motion.div>
  );
}


export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("members");

  // Member Form State
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [viewingQr, setViewingQr] = useState<any>(null); // Dedicated QR view
  const [memberForm, setMemberForm] = useState({
    name: "",
    phone: "",
    memberId: "",
    dateOfBirth: "",
    address: "",
    fatherOfConfession: "",
    academicStatus: "" as "" | "student" | "graduate",
    academicYear: "",
  });
  const [memberImage, setMemberImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);


  const handleTabChange = (val: string) => {
    setActiveTab(val);
  };

  const utils = trpc.useUtils();
  const membersQuery = trpc.admin.getAllMembers.useQuery(undefined, {
    refetchInterval: 2000,
    retry: 3,
    staleTime: 0,
  });
  const attendanceQuery = trpc.attendance.getAllAttendance.useQuery(undefined, {
    refetchInterval: 2000,
    retry: 3,
    staleTime: 0,
  });
  const createMemberMutation = trpc.admin.createMember.useMutation();
  const updateMemberMutation = trpc.admin.updateMember.useMutation();
  const deleteMemberMutation = trpc.admin.deleteMember.useMutation();
  const uploadMutation = trpc.members.uploadImage.useMutation();

  // Redirect if no session found locally (optional extra guard)
  useMemo(() => {
    if (typeof window !== "undefined") {
      const session = sessionStorage.getItem("adminSession");
      if (!session) {
        // No local session, but tRPC will handle the final auth check via cookie
        console.log("No adminSession found in sessionStorage");
      }
    }
  }, []);

  const allMembers = membersQuery.data || [];
  const allAttendance = attendanceQuery.data || [];

  const filteredMembers = useMemo(() => {
    if (!searchQuery) return allMembers;
    const q = searchQuery.toLowerCase().trim();

    return allMembers.filter((m: any) => {
      // 1. Basic Info (Name, Phone, Username, ID)
      const matchesBasic =
        m.name?.toLowerCase().includes(q) ||
        (m.phone && m.phone.includes(q)) ||
        (m.username && m.username.toLowerCase().includes(q)) ||
        (m.memberId && m.memberId.toString().includes(q)) ||
        (m.memberIdSequential && m.memberIdSequential.toString().includes(q));

      // 2. Father of Confession
      const matchesFather = m.fatherOfConfession?.toLowerCase().includes(q);

      // 3. Search by birth month
      // logic: if user types "1" or "01" or "شهر 1" or "يناير"
      let matchesMonth = false;
      if (m.dateOfBirth) {
        const dob = new Date(m.dateOfBirth);
        const monthNum = dob.getMonth() + 1;
        const monthName = MONTHS_AR[dob.getMonth()];

        const qClean = q.replace("شهر", "").trim();
        matchesMonth =
          monthNum.toString() === qClean ||
          `0${monthNum}` === qClean ||
          monthName.includes(q) ||
          `شهر ${monthNum}`.includes(q);
      }

      // 4. Academic status and year
      let matchesAcademic = false;
      const statusAr = m.academicStatus === 'student' ? 'طالب' : m.academicStatus === 'graduate' ? 'خريج' : '';
      const yearAr = m.academicYear || '';

      // Normalize query and data for better matching
      const qNormalized = q.replace(/سنه|سنة/g, "").replace(/\s+/g, " ").trim();

      if (statusAr.includes(qNormalized) || (yearAr && yearAr.includes(qNormalized))) {
        matchesAcademic = true;
      } else {
        // Check for combinations like "طالب أولى" or "خريج 2023" (if applicable)
        const combined = `${statusAr} ${yearAr}`.replace(/سنه|سنة/g, "").replace(/\s+/g, " ").trim();
        if (combined.includes(qNormalized)) {
          matchesAcademic = true;
        }
      }

      return matchesBasic || matchesFather || matchesMonth || matchesAcademic;
    });
  }, [allMembers, searchQuery]);

  const handleLogout = () => {
    clearAuthToken();
    sessionStorage.removeItem("adminSession");
    toast.success("تم تسجيل الخروج");
    setLocation("/admin-login");
  };

  const openAddMember = () => {
    setEditingMember(null);
    setMemberForm({
      name: "",
      phone: "",
      memberId: "",
      dateOfBirth: "",
      address: "",
      fatherOfConfession: "",
      academicStatus: "",
      academicYear: "",
    });
    setMemberImage(null);
    setIsMemberDialogOpen(true);
  };

  const openEditMember = (member: any) => {
    setEditingMember(member);
    setMemberForm({
      name: member.name || "",
      phone: member.phone || "",
      memberId: member.memberId || "",
      dateOfBirth: member.dateOfBirth ? new Date(member.dateOfBirth).toISOString().split('T')[0] : "",
      address: member.address || "",
      fatherOfConfession: member.fatherOfConfession || "",
      academicStatus: member.academicStatus || "",
      academicYear: member.academicYear || "",
    });
    setMemberImage(member.imageUrl || null);
    setIsMemberDialogOpen(true);
  };

  const handleDeleteMember = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف العضو ${name}؟`)) return;
    try {
      await deleteMemberMutation.mutateAsync({ id });
      toast.success("تم حذف العضو بنجاح");
      utils.admin.getAllMembers.invalidate();
    } catch (error) {
      toast.error("فشل حذف العضو");
    }
  };

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
            if (width > max_size) { height *= max_size / width; width = max_size; }
          } else {
            if (height > max_size) { width *= max_size / height; height = max_size; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            setMemberImage(canvas.toDataURL('image/jpeg', 0.85));
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitMember = async (e: React.FormEvent) => {
    e.preventDefault();

    if (memberForm.phone && memberForm.phone.length !== 11) {
      toast.error("رقم الهاتف يجب أن يكون 11 رقم بالضبط");
      return;
    }

    setIsSubmitting(true);
    try {
      let finalImageUrl = memberImage;
      if (memberImage && memberImage.startsWith('data:')) {
        const uploadResult = await uploadMutation.mutateAsync({
          base64: memberImage,
          fileName: `admin-upload-${Date.now()}.jpg`
        });
        finalImageUrl = uploadResult.url;
      }

      const payload = {
        name: memberForm.name,
        phone: memberForm.phone || undefined,
        memberId: memberForm.memberId,
        dateOfBirth: memberForm.dateOfBirth ? new Date(memberForm.dateOfBirth) : undefined,
        address: memberForm.address || undefined,
        fatherOfConfession: memberForm.fatherOfConfession || undefined,
        academicStatus: memberForm.academicStatus === "" ? null : memberForm.academicStatus,
        academicYear: memberForm.academicYear || null,
        imageUrl: finalImageUrl || undefined,
      };

      if (editingMember) {
        await updateMemberMutation.mutateAsync({
          id: editingMember.id,
          ...payload
        });
        toast.success("تم تحديث بيانات العضو");
      } else {
        await createMemberMutation.mutateAsync(payload);
        toast.success("تم إضافة العضو بنجاح");
      }

      setIsMemberDialogOpen(false);
      utils.admin.getAllMembers.invalidate();
    } catch (error: any) {
      toast.error("حدث خطأ: " + (error.message || ""));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex" dir="rtl">
      {/* Sidebar */}
      <div className="w-72 bg-white/60 backdrop-blur-xl border-l border-white/20 hidden lg:flex flex-col shadow-2xl relative z-40">
        <div className="p-8 border-b border-white/20">
          <h2 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 drop-shadow-sm">
            لوحة الأدمن
          </h2>
          <p className="text-[10px] font-black text-gray-400 mt-1 uppercase tracking-widest">Control Center v2.0</p>
        </div>
        <div className="flex-1 p-6 space-y-4">
          <Button
            variant="ghost"
            className={`w-full justify-start gap-4 h-14 rounded-2xl font-bold transition-all duration-300 ${activeTab === 'search' ? 'text-blue-600 bg-white/80 shadow-lg shadow-blue-100/50 translate-x-1' : 'text-gray-600 hover:bg-white/40'}`}
            onClick={() => handleTabChange("search")}
          >
            <div className={`p-2 rounded-xl transition-colors ${activeTab === 'search' ? 'bg-blue-100' : 'bg-gray-100'}`}>
              <Search className="w-5 h-5" />
            </div>
            البحث عن عضو
          </Button>
          <Button
            variant="ghost"
            className={`w-full justify-start gap-4 h-14 rounded-2xl font-bold transition-all duration-300 ${activeTab === 'members' ? 'text-blue-600 bg-white/80 shadow-lg shadow-blue-100/50 translate-x-1' : 'text-gray-600 hover:bg-white/40'}`}
            onClick={() => handleTabChange("members")}
          >
            <div className={`p-2 rounded-xl transition-colors ${activeTab === 'members' ? 'bg-blue-100' : 'bg-gray-100'}`}>
              <Users className="w-5 h-5" />
            </div>
            الأعضاء المسجلين
          </Button>
          <Button
            variant="ghost"
            className={`w-full justify-start gap-4 h-14 rounded-2xl font-bold transition-all duration-300 ${activeTab === 'attendance' ? 'text-blue-600 bg-white/80 shadow-lg shadow-blue-100/50 translate-x-1' : 'text-gray-600 hover:bg-white/40'}`}
            onClick={() => handleTabChange("attendance")}
          >
            <div className={`p-2 rounded-xl transition-colors ${activeTab === 'attendance' ? 'bg-blue-100' : 'bg-gray-100'}`}>
              <Calendar className="w-5 h-5" />
            </div>
            سجل الحضور
          </Button>
        </div>
        <div className="p-6 border-t border-white/20">
          <Button
            variant="ghost"
            className="w-full justify-start gap-4 h-14 rounded-2xl text-red-600 font-bold hover:bg-red-50/50 transition-all active:scale-95"
            onClick={handleLogout}
          >
            <div className="p-2 rounded-xl bg-red-100">
              <LogOut className="w-5 h-5" />
            </div>
            تسجيل الخروج
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white/50 backdrop-blur-md border-b border-white/20 h-20 flex items-center justify-between px-10 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200">
              <BarChart className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-black text-gray-800">نظام التحكم - Maa Hayee</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" className="h-10 px-6 rounded-xl font-bold bg-white/80 border-white/20 shadow-sm hover:bg-white transition-all" onClick={() => setLocation("/")}>الرئيسية</Button>
            <div className="h-10 w-10 rounded-full bg-blue-100 border-2 border-white shadow-sm flex items-center justify-center text-blue-600 font-black">A</div>
          </div>
        </header>

        <main className="p-10 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="mb-10 bg-white/30 backdrop-blur-sm p-1.5 rounded-2xl shadow-inner border border-white/20 h-14 w-fit">
              <TabsTrigger value="search" className="rounded-xl px-8 font-bold data-[state=active]:bg-white data-[state=active]:shadow-lg h-full">البحث</TabsTrigger>
              <TabsTrigger value="members" className="rounded-xl px-8 font-bold data-[state=active]:bg-white data-[state=active]:shadow-lg h-full">الأعضاء</TabsTrigger>
              <TabsTrigger value="attendance" className="rounded-xl px-8 font-bold data-[state=active]:bg-white data-[state=active]:shadow-lg h-full">الحضور</TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="space-y-8 animate-in fade-in duration-500">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="relative flex-1 group">
                  <Search className="absolute right-5 top-5 w-6 h-6 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  <Input
                    placeholder="ابحث عن أي شخص بأي معلومة..."
                    className="pr-14 h-16 bg-white/60 backdrop-blur-md border-white/20 shadow-xl rounded-2xl text-lg font-bold focus:ring-2 focus:ring-blue-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {filteredMembers.length > 0 ? (
                  filteredMembers.map((member: any, index: number) => (
                    <AnimatedMemberItem key={member.id} index={index}>
                      <MemberCard
                        member={member}
                        onEdit={openEditMember}
                        onDelete={handleDeleteMember}
                        onViewQr={setViewingQr}
                      />
                    </AnimatedMemberItem>
                  ))
                ) : (
                  <div className="col-span-full py-24 text-center bg-white/40 backdrop-blur-md rounded-3xl shadow-xl border border-white/20">
                    <div className="bg-white/80 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                      <Users className="w-12 h-12 text-slate-300" />
                    </div>
                    <p className="text-xl font-black text-slate-400">لا يوجد أعضاء مطابقين للبحث</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="members" className="space-y-8 animate-in fade-in duration-500">
              <div className="flex flex-col md:flex-row justify-between items-center bg-white/60 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/20 mb-10 group overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-blue-500/20 transition-all duration-700"></div>
                <div className="relative z-10">
                  <h2 className="text-2xl font-black text-slate-800">الأعضاء المسجلين</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
                    <p className="text-sm font-bold text-slate-500">إجمالي عدد الأعضاء: {allMembers.length} بطل</p>
                  </div>
                </div>
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-xl shadow-blue-200 transform hover:scale-105 transition-all h-14 px-8 rounded-2xl font-black text-lg relative z-10 active:scale-95" onClick={openAddMember}>
                  <UserPlus className="w-6 h-6 ml-3" />
                  إضافة عضو جديد
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {membersQuery.isLoading ? (
                  <div className="col-span-full py-32 text-center">
                    <div className="w-16 h-16 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                    <p className="mt-6 text-blue-600 font-black text-lg">جاري تحميل سجلات الأبطال...</p>
                  </div>
                ) : allMembers.length > 0 ? (
                  allMembers.map((member: any, index: number) => (
                    <AnimatedMemberItem key={member.id} index={index}>
                      <MemberCard
                        member={member}
                        onEdit={openEditMember}
                        onDelete={handleDeleteMember}
                        onViewQr={setViewingQr}
                      />
                    </AnimatedMemberItem>
                  ))
                ) : (
                  <div className="col-span-full py-32 text-center bg-white/40 backdrop-blur-md rounded-3xl shadow-2xl border-2 border-dashed border-white/40">
                    <div className="bg-white/80 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                      <Users className="w-12 h-12 text-slate-200" />
                    </div>
                    <p className="text-2xl font-black text-slate-400 mb-6">لا يوجد أعضاء مسجلين بعد</p>
                    <Button variant="outline" className="h-12 px-8 rounded-xl font-bold border-2" onClick={openAddMember}>ابدأ بإضافة أول بطل</Button>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="attendance" className="animate-in fade-in duration-500">
              <Card className="p-0 border-white/20 shadow-2xl overflow-hidden bg-white/60 backdrop-blur-xl rounded-3xl">
                <div className="p-8 border-b border-white/20 bg-white/40 flex justify-between items-center">
                  <h3 className="text-xl font-black text-slate-800 flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-blue-100 text-blue-600">
                      <Calendar className="w-6 h-6" />
                    </div>
                    سجلات الحضور اليومية
                  </h3>
                  <div className="bg-green-100/50 text-green-700 px-4 py-2 rounded-xl text-sm font-black flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                    تحديث مباشر
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="bg-white/40">
                        <th className="px-8 py-5 text-sm font-black text-slate-700 uppercase tracking-wider">التاريخ</th>
                        <th className="px-8 py-5 text-sm font-black text-slate-700 uppercase tracking-wider">اسم البطل</th>
                        <th className="px-8 py-5 text-sm font-black text-slate-700 uppercase tracking-wider">كود الحضور</th>
                        <th className="px-8 py-5 text-sm font-black text-slate-700 uppercase tracking-wider text-left">الوقت</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/20">
                      {allAttendance.length > 0 ? (
                        allAttendance.map((record: any) => {
                          const date = record.createdAt ? new Date(record.createdAt) : new Date();
                          return (
                            <tr key={record.id} className="hover:bg-white/60 transition-colors group">
                              <td className="px-8 py-5 text-sm font-bold text-slate-600">
                                {date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </td>
                              <td className="px-8 py-5">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-black text-xs">
                                    {record.memberName?.[0] || 'U'}
                                  </div>
                                  <span className="text-sm font-black text-slate-900">{record.memberName}</span>
                                </div>
                              </td>
                              <td className="px-8 py-5">
                                <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-mono font-black border border-blue-100 shadow-sm">
                                  {record.memberIdStr}
                                </span>
                              </td>
                              <td className="px-8 py-5 text-sm text-slate-500 font-bold text-left">
                                {date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-8 py-32 text-center text-slate-500">
                            <div className="bg-white/80 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                              <Calendar className="w-12 h-12 text-slate-200" />
                            </div>
                            <p className="text-2xl font-black text-slate-400">لا توجد سجلات حضور حالياً</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* Member Edit/Add Dialog */}
      <Dialog open={isMemberDialogOpen} onOpenChange={setIsMemberDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden bg-white/95 backdrop-blur-2xl border-white/20 rounded-[2.5rem] shadow-2xl p-0 flex flex-col" dir="rtl">
          <DialogHeader className="p-8 md:p-10 bg-gradient-to-br from-blue-600/10 to-indigo-600/10 border-b border-white/20 flex-shrink-0">
            <DialogTitle className="text-3xl font-black text-slate-900">
              {editingMember ? `تحديث بيانات البطل: ${editingMember.name}` : "إضافة بطل جديد للعائلة"}
            </DialogTitle>
            <p className="text-slate-500 font-bold text-lg mt-2 opacity-70">يرجى ملء كافة البيانات المطلوبة بدقة</p>
          </DialogHeader>

          <form id="member-form" onSubmit={handleSubmitMember} className="flex-1 overflow-y-auto p-8 md:p-10 space-y-8 custom-scrollbar">
            {/* Image Upload Area */}
            <div className="flex justify-center mb-6">
              <div className="relative group">
                <div className="w-40 h-40 rounded-[2.5rem] overflow-hidden border-8 border-white bg-slate-100 shadow-2xl shadow-blue-100 transition-all duration-500 group-hover:scale-105 group-hover:rotate-3">
                  {memberImage ? (
                    <img src={memberImage} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                      <Camera className="w-12 h-12 mb-2 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Upload Photo</span>
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  size="icon"
                  className="absolute -bottom-4 -left-4 rounded-2xl h-14 w-14 shadow-2xl bg-blue-600 hover:bg-blue-700 border-4 border-white transition-transform active:scale-90"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-6 w-6" />
                </Button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-sm font-black text-slate-700 mr-2 flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-500" />
                  الاسم الكامل <span className="text-red-500">*</span>
                </label>
                <Input
                  value={memberForm.name}
                  onChange={e => setMemberForm({ ...memberForm, name: e.target.value })}
                  required
                  className="h-14 bg-white/40 border-0 shadow-inner rounded-2xl text-lg font-bold focus:ring-2 focus:ring-blue-500"
                  placeholder="الاسم الرباعي"
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-black text-slate-700 mr-2 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-blue-500" />
                  رقم الموبايل
                </label>
                <Input
                  value={memberForm.phone}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                    setMemberForm({ ...memberForm, phone: val });
                  }}
                  placeholder="01xxxxxxxxx"
                  className="h-14 bg-white/40 border-0 shadow-inner rounded-2xl text-lg font-bold focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-black text-slate-700 mr-2 flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-blue-500" />
                  الرقم التعريفي (ID)
                </label>
                <Input
                  value={memberForm.memberId}
                  onChange={e => setMemberForm({ ...memberForm, memberId: e.target.value })}
                  placeholder="اترك فارغاً للتعيين التلقائي"
                  className="h-14 bg-white/40 border-0 shadow-inner rounded-2xl text-lg font-bold focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-black text-slate-700 mr-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  تاريخ الميلاد
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full justify-start text-right pr-12 relative h-14 bg-white/40 border-0 shadow-inner rounded-2xl font-bold hover:bg-white/60 transition-colors ${!memberForm.dateOfBirth && "text-muted-foreground"}`}
                    >
                      <Calendar className="absolute right-4 top-4.5 w-6 h-6 text-gray-400" />
                      {memberForm.dateOfBirth ? (
                        format(new Date(memberForm.dateOfBirth), "PPP", { locale: ar })
                      ) : (
                        <span>اختر التاريخ</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-3xl overflow-hidden border-0 shadow-2xl" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={memberForm.dateOfBirth ? new Date(memberForm.dateOfBirth) : undefined}
                      onSelect={(date) => setMemberForm({ ...memberForm, dateOfBirth: date ? date.toISOString().split('T')[0] : "" })}
                      initialFocus
                      captionLayout="dropdown"
                      fromYear={1950}
                      toYear={new Date().getFullYear()}
                      locale={ar}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-black text-slate-700 mr-2 flex items-center gap-2">
                  <BarChart className="w-4 h-4 text-blue-500" />
                  الحالة الدراسية
                </label>
                <Select
                  value={memberForm.academicStatus}
                  onValueChange={(val: any) => setMemberForm({ ...memberForm, academicStatus: val, academicYear: val === "graduate" ? "" : memberForm.academicYear })}
                >
                  <SelectTrigger className="w-full h-14 bg-white/40 border-0 shadow-inner rounded-2xl font-bold focus:ring-2 focus:ring-blue-500">
                    <SelectValue placeholder="اختر الحالة" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-0 shadow-xl bg-white/95 backdrop-blur-lg">
                    <SelectItem value="student" className="rounded-xl">طالب</SelectItem>
                    <SelectItem value="graduate" className="rounded-xl">خريج</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {memberForm.academicStatus === "student" && (
                <div className="space-y-3">
                  <label className="text-sm font-black text-slate-700 mr-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    السنة الدراسية
                  </label>
                  <Select
                    value={memberForm.academicYear}
                    onValueChange={(val) => setMemberForm({ ...memberForm, academicYear: val })}
                  >
                    <SelectTrigger className="w-full h-14 bg-white/40 border-0 shadow-inner rounded-2xl font-bold focus:ring-2 focus:ring-blue-500">
                      <SelectValue placeholder="اختر السنة" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-0 shadow-xl bg-white/95 backdrop-blur-lg">
                      {["أولى", "ثانية", "ثالثة", "رابعة", "خامسة", "سادسة"].map(year => (
                        <SelectItem key={year} value={year} className="rounded-xl">{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-3">
                <label className="text-sm font-black text-slate-700 mr-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  العنوان
                </label>
                <Input
                  value={memberForm.address}
                  onChange={e => setMemberForm({ ...memberForm, address: e.target.value })}
                  placeholder="منطقة السكن"
                  className="h-14 bg-white/40 border-0 shadow-inner rounded-2xl text-lg font-bold focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-black text-slate-700 mr-2 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  أب الاعتراف
                </label>
                <Input
                  value={memberForm.fatherOfConfession}
                  onChange={e => setMemberForm({ ...memberForm, fatherOfConfession: e.target.value })}
                  placeholder="اسم القدس"
                  className="h-14 bg-white/40 border-0 shadow-inner rounded-2xl text-lg font-bold focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </form>

          <DialogFooter className="p-8 md:p-10 border-t border-white/20 bg-white/50 flex-shrink-0 flex flex-row gap-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-14 rounded-2xl font-black text-lg border-2 hover:bg-slate-50 transition-all active:scale-95"
              onClick={() => setIsMemberDialogOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              form="member-form"
              type="submit"
              className="flex-1 h-14 rounded-2xl font-black text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-xl shadow-blue-200 transition-all active:scale-95 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                  جاري الحفظ...
                </div>
              ) : "حفظ التعديلات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={!!viewingQr} onOpenChange={() => setViewingQr(null)}>
        <DialogContent className="max-w-md bg-white/95 backdrop-blur-2xl rounded-[3rem] p-0 overflow-hidden border-white/20 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.25)]" dir="rtl">
          {viewingQr && (
            <div className="p-12 flex flex-col items-center space-y-10">
              <div className="text-center space-y-3">
                <div className="w-20 h-20 rounded-3xl bg-blue-100 flex items-center justify-center mx-auto mb-4 shadow-inner">
                  <QrCode className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">{viewingQr.name}</h3>
                <p className="text-slate-500 font-bold text-lg opacity-60">كود الحضور الرقمي الموحد</p>
              </div>

              <div className="relative group">
                <div className="absolute inset-0 bg-blue-500 rounded-[3rem] blur-3xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
                <div className="relative p-10 bg-white rounded-[3rem] border-8 border-slate-50 shadow-2xl transition-transform duration-500 group-hover:scale-105">
                  <QRCodeGenerator
                    value={viewingQr.memberId || viewingQr.memberIdSequential?.toString() || viewingQr.id}
                    size={260}
                  />
                </div>
              </div>

              <div className="w-full bg-blue-600/5 backdrop-blur-sm p-6 rounded-3xl border border-blue-500/10 flex flex-col items-center shadow-inner">
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-2">Member Serial ID</span>
                <span className="text-4xl font-mono font-black text-blue-700 tracking-tighter">
                  {viewingQr.memberId || viewingQr.memberIdSequential || viewingQr.id}
                </span>
              </div>

              <Button onClick={() => setViewingQr(null)} className="w-full h-16 text-xl font-black bg-slate-900 hover:bg-black text-white rounded-[1.5rem] shadow-xl transition-all active:scale-95">
                فهمت، إغلاق النافذة
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
