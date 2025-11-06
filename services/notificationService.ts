export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
    if (!("Notification" in window)) {
        console.log("This browser does not support desktop notification");
        return "denied";
    }
    return Notification.requestPermission();
};

export const showNotification = (title: string, options?: NotificationOptions): void => {
    if (Notification.permission === "granted") {
        new Notification(title, options);
    } else if (Notification.permission !== "denied") {
        requestNotificationPermission().then((permission) => {
            if (permission === "granted") {
                new Notification(title, options);
            }
        });
    }
};

export const playNotificationSound = (): void => {
    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (!audioContext) {
            console.warn("Browser does not support AudioContext");
            return;
        }

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4 note
        gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2); // Play for 200ms
    } catch (error) {
        console.error("Could not play notification sound:", error);
    }
};