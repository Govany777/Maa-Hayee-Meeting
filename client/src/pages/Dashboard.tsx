import { useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
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
} from "lucide-react";
import QRCodeGenerator from "@/components/QRCodeGenerator";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("members");

  // Member Form State
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [viewingMember, setViewingMember] = useState<any>(null); // New state for viewing details
  const [memberForm, setMemberForm] = useState({
    name: "",
    phone: "",
    memberId: "",
    dateOfBirth: "",
    address: "",
    fatherOfConfession: "",
  });
  const [memberImage, setMemberImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const utils = trpc.useUtils();
  const membersQuery = trpc.admin.getAllMembers.useQuery();
  const attendanceQuery = trpc.attendance.getAllAttendance.useQuery();
  const createMemberMutation = trpc.admin.createMember.useMutation();
  const updateMemberMutation = trpc.admin.updateMember.useMutation();
  const deleteMemberMutation = trpc.admin.deleteMember.useMutation();
  const uploadMutation = trpc.members.uploadImage.useMutation();

  const allMembers = membersQuery.data || [];
  const allAttendance = attendanceQuery.data || [];

  const filteredMembers = useMemo(() => {
    if (!searchQuery) return allMembers;
    const q = searchQuery.toLowerCase();

    return allMembers.filter((m: any) => {
      const matchesBasic =
        m.name?.toLowerCase().includes(q) ||
        (m.phone && m.phone.includes(q)) ||
        (m.username && m.username.toLowerCase().includes(q)) ||
        (m.memberId && m.memberId.toString().includes(q));

      // Search by birth month
      let matchesMonth = false;
      if (m.dateOfBirth) {
        const dob = new Date(m.dateOfBirth);
        const monthNum = dob.getMonth() + 1;
        const monthName = MONTHS_AR[dob.getMonth()];
        matchesMonth =
          monthNum.toString() === q ||
          monthName.includes(q) ||
          `شهر ${monthNum}`.includes(q);
      }

      return matchesBasic || matchesMonth;
    });
  }, [allMembers, searchQuery]);

  const handleLogout = () => {
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
    <div className="min-h-screen bg-slate-50 flex" dir="rtl">
      {/* Sidebar */}
      <div className="w-64 bg-white border-l hidden lg:flex flex-col">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            لوحة الأدمن
          </h2>
        </div>
        <div className="flex-1 p-4 space-y-2">
          <Button
            variant="ghost"
            className={`w-full justify-start gap-2 ${activeTab === 'stats' ? 'text-blue-600 bg-blue-50' : ''}`}
            onClick={() => setActiveTab("members")} // Or actual stats tab if exists
          >
            <BarChart className="w-5 h-5 ml-2" />
            الإحصائيات
          </Button>
          <Button
            variant="ghost"
            className={`w-full justify-start gap-2 ${activeTab === 'members' ? 'text-blue-600 bg-blue-50' : ''}`}
            onClick={() => setActiveTab("members")}
          >
            <Users className="w-5 h-5 ml-2" />
            الأعضاء
          </Button>
          <Button
            variant="ghost"
            className={`w-full justify-start gap-2 ${activeTab === 'attendance' ? 'text-blue-600 bg-blue-50' : ''}`}
            onClick={() => setActiveTab("attendance")}
          >
            <Calendar className="w-5 h-5 ml-2" />
            الحضور
          </Button>
        </div>
        <div className="p-4 border-t">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-red-600 hover:bg-red-50"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5 ml-2" />
            تسجيل الخروج
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b h-16 flex items-center justify-between px-8">
          <h1 className="text-xl font-semibold">نظام التحكم - Maa Hayee</h1>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => setLocation("/")}>الرئيسية</Button>
          </div>
        </header>

        <main className="p-8 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="members">الأعضاء</TabsTrigger>
              <TabsTrigger value="attendance">سجل الحضور</TabsTrigger>
            </TabsList>

            <TabsContent value="members" className="space-y-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="بحث (اسم، موبايل، شهر ميلاد، أو ID)..."
                    className="pr-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={openAddMember}>
                  <UserPlus className="w-5 h-5 ml-2" />
                  إضافة عضو جديد
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredMembers.length > 0 ? (
                  filteredMembers.map((member: any) => (
                    <Card key={member.id} className="p-0 overflow-hidden group hover:shadow-xl transition-all duration-300 border-none bg-white shadow-sm">
                      <div className="relative aspect-square bg-white border-b border-slate-50 italic">
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
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-200 bg-slate-50">
                            <User className="w-16 h-16" />
                            <span className="text-[10px] font-bold uppercase mt-2 tracking-widest text-slate-300">No Image</span>
                          </div>
                        )}
                        <div className="absolute top-2 left-2 bg-white/90 p-1 rounded-lg shadow-md z-10 scale-90 origin-top-left">
                          <QRCodeGenerator value={member.memberId || member.id} size={40} includeMargin={false} />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-4">
                          <div className="flex gap-2">
                            <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full" onClick={() => setViewingMember(member)}>
                              <Search className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full" onClick={() => openEditMember(member)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="destructive" className="h-8 w-8 rounded-full" onClick={() => handleDeleteMember(member.id, member.name)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          {/* QR Code integrated into the card hover view */}
                          <div className="bg-white p-1 rounded shadow-sm">
                            <QRCodeGenerator
                              value={member.memberId || member.memberIdSequential?.toString() || ""}
                              size={50}
                              includeMargin={false}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="p-5">
                        <div className="flex flex-col mb-3">
                          <h4 className="font-bold text-lg text-slate-800 line-clamp-1">{member.name}</h4>
                          <span className="text-xs font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded w-fit">
                            ID: {member.memberId || member.memberIdSequential}
                          </span>
                        </div>

                        <div className="space-y-2 text-sm text-slate-600">
                          {member.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              {member.phone}
                            </div>
                          )}
                          {member.dateOfBirth && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {new Date(member.dateOfBirth).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' })}
                            </div>
                          )}
                          {member.address && (
                            <div className="flex items-center gap-2 truncate">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              {member.address}
                            </div>
                          )}
                          {member.fatherOfConfession && (
                            <div className="flex items-center gap-2">
                              <Users className="w-3.5 h-3.5 text-slate-400" />
                              <span className="text-xs">أب الاعتراف: {member.fatherOfConfession}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-full py-12 text-center bg-white rounded-lg shadow-sm">
                    <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">لا يوجد أعضاء مطابقين للبحث</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="attendance">
              <Card className="p-0 border-none shadow-md overflow-hidden bg-white">
                <table className="w-full text-right">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-6 py-4 text-sm font-bold text-slate-700">التاريخ</th>
                      <th className="px-6 py-4 text-sm font-bold text-slate-700">الاسم</th>
                      <th className="px-6 py-4 text-sm font-bold text-slate-700">الرقم التعريفي (ID)</th>
                      <th className="px-6 py-4 text-sm font-bold text-slate-700">الوقت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allAttendance.length > 0 ? (
                      allAttendance.map((record: any) => {
                        const date = record.createdAt ? new Date(record.createdAt) : new Date();
                        return (
                          <tr key={record.id} className="hover:bg-blue-50/30 transition-colors">
                            <td className="px-6 py-4 text-sm font-medium">
                              {date.toLocaleDateString('ar-EG')}
                            </td>
                            <td className="px-6 py-4 text-sm font-bold text-slate-900">{record.memberName}</td>
                            <td className="px-6 py-4 text-sm text-blue-600 font-mono font-bold">
                              {record.memberIdStr}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-500">
                              {date.toLocaleTimeString('ar-EG')}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                          لا توجد سجلات حضور حالياً
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* Member Edit/Add Dialog */}
      <Dialog open={isMemberDialogOpen} onOpenChange={setIsMemberDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingMember ? `تعديل بروفايل: ${editingMember.name}` : "إضافة عضو جديد"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitMember} className="space-y-6 pt-4">
            {/* Image Upload Area */}
            <div className="flex justify-center mb-4">
              <div className="relative group">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-blue-50 bg-slate-100">
                  {memberImage ? (
                    <img src={memberImage} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                      <Camera className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  size="icon"
                  className="absolute bottom-0 left-0 rounded-full h-8 w-8 shadow-lg"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                </Button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">الاسم الكامل <span className="text-red-500">*</span></label>
                <Input
                  value={memberForm.name}
                  onChange={e => setMemberForm({ ...memberForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">رقم الموبايل</label>
                <Input
                  value={memberForm.phone}
                  onChange={e => setMemberForm({ ...memberForm, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">الرقم التعريفي (ID)</label>
                <Input
                  value={memberForm.memberId}
                  onChange={e => setMemberForm({ ...memberForm, memberId: e.target.value })}
                  placeholder="اترك فارغاً للتعيين التلقائي"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">تاريخ الميلاد</label>
                <Input
                  type="date"
                  value={memberForm.dateOfBirth}
                  onChange={e => setMemberForm({ ...memberForm, dateOfBirth: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">العنوان</label>
                <Input
                  value={memberForm.address}
                  onChange={e => setMemberForm({ ...memberForm, address: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">أب الاعتراف</label>
                <Input
                  value={memberForm.fatherOfConfession}
                  onChange={e => setMemberForm({ ...memberForm, fatherOfConfession: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setIsMemberDialogOpen(false)}>إلغاء</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                {isSubmitting ? "جاري الحفظ..." : (editingMember ? "حفظ التعديلات" : "إضافة العضو")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Member Details View Dialog */}
      <Dialog open={!!viewingMember} onOpenChange={() => setViewingMember(null)}>
        <DialogContent className="max-w-2xl bg-white rounded-xl overflow-hidden p-0" dir="rtl">
          {viewingMember && (
            <div className="flex flex-col md:flex-row">
              <div className="w-full md:w-1/3 bg-slate-50 p-8 flex flex-col items-center border-l border-slate-100">
                <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-white shadow-lg mb-6">
                  {viewingMember.imageUrl ? (
                    <img src={viewingMember.imageUrl} className="w-full h-full object-cover" alt={viewingMember.name} />
                  ) : (
                    <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400">
                      <User size={64} />
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-bold text-slate-800 text-center mb-2">{viewingMember.name}</h3>
                <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-xs font-bold">ID: {viewingMember.memberId || viewingMember.memberIdSequential}</span>
              </div>

              <div className="flex-1 p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-slate-400 text-xs uppercase mb-1 block">رقم الموبايل</Label>
                    <p className="font-semibold">{viewingMember.phone || "غير متوفر"}</p>
                  </div>
                  <div>
                    <Label className="text-slate-400 text-xs uppercase mb-1 block">تاريخ الميلاد</Label>
                    <p className="font-semibold">{viewingMember.dateOfBirth ? new Date(viewingMember.dateOfBirth).toLocaleDateString('ar-EG') : "غير متوفر"}</p>
                  </div>
                  <div>
                    <Label className="text-slate-400 text-xs uppercase mb-1 block">اب الاعتراف</Label>
                    <p className="font-semibold">{viewingMember.fatherOfConfession || "غير متوفر"}</p>
                  </div>
                  <div>
                    <Label className="text-slate-400 text-xs uppercase mb-1 block">اسم المستخدم</Label>
                    <p className="font-semibold text-blue-600">@{viewingMember.username || "لا يوجد حساب"}</p>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <Label className="text-slate-400 text-xs uppercase mb-1 block">العنوان</Label>
                  <p className="font-semibold">{viewingMember.address || "غير متوفر"}</p>
                </div>

                <div className="bg-blue-50 p-6 rounded-xl flex items-center justify-between border border-blue-100">
                  <div>
                    <h4 className="font-bold text-blue-800 mb-1">كود الحضور (QR)</h4>
                    <p className="text-xs text-blue-600">يمكن استخدامه لتسجيل الحضور</p>
                  </div>
                  <div className="bg-white p-2 rounded-lg shadow-sm">
                    <QRCodeGenerator value={viewingMember.memberId || viewingMember.memberIdSequential?.toString() || ""} size={100} />
                  </div>
                </div>

                <DialogFooter>
                  <Button onClick={() => setViewingMember(null)} variant="outline" className="w-full">إغلاق</Button>
                </DialogFooter>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

const TrendingUp = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <polyline points="16 7 22 7 22 13" />
  </svg>
);
