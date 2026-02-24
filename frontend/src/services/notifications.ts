// Notifications service - stub for now (notifications will be added in a future release)
// This allows the app to build without expo-notifications native module

export interface PushNotificationState {
    expoPushToken: string | null;
    notification: unknown | null;
}

// Register for push notifications and get the token
export async function registerForPushNotificationsAsync(): Promise<string | null> {
    console.log('Push notifications: Coming soon');
    return null;
}

// Send a local notification (for testing)
export async function sendLocalNotification(
    title: string,
    body: string,
    data?: Record<string, unknown>
): Promise<void> {
    console.log('Local notification (stub):', title, body);
}

// Send a match notification
export async function sendMatchNotification(matchName: string): Promise<void> {
    console.log('Match notification (stub):', matchName);
}

// Send a message notification
export async function sendMessageNotification(
    senderName: string,
    messagePreview: string
): Promise<void> {
    console.log('Message notification (stub):', senderName, messagePreview);
}

// Subscription stub
interface SubscriptionStub {
    remove: () => void;
}

// Add notification response listener
export function addNotificationResponseListener(
    callback: (response: unknown) => void
): SubscriptionStub {
    return { remove: () => {} };
}

// Add notification received listener
export function addNotificationReceivedListener(
    callback: (notification: unknown) => void
): SubscriptionStub {
    return { remove: () => {} };
}

// Remove notification listener
export function removeNotificationSubscription(
    subscription: SubscriptionStub
): void {
    subscription.remove();
}

// Get badge count
export async function getBadgeCount(): Promise<number> {
    return 0;
}

// Set badge count
export async function setBadgeCount(count: number): Promise<void> {
    // No-op
}

// Clear all notifications
export async function clearAllNotifications(): Promise<void> {
    // No-op
}

export default {
    registerForPushNotificationsAsync,
    sendLocalNotification,
    sendMatchNotification,
    sendMessageNotification,
    addNotificationResponseListener,
    addNotificationReceivedListener,
    removeNotificationSubscription,
    getBadgeCount,
    setBadgeCount,
    clearAllNotifications,
};
