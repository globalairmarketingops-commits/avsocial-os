/* =====================================================================
   AvSocialOS — Hash-Based Router v2
   14 routes across 5 groups: command, operations, compliance,
   analytics, strategy, learning
   ===================================================================== */

const Router = (() => {
  const routes = {
    dashboard:   { label: 'Dashboard',              page: 'dashboard',        group: 'command' },
    calendar:    { label: 'Content Calendar',        page: 'calendar',         group: 'operations' },
    tasks:       { label: 'Tasks & Pipeline',        page: 'tasks',            group: 'operations' },
    canva:       { label: 'Canva & Assets',          page: 'canva-assets',     group: 'operations' },
    intake:      { label: 'Brief Intake',            page: 'intake',           group: 'operations' },
    publishing:  { label: 'Publishing Control',      page: 'publishing',       group: 'operations' },
    qa:          { label: 'QA & Compliance',         page: 'qa',              group: 'compliance' },
    performance: { label: 'Performance',             page: 'performance',      group: 'analytics' },
    competitor:  { label: 'Competitor Pulse',        page: 'competitor',       group: 'analytics' },
    utm:         { label: 'UTM Tracker',             page: 'utm-tracker',      group: 'analytics' },
    channel:     { label: 'Channel Strategy',        page: 'channel-strategy', group: 'strategy' },
    authority:   { label: 'Ian Authority',           page: 'ian-authority',    group: 'strategy' },
    library:     { label: 'Post Library',            page: 'library',          group: 'learning' },
    series:      { label: 'Series & Campaigns',      page: 'series',           group: 'learning' }
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
      canva:       () => typeof CanvaPage !== 'undefined' && CanvaPage.render(content),
      intake:      () => typeof IntakePage !== 'undefined' && IntakePage.render(content),
      publishing:  () => typeof PublishingPage !== 'undefined' && PublishingPage.render(content),
      qa:          () => typeof QAPage !== 'undefined' && QAPage.render(content),
      performance: () => typeof PerformancePage !== 'undefined' && PerformancePage.render(content),
      competitor:  () => typeof CompetitorPage !== 'undefined' && CompetitorPage.render(content),
      utm:         () => typeof UTMPage !== 'undefined' && UTMPage.render(content),
      channel:     () => typeof ChannelPage !== 'undefined' && ChannelPage.render(content),
      authority:   () => typeof IanAuthorityPage !== 'undefined' && IanAuthorityPage.render(content),
      library:     () => typeof LibraryPage !== 'undefined' && LibraryPage.render(content),
      series:      () => typeof SeriesPage !== 'undefined' && SeriesPage.render(content)
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
  function getRoutes() { return routes; }

  return { init, navigate, getCurrent, getRoutes };
})();
