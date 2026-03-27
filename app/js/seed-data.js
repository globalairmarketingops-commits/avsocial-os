/* =====================================================================
   AvSocialOS — Seed Data
   First-launch initialization for all social operations data.
   Ported from SocialMediaHub.jsx with AvOS conventions.
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
    { id: 'casey',  name: 'Casey Jones',     initials: 'CJ', color: '#97CB00', lane: 'YELLOW' },
    { id: 'keaton', name: 'Keaton Fenwick',  initials: 'KF', color: '#4782D3', lane: 'GREEN' },
    { id: 'sydney', name: 'Sydney Eldridge', initials: 'SE', color: '#8B5CF6', lane: 'EMAIL' },
    { id: 'jadda',  name: 'Jadda Tyree',     initials: 'JT', color: '#14B8A6', lane: 'CONTENT' },
    { id: 'abby',   name: 'Abby Sheets',     initials: 'AS', color: '#EC4899', lane: 'ARC' },
    { id: 'ian',    name: 'Ian Lumpp',       initials: 'IL', color: '#F59E0B', lane: 'AUTHORITY' }
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

  function initialize() {
    if (Store.isInitialized()) return;

    // Platform metrics
    Store.set('social_metrics', {
      linkedin:  { followers: 4820, change: 3.2, engagement: 4.7, reach: 28400, impressions: 42100, posts: 62, clicks: 1840, top: '2024 Gulfstream G650ER', ctr: 4.37 },
      facebook:  { followers: 12400, change: 1.8, engagement: 3.2, reach: 45200, impressions: 68300, posts: 104, clicks: 2100, top: '1978 Cessna 182 Skylane', ctr: 3.07 },
      instagram: { followers: 3200, change: 5.1, engagement: 6.8, reach: 18900, impressions: 31200, posts: 12, clicks: 420, top: 'Ramp Ramble Feb', ctr: 1.35 },
      twitter:   { followers: 2100, change: 0.9, engagement: 1.4, reach: 15600, impressions: 22800, posts: 98, clicks: 310, top: 'Breaking: Citation X Price Drop', ctr: 1.36 },
      youtube:   { followers: 340, change: 8.2, engagement: 2.1, reach: 4200, impressions: 6800, posts: 4, clicks: 180, top: 'Inside the King Air 350', ctr: 2.65 },
      tiktok:    { followers: 180, change: 12.4, engagement: 8.2, reach: 8400, impressions: 14200, posts: 8, clicks: 90, top: 'Cockpit Tour: Pilatus PC-12', ctr: 0.63 }
    });

    // Trend data
    Store.set('social_trends', [
      { w: 'W1 Feb', linkedin: 1200, facebook: 3400, instagram: 1800, twitter: 900, youtube: 400, tiktok: 600 },
      { w: 'W2 Feb', linkedin: 1400, facebook: 3200, instagram: 2100, twitter: 850, youtube: 350, tiktok: 800 },
      { w: 'W3 Feb', linkedin: 1600, facebook: 3800, instagram: 1900, twitter: 920, youtube: 500, tiktok: 1100 },
      { w: 'W4 Feb', linkedin: 1800, facebook: 4100, instagram: 2400, twitter: 1000, youtube: 600, tiktok: 1400 },
      { w: 'W1 Mar', linkedin: 2000, facebook: 4500, instagram: 2800, twitter: 1100, youtube: 700, tiktok: 1800 },
      { w: 'W2 Mar', linkedin: 2200, facebook: 4200, instagram: 3100, twitter: 1050, youtube: 800, tiktok: 2100 },
      { w: 'W3 Mar', linkedin: 2400, facebook: 4800, instagram: 2900, twitter: 1200, youtube: 900, tiktok: 2400 }
    ]);

    // Heatmap data
    Store.set('social_heatmap', [
      { type: 'Listing',     linkedin: 3.8, facebook: 2.9, instagram: 4.2, twitter: 1.1 },
      { type: 'AvGeek',      linkedin: 2.1, facebook: 4.5, instagram: 8.4, twitter: 1.8 },
      { type: 'Event',       linkedin: 5.2, facebook: 3.8, instagram: 6.1, twitter: 2.2 },
      { type: 'Ramp Ramble', linkedin: 3.4, facebook: 5.1, instagram: 7.8, twitter: 1.5 },
      { type: 'Authority',   linkedin: 6.8, facebook: 2.2, instagram: 3.1, twitter: 1.9 },
      { type: 'Video/Reel',  linkedin: 4.1, facebook: 4.8, instagram: 9.2, twitter: 0.8 }
    ]);

    // Calendar items
    Store.set('social_calendar', [
      { id: 1, date: '2026-03-18', time: '08:00', platform: 'linkedin', type: 'listing', title: '2024 Citation CJ4 Gen2', assignee: 'keaton', status: 'published', broker: 'Jet Access' },
      { id: 2, date: '2026-03-18', time: '09:30', platform: 'facebook', type: 'listing', title: '1979 Piper Cherokee 235', assignee: 'keaton', status: 'published', broker: 'Southeast Aero' },
      { id: 3, date: '2026-03-18', time: '12:00', platform: 'instagram', type: 'carousel', title: 'Top 5 Pistons Under $200K', assignee: 'keaton', status: 'scheduled' },
      { id: 4, date: '2026-03-19', time: '08:00', platform: 'linkedin', type: 'ian_authority', title: 'NBAA SDC Preview', assignee: 'ian', status: 'in_review' },
      { id: 5, date: '2026-03-19', time: '10:00', platform: 'facebook', type: 'listing', title: '2022 Beechcraft King Air 260', assignee: 'keaton', status: 'approved' },
      { id: 6, date: '2026-03-19', time: '14:00', platform: 'twitter', type: 'listing', title: 'Price Drop: Citation X+', assignee: 'keaton', status: 'scheduled' },
      { id: 7, date: '2026-03-20', time: '08:30', platform: 'linkedin', type: 'listing', title: '2019 Gulfstream G280', assignee: 'keaton', status: 'draft' },
      { id: 8, date: '2026-03-20', time: '11:00', platform: 'facebook', type: 'event', title: 'NBAA SDC Countdown', assignee: 'keaton', status: 'approved' },
      { id: 9, date: '2026-03-20', time: '15:00', platform: 'tiktok', type: 'avgeek', title: 'Cockpit Tour: PC-12', assignee: 'keaton', status: 'draft' },
      { id: 10, date: '2026-03-21', time: '08:00', platform: 'linkedin', type: 'listing', title: '2023 Phenom 300E', assignee: 'keaton', status: 'draft' },
      { id: 11, date: '2026-03-21', time: '10:00', platform: 'youtube', type: 'video_reel', title: 'Inside the King Air 350', assignee: 'keaton', status: 'draft' }
    ]);

    // Tasks
    Store.set('social_tasks', [
      { id: 1, title: 'Build NBAA SDC social countdown', assignee: 'keaton', tier: 'T1', status: 'in_progress', due: 'Mar 20', tags: ['event', 'nbaa'] },
      { id: 2, title: 'Produce 5 AvGeek TikTok scripts', assignee: 'keaton', tier: 'T2', status: 'draft', due: 'Mar 22', tags: ['tiktok', 'avgeek'] },
      { id: 3, title: 'March FBO of the Month graphic', assignee: 'abby', tier: 'T2', status: 'draft', due: 'Mar 28', tags: ['fbo', 'recurring'] },
      { id: 4, title: 'Ian LinkedIn: NBAA SDC preview', assignee: 'ian', tier: 'T1', status: 'in_review', due: 'Mar 19', tags: ['linkedin', 'authority'] },
      { id: 5, title: 'YouTube channel banner update', assignee: 'keaton', tier: 'T3', status: 'draft', due: 'Mar 25', tags: ['youtube', 'brand'] },
      { id: 6, title: 'IG carousel: Top 5 Piston <$200K', assignee: 'keaton', tier: 'T2', status: 'approved', due: 'Mar 21', tags: ['instagram', 'avgeek'] },
      { id: 7, title: 'Ramp Ramble March capture plan', assignee: 'abby', tier: 'T2', status: 'draft', due: 'Mar 24', tags: ['ramp_ramble'] },
      { id: 8, title: 'Set up TikTok Business account', assignee: 'casey', tier: 'T1', status: 'in_progress', due: 'Mar 19', tags: ['tiktok', 'setup'] }
    ]);

    // UTM tracking data
    Store.set('social_utm', [
      { post: '2025 Citation CJ4 Gen2', platform: 'LinkedIn', clicks: 142, sessions: 118, qi: 3, date: 'Mar 14' },
      { post: '1979 Piper Cherokee', platform: 'Facebook', clicks: 98, sessions: 72, qi: 1, date: 'Mar 13' },
      { post: 'Ramp Ramble: KLOU', platform: 'Instagram', clicks: 64, sessions: 48, qi: 0, date: 'Mar 12' },
      { post: 'Beechcraft Bonanza A36', platform: 'Facebook', clicks: 87, sessions: 65, qi: 2, date: 'Mar 11' },
      { post: 'Gulfstream G280 Market', platform: 'LinkedIn', clicks: 210, sessions: 178, qi: 5, date: 'Mar 10' },
      { post: 'Cockpit Tour: PC-12', platform: 'TikTok', clicks: 44, sessions: 28, qi: 0, date: 'Mar 10' }
    ]);

    // Competitor data (Controller.com)
    Store.set('social_competitor', {
      linkedin:  { followers: 8200, postsWk: 4, eng: 1.2, note: 'Listing reposts only' },
      facebook:  { followers: 22100, postsWk: 8, eng: 0.8, note: 'Auto-posted listings' },
      instagram: { followers: 1400, postsWk: 1, eng: 0.6, note: 'Minimal \u2014 no strategy' },
      twitter:   { followers: 3100, postsWk: 3, eng: 0.4, note: 'Auto-posted listings' },
      youtube:   { followers: 0, postsWk: 0, eng: 0, note: 'No presence' },
      tiktok:    { followers: 0, postsWk: 0, eng: 0, note: 'No presence' }
    });

    // Ian authority data
    Store.set('social_ian', {
      posts: 8, eng: 6.8, imp: 14200, freq: '2.3/wk', growth: 4.1,
      comments: 18, shares: 12,
      top: 'NBAA Top 40 Reflection: Building Aviation\'s Next Chapter'
    });

    // Canva templates
    Store.set('social_templates', [
      { id: 1, name: 'Single Image Feed', desc: '1080\u00d71080. Aircraft ~65%, navy panel.', use: 'FB/LI', status: 'live' },
      { id: 2, name: '3-Slide Carousel', desc: '1080\u00d71080 \u00d73. Ext\u2192Int\u2192CTA.', use: 'IG/FB', status: 'live' },
      { id: 3, name: 'LinkedIn Listing', desc: '1200\u00d7628 landscape.', use: 'LI', status: 'live' },
      { id: 4, name: 'X/Twitter Listing', desc: '1200\u00d7675 card preview.', use: 'X', status: 'live' },
      { id: 5, name: 'Event Feed', desc: '1080\u00d71080. WE\'LL BE THERE.', use: 'All', status: 'live' },
      { id: 6, name: 'Event Story', desc: '1080\u00d71920 IG/FB Stories.', use: 'IG/FB', status: 'live' },
      { id: 7, name: 'Event Countdown', desc: '1080\u00d71080 countdown.', use: 'All', status: 'live' },
      { id: 8, name: 'Campaign Hero', desc: '1080\u00d71080 spotlights.', use: 'All', status: 'live' },
      { id: 9, name: 'Campaign Landscape', desc: '1200\u00d7628 LI/FB ads.', use: 'LI/FB', status: 'live' },
      { id: 10, name: 'Stats Grid', desc: '1080\u00d71080 infographics.', use: 'IG/FB', status: 'live' },
      { id: 11, name: 'Ramp Ramble Card', desc: '1080\u00d71080 monthly.', use: 'All', status: 'live' },
      { id: 12, name: 'Ramp Ramble IG', desc: '1080\u00d71080 photo+blue.', use: 'IG', status: 'live' },
      { id: 13, name: 'FBO of the Month', desc: '1080\u00d71080 FBO spotlight.', use: 'All', status: 'live' },
      { id: 14, name: 'Display Banners', desc: '3 sizes, Simpli.fi/GDN.', use: 'Display', status: 'live' },
      { id: 15, name: 'Email Banner', desc: '600\u00d7200, AvBlast.', use: 'Email', status: 'live' },
      { id: 16, name: 'Stats Landscape', desc: '1200\u00d7628 LI stats.', use: 'LI', status: 'live' },
      { id: 17, name: 'Wanted Post', desc: '1080\u00d71080 WANTED badge.', use: 'All', status: 'needs_build' },
      { id: 18, name: 'Sold Post', desc: '1080\u00d71080 SOLD badge.', use: 'All', status: 'needs_build' },
      { id: 19, name: 'New FBO Client', desc: '1080\u00d71080 WELCOME.', use: 'All', status: 'needs_build' },
      { id: 20, name: 'News Template', desc: '1080\u00d71080 AIRMAIL.', use: 'All', status: 'needs_build' },
      { id: 21, name: 'Hangar Talk', desc: '1080\u00d71080 fun facts.', use: 'IG/FB', status: 'needs_build' },
      { id: 22, name: 'Cleared to Jam', desc: '1080\u00d71350 playlist.', use: 'IG', status: 'needs_build' },
      { id: 23, name: 'The Stack', desc: '1080\u00d71080 avionics.', use: 'IG', status: 'needs_build' },
      { id: 24, name: 'Holiday Post', desc: '1080\u00d71080 seasonal.', use: 'All', status: 'needs_build' },
      { id: 25, name: 'Holiday Story', desc: '1080\u00d71920 vertical.', use: 'IG/FB', status: 'needs_build' }
    ]);

    Store.markInitialized();
  }

  function getPlatforms() { return PLATFORMS; }
  function getTeam() { return TEAM; }
  function getContentTypes() { return CONTENT_TYPES; }

  return { initialize, getPlatforms, getTeam, getContentTypes };
})();
