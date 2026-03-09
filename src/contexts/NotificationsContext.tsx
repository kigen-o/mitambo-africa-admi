import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    timestamp: Date;
    read: boolean;
}

interface NotificationsContextType {
    notifications: Notification[];
    unreadCount: number;
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clearNotification: (id: string) => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const useNotifications = () => {
    const context = useContext(NotificationsContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationsProvider');
    }
    return context;
};

export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
    const [notifications, setNotifications] = useState<Notification[]>([
        {
            id: '1',
            title: 'Welcome!',
            message: 'System updated successfully.',
            type: 'info',
            timestamp: new Date(),
            read: false,
        }
    ]);

    const unreadCount = notifications.filter(n => !n.read).length;

    const addNotification = (input: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
        const newNotification: Notification = {
            ...input,
            id: Date.now().toString(),
            timestamp: new Date(),
            read: false,
        };
        setNotifications(prev => [newNotification, ...prev]);
    };

    const markAsRead = (id: string) => {
        setNotifications(prev =>
            prev.map(n => (n.id === id ? { ...n, read: true } : n))
        );
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const clearNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    // Simulate random system notifications for demonstration
    useEffect(() => {
        const interval = setInterval(() => {
            // 10% chance to trigger a random notification every 30 seconds
            if (Math.random() > 0.9) {
                const types: ('info' | 'success' | 'warning' | 'error')[] = ['info', 'success', 'warning'];
                const titles = ['New Order', 'Payment Received', 'Server Update', 'New Client'];
                const messages = [
                    'A new quote request has been received.',
                    'Invoice #INV-2024-005 has been paid.',
                    'System maintenance scheduled for tonight.',
                    'New client registration completed.'
                ];

                const randIndex = Math.floor(Math.random() * titles.length);

                addNotification({
                    title: titles[randIndex],
                    message: messages[randIndex],
                    type: types[Math.floor(Math.random() * 3)]
                });
            }
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    return (
        <NotificationsContext.Provider value={{
            notifications,
            unreadCount,
            addNotification,
            markAsRead,
            markAllAsRead,
            clearNotification
        }}>
            {children}
        </NotificationsContext.Provider>
    );
};
