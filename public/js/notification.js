const container = document.getElementById('notificationContainer');

function showNotification(message, notifClass = 'is-primary', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification ${notifClass} sliding-notification`;
    notification.innerHTML = `
        <button class="delete"></button>
        ${message}
    `;

    container.appendChild(notification);
    notification.querySelector('.delete').addEventListener('click', () => {
        removeNotification(notification);
    });

    if (duration > 0) {
        setTimeout(() => {
            removeNotification(notification);
        }, duration);
    }
}

function removeNotification(notification) {
    notification.classList.add('removing');
    setTimeout(() => {
        notification.remove();
    }, 300);
}
