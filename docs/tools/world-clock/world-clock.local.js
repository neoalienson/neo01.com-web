// World Clock Tool
class WorldClock {
    constructor() {
        this.timezones = [
            'America/New_York',
            'Europe/London', 
            'Asia/Tokyo',
            'Australia/Sydney'
        ];
        this.clocksGrid = document.getElementById('clocks-grid');
        this.modal = document.getElementById('add-modal');
        this.timezoneSelect = document.getElementById('timezone-select');
        
        this.populateTimezoneSelect();
        this.renderClocks();
        this.startClock();
    }
    
    populateTimezoneSelect() {
        const commonTimezones = [
            'America/New_York', 'America/Los_Angeles', 'America/Chicago', 'America/Denver',
            'America/Toronto', 'America/Vancouver', 'America/Mexico_City', 'America/Sao_Paulo',
            'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Rome', 'Europe/Madrid',
            'Europe/Amsterdam', 'Europe/Stockholm', 'Europe/Moscow', 'Europe/Istanbul',
            'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Singapore', 'Asia/Seoul',
            'Asia/Mumbai', 'Asia/Dubai', 'Asia/Bangkok', 'Asia/Jakarta', 'Asia/Manila',
            'Australia/Sydney', 'Australia/Melbourne', 'Australia/Perth', 'Pacific/Auckland',
            'Africa/Cairo', 'Africa/Johannesburg', 'Africa/Lagos', 'Africa/Nairobi'
        ];
        
        this.timezoneSelect.innerHTML = '';
        commonTimezones.forEach(tz => {
            const option = document.createElement('option');
            option.value = tz;
            option.textContent = tz.replace('_', ' ');
            this.timezoneSelect.appendChild(option);
        });
    }
    
    renderClocks() {
        // Clear existing clocks except add button
        const addButton = this.clocksGrid.querySelector('.add-timezone');
        this.clocksGrid.innerHTML = '';
        
        this.timezones.forEach((timezone, index) => {
            const clockCard = this.createClockCard(timezone, index);
            this.clocksGrid.appendChild(clockCard);
        });
        
        this.clocksGrid.appendChild(addButton);
    }
    
    createClockCard(timezone, index) {
        const card = document.createElement('div');
        card.className = 'clock-card';
        card.innerHTML = `
            <div class="city-name">${this.getCityName(timezone)}</div>
            <div class="date-display" id="date-${index}"></div>
            <div class="time-display" id="time-${index}"></div>
            <div class="timezone-display">${timezone}</div>
            <button class="remove-btn" onclick="removeTimezone(${index})">Remove</button>
        `;
        return card;
    }
    
    getCityName(timezone) {
        const parts = timezone.split('/');
        return parts[parts.length - 1].replace('_', ' ');
    }
    
    updateClocks() {
        this.timezones.forEach((timezone, index) => {
            try {
                const now = new Date();
                const timeElement = document.getElementById(`time-${index}`);
                const dateElement = document.getElementById(`date-${index}`);
                
                if (timeElement && dateElement) {
                    const timeString = now.toLocaleTimeString('en-US', {
                        timeZone: timezone,
                        hour12: false,
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    
                    const dateString = now.toLocaleDateString('en-US', {
                        timeZone: timezone,
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                    
                    timeElement.textContent = timeString;
                    dateElement.textContent = dateString;
                }
            } catch (error) {
                console.error(`Error updating clock for ${timezone}:`, error);
            }
        });
    }
    
    startClock() {
        this.updateClocks();
        setInterval(() => this.updateClocks(), 1000);
    }
    
    addTimezone(timezone) {
        if (!this.timezones.includes(timezone)) {
            this.timezones.push(timezone);
            this.renderClocks();
        }
    }
    
    removeTimezone(index) {
        this.timezones.splice(index, 1);
        this.renderClocks();
    }
    
    showModal() {
        this.modal.style.display = 'block';
    }
    
    hideModal() {
        this.modal.style.display = 'none';
    }
}

// Global functions
function showAddModal() {
    window.worldClock.showModal();
}

function hideAddModal() {
    window.worldClock.hideModal();
}

function addTimezone() {
    const timezone = document.getElementById('timezone-select').value;
    window.worldClock.addTimezone(timezone);
    window.worldClock.hideModal();
}

function removeTimezone(index) {
    window.worldClock.removeTimezone(index);
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('add-modal');
    if (event.target === modal) {
        hideAddModal();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.worldClock = new WorldClock();
});