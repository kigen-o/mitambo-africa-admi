
export interface Profile {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    updated_at: string | null;
}

export interface CalendarEvent {
    id: string;
    title: string;
    start: string;
    end: string;
    category: 'meeting' | 'deadline' | 'milestone';
    description?: string;
}
