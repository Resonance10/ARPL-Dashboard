// Service Worker for ARPL Approval Dashboard
self.addEventListener('push', (event) => {
  let data = { title: 'New Notification', body: 'You have a new update.', url: '/' };
  
  try {
    if (event.data) data = event.data.json();
  } catch (e) {
    console.error('Push data parse error:', e);
  }
  
  const options = {
    body: data.body,
    icon: '/AR LOGO.png', 
    badge: '/AR LOGO.png', // Small monochrome icon for the status bar
    vibrate: [100, 50, 100],
    tag: 'approval-notification', 
    renotify: true,
    data: { 
      url: data.url || '/',
      timestamp: Date.now()
    },
    actions: [
      { action: 'open', title: 'View Details' },
      { action: 'close', title: 'Dismiss' }
    ],
    requireInteraction: true // Keeps notification visible until user acts
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;

  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then((windowClients) => {
    let matchingClient = null;
    // Check if the dashboard is already open
    for (let i = 0; i < windowClients.length; i++) {
      const windowClient = windowClients[i];
      // Focus if the URL matches or if we are just on the dashboard
      if (windowClient.url === urlToOpen || windowClient.url === self.location.origin + '/') {
        matchingClient = windowClient;
        break;
      }
    }

    if (matchingClient) {
      return matchingClient.focus().then(client => {
        if ('navigate' in client && client.url !== urlToOpen) return client.navigate(urlToOpen);
      });
    }
    return clients.openWindow(urlToOpen);
  });

  event.waitUntil(promiseChain);
});
