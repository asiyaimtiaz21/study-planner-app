// ----- Navigation -----

function showSection(sectionId) {
  // Hide all sections
  document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
  // Deactivate all nav links
  document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));

  // Show the target section
  const target = document.getElementById(sectionId);
  if (target) target.classList.add('active');

  // Activate the matching nav link
  const activeLink = document.querySelector(`.nav-link[data-section="${sectionId}"]`);
  if (activeLink) activeLink.classList.add('active');
}

// Wire up nav links
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    showSection(link.dataset.section);
  });
});
