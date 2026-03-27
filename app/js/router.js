/* =====================================================================
   AvSocialOS — Hash-Based Router
   Routes: #dashboard, #calendar, #tasks, #performance, #competitor,
           #canva, #channel, #utm, #authority
   ===================================================================== */

const Router = (() => {
  const routes = {
    dashboard:   { label: 'Dashboard',        page: 'dashboard',        group: 'command' },
    calendar:    { label: 'Content Calendar',  page: 'calendar',         group: 'operations' },
    tasks:       { label: 'Tasks & Pipeline',  page: 'tasks',            group: 'operations' },
    canva:       { label: 'Canva & Assets',    page: 'canva-assets',     group: 'operations' },
    performance: { label: 'Performance',       page: 'performance',      group: 'analytics' },
    competitor:  { label: 'Competitor Pulse',  page: 'competitor',       group: 'analytics' },
    utm:         { label: 'UTM Tracker',       page: 'utm-tracker',      group: 'analytics' },
    channel:     { label: 'Channel Strategy',  page: 'channel-strategy', group: 'strategy' },
    authority:   { label: 'Ian Authority',     page: 'ian-authority',    group: 'strategy' }
  };

  let currentRoute = 'dashboard';

  function init() {
    window.addEventListener('hashchange', handleRoute);
    if (!window.location.hash || !routes[window.location.hash.slice(1)]) {
      history.replaceState(null, '', '#dashboard');
    }
    handleRoute();
  }

  function handleRoute() {
    const hash = window.location.hash.slice(1) || 'dashboard';
    if (!routes[hash]) {
      history.replaceState(null, '', '#dashboard');
      currentRoute = 'dashboard';
    } else {
      currentRoute = hash;
    }
    updateNav();
    renderPage(currentRoute);
    Events.log('social_nav_click', { target_view: currentRoute });
  }

  function navigate(route) {
    window.location.hash = '#' + route;
  }

  function updateNav() {
    document.querySelectorAll('.nav-item[data-route]').forEach(item => {
      item.classList.toggle('active', item.dataset.route === currentRoute);
    });
  }

  function renderPage(route) {
    const content = document.getElementById('content-area');
    if (!content) return;
    content.innerHTML = '<div class="page-loading"><div class="skeleton-block"></div><div class="skeleton-block"></div></div>';

    const pageRenderers = {
      dashboard:   () => typeof SocialDashboard !== 'undefined' && SocialDashboard.render(content),
      calendar:    () => typeof CalendarPage !== 'undefined' && CalendarPage.render(content),
      tasks:       () => typeof TasksPage !== 'undefined' && TasksPage.render(content),
      performance: () => typeof PerformancePage !== 'undefined' && PerformancePage.render(content),
      competitor:  () => typeof CompetitorPage !== 'undefined' && CompetitorPage.render(content),
      canva:       () => typeof CanvaPage !== 'undefined' && CanvaPage.render(content),
      channel:     () => typeof ChannelPage !== 'undefined' && ChannelPage.render(content),
      utm:         () => typeof UTMPage !== 'undefined' && UTMPage.render(content),
      authority:   () => typeof IanAuthorityPage !== 'undefined' && IanAuthorityPage.render(content)
    };

    setTimeout(() => {
      if (pageRenderers[route]) {
        pageRenderers[route]();
      } else {
        content.innerHTML = Components.emptyState('&#128679;', `Page "${route}" is not yet built.`, 'This page will be available in a future sprint.');
      }
    }, 0);
  }

  function getCurrent() { return currentRoute; }

  return { init, navigate, getCurrent };
})();
