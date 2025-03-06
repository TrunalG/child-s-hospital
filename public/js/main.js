document.addEventListener('DOMContentLoaded', () => {
  // Optional: Client-side toggle on homepage for visual feedback
  const buttons = document.querySelectorAll('.availability-btn');
  buttons.forEach(button => {
    button.addEventListener('click', () => {
      // This is purely a UI toggle; actual state is controlled via admin page
      if (button.textContent.trim() === 'Available') {
        button.textContent = 'Not Available';
        button.classList.add('not-available');
      } else {
        button.textContent = 'Available';
        button.classList.remove('not-available');
      }
    });
  });
});
