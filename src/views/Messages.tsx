
import { useEffect, useState, useRef, useCallback } from "react";
import { Send, User as UserIcon, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { messagingService, Message } from "@/services/messaging";
import { Profile } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { toast } from "sonner"; // Assuming sonner is available based on package.json

export default function MessagesPage() {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [users, setUsers] = useState<Profile[]>([]);
    const [selectedRecipient, setSelectedRecipient] = useState<Profile | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const loadUsers = useCallback(async () => {
        try {
            const data = await messagingService.getUsers();
            // Filter out self
            setUsers(data.filter(u => u.id !== user?.id));
        } catch (error) {
            console.error("Failed to load users", error);
        }
    }, [user?.id]);

    const loadMessages = useCallback(async () => {
        if (!selectedRecipient) return;
        try {
            const data = await messagingService.getMessages(undefined, selectedRecipient.id);
            setMessages(data);
        } catch (error) {
            console.error("Failed to load messages", error);
            toast.error("Failed to load messages");
        }
    }, [selectedRecipient]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    useEffect(() => {
        if (selectedRecipient) {
            loadMessages();
            const subscription = messagingService.subscribeToMessages((payload) => {
                const p = payload as { new: Message };
                // Optimistically update or re-fetch. Simple re-fetch for now or append if it matches current chat
                if (
                    (p.new.sender_id === selectedRecipient.id && p.new.recipient_id === user?.id) ||
                    (p.new.sender_id === user?.id && p.new.recipient_id === selectedRecipient.id)
                ) {
                    // Fetching fresh to get sender details easily, or we could manually append
                    loadMessages();
                }
            });
            return () => { subscription.unsubscribe(); };
        }
    }, [selectedRecipient, user, loadMessages]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);


    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedRecipient) return;

        try {
            await messagingService.sendMessage(newMessage, undefined, selectedRecipient.id);
            setNewMessage("");
            loadMessages(); // Refresh to see sent message
        } catch (error) {
            console.error("Failed to send message", error);
            toast.error("Failed to send message");
        }
    };

    return (
        <div className="flex h-[calc(100vh-10rem)] border rounded-xl overflow-hidden bg-card shadow-sm">
            {/* Sidebar */}
            <div className="w-1/3 border-r bg-muted/30">
                <div className="p-4 border-b">
                    <h2 className="font-semibold flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Messages
                    </h2>
                </div>
                <ScrollArea className="h-[calc(100%-4rem)]">
                    <div className="p-2 space-y-2">
                        {users.map((u) => (
                            <div
                                key={u.id}
                                onClick={() => setSelectedRecipient(u)}
                                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${selectedRecipient?.id === u.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                                    }`}
                            >
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={u.avatar_url || undefined} />
                                    <AvatarFallback><UserIcon className="h-5 w-5" /></AvatarFallback>
                                </Avatar>
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-sm font-medium truncate">{u.full_name || "Unknown User"}</p>
                                    <p className="text-xs text-muted-foreground truncate">Click to chat</p>
                                </div>
                            </div>
                        ))}
                        {users.length === 0 && (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                                No other users found.
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col h-full">
                {selectedRecipient ? (
                    <>
                        <div className="p-4 border-b flex items-center gap-3 bg-card">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={selectedRecipient.avatar_url || undefined} />
                                <AvatarFallback><UserIcon className="h-4 w-4" /></AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="text-sm font-medium">{selectedRecipient.full_name}</p>
                            </div>
                        </div>

                        <ScrollArea className="flex-1 p-4">
                            <div className="space-y-4">
                                {messages.length === 0 ? (
                                    <div className="text-center text-muted-foreground py-10 text-sm">
                                        No messages yet. Say hi!
                                    </div>
                                ) : (
                                    messages.map((msg) => {
                                        const isMe = msg.sender_id === user?.id;
                                        return (
                                            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                                                <div className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${isMe ? "bg-primary text-primary-foreground" : "bg-muted"
                                                    }`}>
                                                    <p>{msg.content}</p>
                                                    <p className={`text-[10px] mt-1 ${isMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                                        {format(new Date(msg.created_at), "p")}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={scrollRef} />
                            </div>
                        </ScrollArea>

                        <div className="p-4 border-t bg-card">
                            <form onSubmit={handleSendMessage} className="flex gap-2">
                                <Input
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type a message..."
                                    className="flex-1"
                                />
                                <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                                    <Send className="h-4 w-4" />
                                </Button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Select a user to start messaging</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
