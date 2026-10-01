(() => {
  function applyWorkspaceEntry(){
    const params = new URLSearchParams(location.search);
    const workspace = params.get('workspace');
    if (!['pattern','doodle'].includes(workspace)) return;
    document.body.dataset.workspace = workspace;
    const typeInput = document.getElementById('projectTypeInput');
    if (typeInput) {
      typeInput.value = workspace;
      typeInput.dispatchEvent(new Event('change', { bubbles:true }));
      const field = typeInput.closest('.field');
      if (field) field.hidden = true;
    }
    const card = document.querySelector('.projectSetupCard');
    const heading = card?.querySelector('h2');
    const intro = card?.querySelector('.projectSetupIntro');
    if (heading) heading.textContent = workspace === 'pattern' ? 'New Pattern Project' : 'New Doodle';
    if (intro) intro.textContent = workspace === 'pattern'
      ? 'Set up a seamless pattern project, or open one you already started.'
      : 'Set up standalone transparent artwork, or open one you already started.';
    document.title = workspace === 'pattern' ? 'Sapiver Pattern Forge — Pattern' : 'Sapiver Pattern Forge — Doodle';
    const cleanPath = workspace === 'pattern' ? '/app/pattern/' : '/app/doodle/';
    if (location.pathname !== cleanPath) history.replaceState({workspace}, '', cleanPath);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(applyWorkspaceEntry, 0), {once:true});
  else setTimeout(applyWorkspaceEntry, 0);
})();
