import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { LocalNotifications } from '@capacitor/local-notifications';
import { FileOpener } from '@capacitor-community/file-opener';

/**
 * Saves a generated file. In the native app (APK) the WebView cannot trigger
 * browser downloads, so the file is written to the device's Documents folder
 * via the Filesystem plugin, and a "Download complete" notification is posted
 * in the notification bar — tapping it opens the file. In the browser it
 * falls back to a normal anchor-click download.
 *
 * Returns the native file URI when saved on device, or null in the browser.
 */
export async function saveFile(
  buffer: ArrayBuffer,
  fileName: string,
  mimeType: string,
): Promise<string | null> {
  if (Capacitor.isNativePlatform()) {
    const result = await Filesystem.writeFile({
      path: fileName,
      data: arrayBufferToBase64(buffer),
      directory: Directory.Documents,
      recursive: true,
    });
    await notifyDownloaded(fileName, result.uri, mimeType);
    return result.uri;
  }

  const blob = new Blob([buffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return null;
}

let tapListenerRegistered = false;

async function notifyDownloaded(fileName: string, uri: string, mimeType: string) {
  try {
    let perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      perm = await LocalNotifications.requestPermissions();
      if (perm.display !== 'granted') return;
    }

    if (!tapListenerRegistered) {
      tapListenerRegistered = true;
      LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
        const extra = event.notification.extra as { uri?: string; mimeType?: string } | null;
        if (extra?.uri) {
          FileOpener.open({ filePath: extra.uri, contentType: extra.mimeType }).catch(() => {});
        }
      });
    }

    await LocalNotifications.schedule({
      notifications: [{
        id: Date.now() % 2147483647,
        title: 'Download complete',
        body: `${fileName} saved to Documents — tap to open`,
        extra: { uri, mimeType },
      }],
    });
  } catch {
    // Notifications unavailable — the file is still saved; the toast covers feedback.
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000; // avoid call-stack limits on large files
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
