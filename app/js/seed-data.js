/* =====================================================================
   AvSocialOS — Seed Data v2
   Static reference data and entity definitions.
   Data now comes from server JSON files — initialize() only marks ready.
   ===================================================================== */

const SeedData = (() => {

  const PLATFORMS = {
    linkedin:  { name: 'LinkedIn',    color: '#0A66C2', icon: 'in', rules: 'Jets ONLY \u00b7 3/day \u00b7 Stop 5:30 PM', daily: 3, cat: 'Jets Only' },
    facebook:  { name: 'Facebook',    color: '#1877F2', icon: 'f',  rules: 'No Jets \u00b7 5/day \u00b7 Stretched to 7 PM', daily: 5, cat: 'Piston/Turbo/Heli' },
    instagram: { name: 'Instagram',   color: '#E4405F', icon: 'ig', rules: 'AvGeek + Carousels \u00b7 2\u20133/week', daily: 0.4, cat: 'AvGeek Content' },
    twitter:   { name: 'X / Twitter', color: '#1DA1F2', icon: '\ud835\udd4f', rules: 'All listings \u00b7 <280 chars \u00b7 1\u20133 tags', daily: 5, cat: 'All Categories' },
    youtube:   { name: 'YouTube',     color: '#FF0000', icon: '\u25b6', rules: 'Variety \u2014 all categories', daily: 1, cat: 'All Content' },
    tiktok:    { name: 'TikTok',      color: '#69C9D0', icon: '\u266a', rules: 'AvGeek content focus', daily: 1, cat: 'AvGeek Content' }
  };

  const TEAM = [
    { id: 'casey',   name: 'Casey Jones',       initials: 'CJ', color: '#97CB00', lane: 'YELLOW' },
    { id: 'keaton',  name: 'Keaton Fenwick',    initials: 'KF', color: '#4782D3', lane: 'GREEN' },
    { id: 'sydney',  name: 'Sydney Eldridge',   initials: 'SE', color: '#8B5CF6', lane: 'EMAIL' },
    { id: 'jadda',   name: 'Jadda Tyree',       initials: 'JT', color: '#14B8A6', lane: 'CONTENT' },
    { id: 'abby',    name: 'Abby Sheets',       initials: 'AS', color: '#EC4899', lane: 'ARC' },
    { id: 'ian',     name: 'Ian Lumpp',         initials: 'IL', color: '#F59E0B', lane: 'AUTHORITY' },
    { id: 'clay',    name: 'Clay Martin',       initials: 'CM', color: '#6366F1', lane: 'COO' },
    { id: 'jeffrey', name: 'Jeffrey Carrithers', initials: 'JC', color: '#94A3B8', lane: 'CEO' }
  ];

  const CONTENT_TYPES = [
    { id: 'listing',       name: 'Listing Post',        icon: '\u2708\ufe0f' },
    { id: 'carousel',      name: '3-Slide Carousel',    icon: '\ud83d\udcf8' },
    { id: 'avgeek',        name: 'AvGeek Content',      icon: '\ud83d\udd27' },
    { id: 'fbo_month',     name: 'FBO of the Month',    icon: '\ud83c\udfe2' },
    { id: 'ramp_ramble',   name: 'Ramp Ramble',         icon: '\ud83c\udf99\ufe0f' },
    { id: 'brokernet',     name: 'BrokerNet Stats',     icon: '\ud83d\udcca' },
    { id: 'fuel_maps',     name: 'Fuel Price Maps',     icon: '\u26fd' },
    { id: 'game_winner',   name: 'Game Winner',         icon: '\ud83c\udfc6' },
    { id: 'event',         name: 'Event Content',       icon: '\ud83d\udcc5' },
    { id: 'ian_authority', name: 'Ian Authority Post',  icon: '\ud83d\udc64' },
    { id: 'video_reel',    name: 'Video / Reel',        icon: '\ud83c\udfac' },
    { id: 'pilot_content', name: 'Pilot-First Content', icon: '\ud83e\uddd1\u200d\u2708\ufe0f' }
  ];

  const CATEGORIES = [
    { id: 'jets',       name: 'Jets' },
    { id: 'piston',     name: 'Piston' },
    { id: 'turboprop',  name: 'Turboprop' },
    { id: 'helicopter', name: 'Helicopter' },
    { id: 'avgeek',     name: 'AvGeek' }
  ];

  const REQUEST_TYPES = [
    { id: 'listing',         name: 'Listing Promotion' },
    { id: 'event',           name: 'Event Content' },
    { id: 'broker_spotlight', name: 'Broker Spotlight' },
    { id: 'ian_authority',   name: 'Ian Authority' },
    { id: 'asset',           name: 'Asset/Design Request' },
    { id: 'general',         name: 'General' }
  ];

  const SERIES_TYPES = [
    { id: 'broker_spotlight',    name: 'Broker Spotlight' },
    { id: 'model_spotlight',     name: 'Model Spotlight' },
    { id: 'event_countdown',     name: 'Event Countdown' },
    { id: 'fuel_maps',           name: 'Fuel Price Maps' },
    { id: 'airport_spotlight',   name: 'Airport Spotlight' },
    { id: 'fbo_month',           name: 'FBO of the Month' },
    { id: 'ian_authority_clips', name: 'Ian Authority Clips' },
    { id: 'podcast_snippets',    name: 'Podcast Snippets' },
    { id: 'pilot_first_stories', name: 'Pilot-First Stories' }
  ];

  const CTA_TYPES = [
    { id: 'view_listing',   name: 'View Listing' },
    { id: 'contact_broker', name: 'Contact Broker' },
    { id: 'learn_more',     name: 'Learn More' },
    { id: 'get_quote',      name: 'Get a Quote' },
    { id: 'subscribe',      name: 'Subscribe' },
    { id: 'watch_video',    name: 'Watch Video' },
    { id: 'download',       name: 'Download' },
    { id: 'visit_site',     name: 'Visit Site' }
  ];

  const PIPELINE_STAGES = [
    { id: 'draft',       label: 'Draft',       color: 'var(--ga-muted)' },
    { id: 'in_review',   label: 'Casey Review', color: 'var(--ga-amber)' },
    { id: 'approved',    label: 'Approved',     color: 'var(--ga-blue)' },
    { id: 'in_progress', label: 'In Progress',  color: 'var(--ga-green)' },
    { id: 'published',   label: 'Published',    color: 'var(--ga-green-dark)' }
  ];

  const PILOT_FIRST_TYPES = ['pilot_content', 'avgeek', 'fbo_month', 'ramp_ramble', 'fuel_maps'];

  // ---- Initialize ----
  // Data now comes from server JSON files. Just mark as ready.
  function initialize() {
    if (Store.isInitialized()) return;
    Store.markInitialized();
  }

  // ---- Getters ----
  function getPlatforms() { return PLATFORMS; }
  function getTeam() { return TEAM; }
  function getContentTypes() { return CONTENT_TYPES; }
  function getCategories() { return CATEGORIES; }
  function getRequestTypes() { return REQUEST_TYPES; }
  function getSeriesTypes() { return SERIES_TYPES; }
  function getCtaTypes() { return CTA_TYPES; }
  function getPipelineStages() { return PIPELINE_STAGES; }
  function isPilotFirstType(contentType) { return PILOT_FIRST_TYPES.includes(contentType); }

  return {
    initialize,
    getPlatforms, getTeam, getContentTypes,
    getCategories, getRequestTypes, getSeriesTypes,
    getCtaTypes, getPipelineStages, isPilotFirstType
  };
})();
