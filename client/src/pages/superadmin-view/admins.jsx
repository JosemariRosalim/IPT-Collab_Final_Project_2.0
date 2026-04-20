import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  getAllAdmins,
  createAdmin,
  updateAdmin,
  archiveAdmin,
  unarchiveAdmin,
} from "@/store/superadmin/admin-slice";
import { ArchiveConfirmationDialog } from "@/components/common/archive-confirmation-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Pencil, Plus, ShieldCheck, Archive, ArchiveRestore } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function AdminManagement() {
  const dispatch = useDispatch();
  const { adminList, isLoading } = useSelector((state) => state.superAdmin);
  const activeAdmins = adminList?.active || [];
  const archivedAdmins = adminList?.archived || [];
  const { toast } = useToast();

  const [openDialog, setOpenDialog] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentAdminId, setCurrentAdminId] = useState(null);
  const [formData, setFormData] = useState({
    userName: "",
    email: "",
    password: "",
  });
  const [openArchiveDialog, setOpenArchiveDialog] = useState(false);
  const [adminToArchive, setAdminToArchive] = useState(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isArchivingMode, setIsArchivingMode] = useState(true);

  useEffect(() => {
    dispatch(getAllAdmins());
  }, [dispatch]);

  const handleOpenCreate = () => {
    setIsEdit(false);
    setFormData({ userName: "", email: "", password: "" });
    setOpenDialog(true);
  };

  const handleOpenEdit = (admin) => {
    setIsEdit(true);
    setCurrentAdminId(admin._id);
    setFormData({
      userName: admin.userName,
      email: admin.email,
      password: "",
    });
    setOpenDialog(true);
  };

  const handleSubmit = () => {
    if (!formData.userName || !formData.email) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!isEdit && !formData.password) {
      toast({
        title: "Error",
        description: "Password is required for new admins",
        variant: "destructive",
      });
      return;
    }

    const action = isEdit
      ? updateAdmin({ id: currentAdminId, formData })
      : createAdmin(formData);

    dispatch(action).then((data) => {
      if (data?.payload?.success) {
        toast({
          title: "Success",
          description: data.payload.message,
          variant: "success",
        });
        setOpenDialog(false);
        dispatch(getAllAdmins());
      } else {
        toast({
          title: "Error",
          description: data?.payload?.message || "Operation failed",
          variant: "destructive",
        });
      }
    });
  };

  const handleArchive = (admin) => {
    setAdminToArchive(admin);
    setIsArchivingMode(true);
    setOpenArchiveDialog(true);
  };

  const handleArchiveConfirm = () => {
    if (!adminToArchive?._id) return;

    setIsArchiving(true);
    dispatch(archiveAdmin(adminToArchive._id))
      .then((data) => {
        if (data?.payload?.success) {
          toast({
            title: "Admin archived",
            description: data.payload.message,
            variant: "success",
          });
          dispatch(getAllAdmins());
          setOpenArchiveDialog(false);
          setAdminToArchive(null);
        } else {
          toast({
            title: "Error",
            description: data?.payload?.message || "Archive failed",
            variant: "destructive",
          });
        }
      })
      .finally(() => {
        setIsArchiving(false);
      });
  };

  const handleUnarchive = (admin) => {
    setAdminToArchive(admin);
    setIsArchivingMode(false);
    setOpenArchiveDialog(true);
  };

  const handleUnarchiveConfirm = () => {
    if (!adminToArchive?._id) return;

    setIsArchiving(true);
    dispatch(unarchiveAdmin(adminToArchive._id))
      .then((data) => {
        if (data?.payload?.success) {
          toast({
            title: "Admin restored",
            description: data.payload.message,
            variant: "success",
          });
          dispatch(getAllAdmins());
          setOpenArchiveDialog(false);
          setAdminToArchive(null);
        } else {
          toast({
            title: "Error",
            description: data?.payload?.message || "Unarchive failed",
            variant: "destructive",
          });
        }
      })
      .finally(() => {
        setIsArchiving(false);
      });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-primary flex items-center gap-2">
            <ShieldCheck className="h-8 w-8" />
            Manage Admins
          </h1>
          <p className="text-muted-foreground mt-1">
            Create, update, and manage admin accounts
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="bg-secondary hover:bg-accent text-foreground font-semibold"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Admin
        </Button>
      </div>

      <Card className="border-2">
        <CardHeader>
          <CardTitle className="text-xl">Active Admins</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading...
            </div>
          ) : activeAdmins.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No active admin accounts. Create one to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeAdmins.map((admin) => (
                  <TableRow key={admin._id}>
                    <TableCell className="font-medium">
                      {admin.userName}
                    </TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell>
                      <Badge className="bg-primary hover:bg-primary/80">
                        Admin
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(admin.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenEdit(admin)}
                          className="hover:bg-secondary/20"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleArchive(admin)}
                          className="border-amber-200 text-amber-600 hover:bg-amber-50"
                          title="Archive admin"
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border-2">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Archived Admins
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading...
            </div>
          ) : archivedAdmins.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Archived admins will appear here.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Archived On</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {archivedAdmins.map((admin) => (
                  <TableRow key={admin._id}>
                    <TableCell className="font-medium">
                      {admin.userName}
                    </TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell>
                      <Badge className="bg-muted text-foreground">
                        Archived
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {admin.archivedAt
                        ? formatDate(admin.archivedAt)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUnarchive(admin)}
                        className="border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                        title="Unarchive admin"
                      >
                        <ArchiveRestore className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-primary">
              {isEdit ? "Edit Admin" : "Create New Admin"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="userName">Username *</Label>
              <Input
                id="userName"
                placeholder="Enter username"
                value={formData.userName}
                onChange={(e) =>
                  setFormData({ ...formData, userName: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email"
                value={formData.email}
                disabled={isEdit}
                readOnly={isEdit}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
           
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                Password {!isEdit && "*"}
                {isEdit && <span className="text-xs text-muted-foreground"> (Leave blank to keep current)</span>}
              </Label>
              <Input
                id="password"
                type="password"
                placeholder={isEdit ? "Enter new password (optional)" : "Enter password"}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-primary hover:bg-primary/90"
            >
              {isEdit ? "Update Admin" : "Create Admin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive/Unarchive Confirmation Dialog */}
      <ArchiveConfirmationDialog
        open={openArchiveDialog}
        onOpenChange={setOpenArchiveDialog}
        isLoading={isArchiving}
        onConfirm={isArchivingMode ? handleArchiveConfirm : handleUnarchiveConfirm}
        archiveType="admin"
        isArchiving={isArchivingMode}
        itemDetails={{
          itemId: adminToArchive?._id,
          itemName: adminToArchive?.userName,
        }}
      />
    </div>
  );
}

export default AdminManagement;

