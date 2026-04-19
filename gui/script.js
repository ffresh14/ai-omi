document.addEventListener('DOMContentLoaded', () => {
    // Interactive button effects
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            // Simple ripple effect or click confirmation
            const originalText = this.innerHTML;
            this.innerHTML = '<span style="opacity: 0.5">Processing...</span>';
            setTimeout(() => {
                this.innerHTML = originalText;
            }, 500);
        });
    });
    // Resizable Panes Logic
    const resizer = document.getElementById('resizer');
    const topPane = document.getElementById('ecg-top');
    const leftPanel = document.querySelector('.left-panel');
    
    let isResizing = false;

    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        resizer.classList.add('dragging');
        document.body.style.cursor = 'row-resize';
        // Prevent text selection while dragging
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        const containerRect = leftPanel.getBoundingClientRect();
        // Calculate new height in pixels rather than percentage to work perfectly in flexbox
        let newHeight = e.clientY - containerRect.top;
        
        // Constrain resizing (minimum 100px)
        if (newHeight < 100) newHeight = 100;
        if (newHeight > containerRect.height - 100) newHeight = containerRect.height - 100;
        
        // Force exact pixel height and remove flex behavior from top pane
        topPane.style.flex = 'none';
        topPane.style.height = `${newHeight}px`;
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            resizer.classList.remove('dragging');
            document.body.style.cursor = 'default';
        }
    });
});
