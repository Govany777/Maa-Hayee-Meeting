import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Download } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import QRCodeGenerator from "./QRCodeGenerator";

interface MembersManagementProps {
  onMemberAdded?: () => void;
}

export default function MembersManagement({ onMemberAdded }: MembersManagementProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    memberId: "",
    name: "",
    email: "",
    phone: "",
    imageUrl: "",
  });
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);

  const membersQuery = trpc.admin.getAllMembers.useQuery();
  const createMutation = trpc.admin.createMember.useMutation();
  const updateMutation = trpc.admin.updateMember.useMutation();
  const deleteMutation = trpc.admin.deleteMember.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.memberId || !formData.name) {
      toast.error("الرجاء ملء جميع الحقول المطلوبة");
      return;
    }

    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          ...formData,
        });
        toast.success("تم تحديث بيانات العضو بنجاح");
      } else {
        await createMutation.mutateAsync({
          ...formData,
        });
        toast.success("تم إضافة العضو بنجاح");
      }

      setFormData({ memberId: "", name: "", email: "", phone: "", imageUrl: "" });
      setEditingId(null);
      setIsOpen(false);
      membersQuery.refetch();
      onMemberAdded?.();
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ");
    }
  };

  const handleEdit = (member: any) => {
    setFormData({
      memberId: member.memberId,
      name: member.name,
      email: member.email || "",
      phone: member.phone || "",
      imageUrl: member.imageUrl || "",
    });
    setEditingId(member.id);
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("هل تريد حذف هذا العضو؟")) {
      try {
        await deleteMutation.mutateAsync({ id });
        toast.success("تم حذف العضو بنجاح");
        membersQuery.refetch();
      } catch (error: any) {
        toast.error(error.message || "فشل الحذف");
      }
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setEditingId(null);
    setFormData({ memberId: "", name: "", email: "", phone: "", imageUrl: "" });
  };

  const handleDownloadQR = (member: any) => {
    const canvas = document.querySelector(`#qr-${member.id} canvas`) as HTMLCanvasElement;
    if (canvas) {
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `QR-${member.memberId}.png`;
      link.click();
    }
  };

  return (
    <div className="space-y-6">
      {/* زر إضافة عضو جديد */}
      <div className="flex justify-end">
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
              <Plus className="w-4 h-4" />
              إضافة عضو جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "تعديل بيانات العضو" : "إضافة عضو جديد"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">الرقم التعريفي *</label>
                <Input
                  placeholder="مثال: MEM001"
                  value={formData.memberId}
                  onChange={(e) => setFormData({ ...formData, memberId: e.target.value })}
                  disabled={!!editingId}
                  dir="rtl"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">الاسم *</label>
                <Input
                  placeholder="اسم العضو"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  dir="rtl"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">البريد الإلكتروني</label>
                <Input
                  type="email"
                  placeholder="example@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">رقم الهاتف</label>
                <Input
                  placeholder="01234567890"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">رابط الصورة</label>
                <Input
                  placeholder="https://example.com/image.jpg"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  dir="ltr"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? "جاري..." : "حفظ"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={handleClose}
                >
                  إلغاء
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* قائمة الأعضاء */}
      {membersQuery.isLoading ? (
        <div className="text-center py-8 text-gray-500">جاري تحميل الأعضاء...</div>
      ) : membersQuery.data && membersQuery.data.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {membersQuery.data.map((member) => (
            <Card key={member.id} className="p-4 hover:shadow-lg transition-shadow">
              <div className="space-y-3">
                {member.imageUrl && (
                  <img
                    src={member.imageUrl}
                    alt={member.name}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                )}

                <div>
                  <p className="text-sm text-gray-600">الاسم</p>
                  <p className="font-semibold">{member.name}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">الرقم التعريفي</p>
                  <p className="font-mono text-sm">{member.memberId}</p>
                </div>

                {member.email && (
                  <div>
                    <p className="text-sm text-gray-600">البريد الإلكتروني</p>
                    <p className="text-sm truncate">{member.email}</p>
                  </div>
                )}

                {member.phone && (
                  <div>
                    <p className="text-sm text-gray-600">الهاتف</p>
                    <p className="text-sm">{member.phone}</p>
                  </div>
                )}

                {/* عرض QR Code */}
                <div className="bg-gray-100 p-2 rounded-lg flex justify-center">
                  <div id={`qr-${member.id}`} className="flex justify-center">
                    <QRCodeGenerator
                      value={JSON.stringify({ memberId: member.memberId })}
                      size={120}
                      className="border border-gray-300 rounded"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1"
                    onClick={() => handleDownloadQR(member)}
                  >
                    <Download className="w-3 h-3" />
                    QR
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1"
                    onClick={() => handleEdit(member)}
                  >
                    <Edit2 className="w-3 h-3" />
                    تعديل
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1 gap-1"
                    onClick={() => handleDelete(member.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                    حذف
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <p className="text-gray-500">لا توجد أعضاء حتى الآن</p>
          <p className="text-sm text-gray-400">اضغط على زر "إضافة عضو جديد" لبدء الإضافة</p>
        </Card>
      )}
    </div>
  );
}
