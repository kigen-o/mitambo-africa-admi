import { Profile } from "@/lib/types";

export interface Message {
    id: string;
    created_at: string;
    content: string;
    sender_id: string;
    group_id?: string;
    recipient_id?: string;
    sender?: Profile;
}

export const messagingService = {
    async getMessages(groupId?: string, recipientId?: string) {
        console.log("Messaging service: getMessages mock (Supabase removed)");
        return [] as Message[];
    },

    async sendMessage(content: string, groupId?: string, recipientId?: string) {
        console.log("Messaging service: sendMessage mock (Supabase removed)");
        return {
            id: Math.random().toString(36).substr(2, 9),
            created_at: new Date().toISOString(),
            content,
            sender_id: "mock-id",
        } as Message;
    },

    subscribeToMessages(callback: (payload: unknown) => void) {
        console.log("Messaging service: subscribeToMessages mock (Supabase removed)");
        return { unsubscribe: () => { } };
    },

    async getUsers() {
        console.log("Messaging service: getUsers mock (Supabase removed)");
        return [] as Profile[];
    }
};
