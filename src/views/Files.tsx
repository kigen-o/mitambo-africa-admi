
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { File as FileType } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Upload, File, FolderOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function FilesPage() {
    const [files, setFiles] = useState<FileType[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    const fetchFiles = async () => {
        setLoading(true);
        try {
            const data = await api.files.list();
            setFiles(data);
        } catch (error) {
            console.error("Failed to fetch files", error);
            toast.error("Failed to load files");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFiles();
    }, []);

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const fileList = event.target.files;
        if (!fileList || fileList.length === 0) return;

        setUploading(true);
        const formData = new FormData();
        Array.from(fileList).forEach((file) => {
            formData.append("files", file);
        });

        try {
            await api.files.upload(formData);
            toast.success("Files uploaded successfully");
            fetchFiles();
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Failed to upload files");
        } finally {
            setUploading(false);
            // Reset input
            event.target.value = "";
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await api.files.delete(id);
            toast.success("File deleted");
            setFiles(files.filter((f) => f.id !== id));
        } catch (error) {
            console.error("Delete error:", error);
            toast.error("Failed to delete file");
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Files</h2>
                    <p className="text-muted-foreground">
                        Manage your documents and assets.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="relative cursor-pointer">
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Files
                        <Input
                            type="file"
                            multiple
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={handleUpload}
                        />
                    </Button>
                    <Button variant="default" className="relative cursor-pointer">
                        <FolderOpen className="mr-2 h-4 w-4" />
                        Upload Folder
                        <Input
                            type="file"
                            // @ts-expect-error - webkitdirectory is a non-standard attribute but required for folder uploads
                            webkitdirectory=""
                            mozdirectory=""
                            directory=""
                            multiple
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={handleUpload}
                        />
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Files</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : files.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            No files found. Upload some files to get started.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]"></TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Size</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {files.map((file) => (
                                    <TableRow key={file.id}>
                                        <TableCell>
                                            <File className="h-4 w-4 text-blue-500" />
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {file.name}
                                        </TableCell>
                                        <TableCell>{formatSize(file.size)}</TableCell>
                                        <TableCell className="max-w-[150px] truncate" title={file.type}>
                                            {file.type || "Unknown"}
                                        </TableCell>
                                        <TableCell>
                                            {format(new Date(file.createdAt), "MMM d, yyyy")}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(file.id)}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {uploading && (
                <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-md shadow-lg flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading files...
                </div>
            )}
        </div>
    );
}
