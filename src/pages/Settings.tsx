import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { Upload, X, Building, Phone, Mail, Globe, Image as ImageIcon, User as UserIcon, Lock } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AddUserDialog } from "@/components/AddUserDialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { User, UserUpdateDTO } from "@/types";

export default function Settings() {
  const { companyDetails, updateCompanyDetails, uploadLogo, removeLogo } = useCompany();
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);

  // Company Form State
  const [companyForm, setCompanyForm] = useState({
    name: companyDetails.name,
    subtitle: companyDetails.subtitle,
    address: companyDetails.address,
    phone: companyDetails.phone,
    email: companyDetails.email,
    website: companyDetails.website
  });

  const companyFileInputRef = useRef<HTMLInputElement>(null);

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  // Users State
  const [users, setUsers] = useState<User[]>([]);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await api.users.list();
      setUsers(data);
    } catch (error) {
      console.error("Failed to load users", error);
    }
  };

  useEffect(() => {
    if (user) {
      setProfileForm(prev => ({
        ...prev,
        fullName: user.profile?.fullName || "",
        email: user.email || ""
      }));
    }
  }, [user]);

  // Handle Company Updates
  const handleCompanyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCompanyForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCompanySave = async () => {
    setLoading(true);
    try {
      await updateCompanyDetails(companyForm);
      toast.success("Company details updated successfully");
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompanyFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    try {
      setLoading(true);
      await uploadLogo(file); // This might need to be adjusted if uploadLogo expects a file directly or handles the backend call
      // Assuming uploadLogo in context handles the API call or mock
      toast.success("Logo uploaded successfully");
    } catch (error) {
      toast.error("Failed to upload logo");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Handle Profile Updates
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({ ...prev, [name]: value }));
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profileForm.newPassword && profileForm.newPassword !== profileForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      if (user?.id) {
        const updateData: UserUpdateDTO = {
          email: profileForm.email,
          fullName: profileForm.fullName,
        };
        if (profileForm.newPassword) {
          updateData.password = profileForm.newPassword;
        }
        await api.users.update(user.id, updateData);
        await refreshUser();
        setProfileForm(prev => ({ ...prev, currentPassword: "", newPassword: "", confirmPassword: "" }));
        toast.success("Profile updated successfully");
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your company profile and personal account settings.
        </p>
      </div>

      <Tabs defaultValue="company" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="company">Company Settings</TabsTrigger>
          <TabsTrigger value="profile">Profile Settings</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Company Identity</CardTitle>
              <CardDescription>
                These details will appear on your generated PDF documents (Invoices, Quotations, Reports).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col md:flex-row gap-8">
                {/* Logo Section */}
                <div className="flex-shrink-0 space-y-3">
                  <Label>Company Logo</Label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg w-40 h-40 flex items-center justify-center bg-muted/30 relative overflow-hidden group hover:border-primary/50 transition-colors">
                    {companyDetails.logo ? (
                      <>
                        <img
                          src={companyDetails.logo}
                          alt="Company Logo"
                          className="w-full h-full object-contain p-2"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8"
                            onClick={removeLogo}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-4">
                        <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <span className="text-xs text-muted-foreground">No logo</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      ref={companyFileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleCompanyFileChange}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-40"
                      onClick={() => companyFileInputRef.current?.click()}
                      disabled={loading}
                    >
                      <Upload className="h-3 w-3 mr-2" />
                      {companyDetails.logo ? "Change Logo" : "Upload Logo"}
                    </Button>
                  </div>
                </div>

                {/* Form Section */}
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Company Name</Label>
                      <div className="relative">
                        <Building className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="name"
                          name="name"
                          value={companyForm.name}
                          onChange={handleCompanyChange}
                          className="pl-9"
                          placeholder="Mitambo Africa"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subtitle">Tagline / Subtitle</Label>
                      <Input
                        id="subtitle"
                        name="subtitle"
                        value={companyForm.subtitle}
                        onChange={handleCompanyChange}
                        placeholder="Agency Suite"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Business Address</Label>
                    <Input
                      id="address"
                      name="address"
                      value={companyForm.address}
                      onChange={handleCompanyChange}
                      placeholder="123 Creative Avenue, Nairobi, Kenya"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          name="phone"
                          value={companyForm.phone}
                          onChange={handleCompanyChange}
                          className="pl-9"
                          placeholder="+254..."
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          name="email"
                          value={companyForm.email}
                          onChange={handleCompanyChange}
                          className="pl-9"
                          placeholder="hello@company.com"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="website"
                          name="website"
                          value={companyForm.website}
                          onChange={handleCompanyChange}
                          className="pl-9"
                          placeholder="www.company.com"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button onClick={handleCompanySave} disabled={loading} className="min-w-[120px]">
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>
                Update your personal information and password.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col md:flex-row gap-8">
                {/* Avatar Section - Placeholder for now as backend avatar upload isn't fully set up in this specific flow yet, 
                     but we display current avatar */}
                <div className="flex-shrink-0 space-y-3">
                  <Label>Profile Picture</Label>
                  <div className="flex flex-col items-center gap-4">
                    <Avatar className="h-32 w-32 border-2 border-muted">
                      <AvatarImage src={user?.profile?.avatarUrl || ""} />
                      <AvatarFallback className="text-4xl">{user?.profile?.fullName?.substring(0, 2)?.toUpperCase() || "ME"}</AvatarFallback>
                    </Avatar>
                    {/* 
                     <Button variant="outline" size="sm" onClick={() => toast.info("Avatar upload coming soon")}>
                        Change Picture
                     </Button>
                     */}
                  </div>
                </div>

                <div className="flex-1 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="fullName"
                        name="fullName"
                        value={profileForm.fullName}
                        onChange={handleProfileChange}
                        className="pl-9"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={profileForm.email}
                        onChange={handleProfileChange}
                        className="pl-9"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <h3 className="text-sm font-medium mb-4">Change Password</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="newPassword"
                            name="newPassword"
                            type="password"
                            value={profileForm.newPassword}
                            onChange={handleProfileChange}
                            className="pl-9"
                            placeholder="••••••••"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            value={profileForm.confirmPassword}
                            onChange={handleProfileChange}
                            className="pl-9"
                            placeholder="••••••••"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={handleProfileSave} disabled={loading} className="min-w-[120px]">
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage system users and their roles.
                </CardDescription>
              </div>
              <Button onClick={() => setIsAddUserDialogOpen(true)}>
                <UserIcon className="mr-2 h-4 w-4" /> Add User
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{u.profile?.fullName?.substring(0, 2)?.toUpperCase() || 'U'}</AvatarFallback>
                          </Avatar>
                          {u.profile?.fullName || 'User'}
                        </div>
                      </TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => toast.info("Edit not implemented")}>
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <AddUserDialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen} onUserCreated={loadUsers} />
        </TabsContent>
      </Tabs>
    </div >
  );
}
