
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import { UserUpdateDTO } from "@/types";

interface ProfileDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ProfileDialog({ open, onOpenChange }: ProfileDialogProps) {
    const { user, refreshUser, signOut } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
    });

    useEffect(() => {
        if (open && user) {
            setFormData({
                fullName: user.profile?.fullName || "",
                email: user.email || "",
            });
        }
    }, [open, user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsLoading(true);

        try {
            await api.users.update(user.id, {
                email: formData.email,
                fullName: formData.fullName,
            } as UserUpdateDTO);
            toast.success("Profile updated successfully");
            await refreshUser();
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            toast.error("Failed to update profile");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>My Profile</DialogTitle>
                    <DialogDescription>
                        View and manage your personal account information.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center gap-4 py-6 border-b border-border mb-4">
                    <Avatar className="h-20 w-20">
                        <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                            {user?.profile?.fullName?.substring(0, 2)?.toUpperCase() || "SA"}
                        </AvatarFallback>
                        {user?.profile?.avatarUrl && <AvatarImage src={user.profile.avatarUrl} />}
                    </Avatar>
                    <div className="text-center">
                        <p className="text-lg font-bold">{user?.profile?.fullName || "Super Admin"}</p>
                        <p className="text-sm text-muted-foreground">{user?.email}</p>
                    </div>
                </div>
                <form onSubmit={handleSubmit} className="grid gap-4 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input
                            id="fullName"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            placeholder="Your full name"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="your@email.com"
                            required
                        />
                    </div>
                    <DialogFooter className="mt-4 flex flex-col sm:flex-row gap-2">
                        <Button
                            type="button"
                            variant="destructive"
                            className="w-full sm:w-auto gap-2"
                            onClick={() => {
                                signOut();
                                onOpenChange(false);
                            }}
                        >
                            <LogOut className="h-4 w-4" /> Sign Out
                        </Button>
                        <Button type="submit" className="w-full sm:w-auto" disabled={isLoading}>
                            {isLoading ? "Saving..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
