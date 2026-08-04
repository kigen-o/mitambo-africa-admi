import { api } from "@/lib/api";
import { Task } from "@/types";

export const taskService = {
    async getTasks(assignedTo?: string) {
        // Now supporting assignedTo filtering
        const data = await api.tasks.list(assignedTo ? { assignedTo } : undefined);
        return data as Task[];
    },

    async createTask(task: Omit<Task, 'id' | 'createdAt'>) {
        const data = await api.tasks.create(task);
        return data as Task;
    },

    async updateTask(id: string, updates: Partial<Task>) {
        const data = await api.tasks.update(id, updates);
        return data as Task;
    },

    async deleteTask(id: string) {
        await api.tasks.delete(id);
    },

    // Realtime subscription helper - Not implemented with Express backend yet
    subscribeToTasks(_callback: (payload: unknown) => void) {
        return { unsubscribe: () => { } };
    }
};
