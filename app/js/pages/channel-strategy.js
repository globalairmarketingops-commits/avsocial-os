/* =====================================================================
   AvSocialOS — Channel Strategy Playbook
   Platform-by-platform strategy cards
   ===================================================================== */

const ChannelPage = (() => {

  function render(container) {
    const platforms = SeedData.getPlatforms();

    const playbook = {
      linkedin: { audience: 'Corporate flight departments, HNW buyers, brokers', frequency: '3/day, stop 5:30 PM', formats: 'Single image, landscape listing, text authority posts', tone: 'Institutional, precise, performance-focused', goal: 'Jet buyer inquiries + broker engagement', kpis: 'CTR, dwell time, comments', rules: 'Jets ONLY. No piston listings.' },
      facebook: { audience: 'Owner-pilots, piston/turboprop buyers, aviation enthusiasts', frequency: '5/day, stretched to 7 PM', formats: 'Single image, carousel, event, video', tone: 'Conversational, emoji-rich, community-driven', goal: 'Piston/turbo inquiries + community engagement', kpis: 'Comments, shares, saves, clicks', rules: 'No jets. Heavy emoji. Tag broker pages.' },
      instagram: { audience: 'AvGeek community, aspirational aviation followers', frequency: '2\u20133/week', formats: '3-slide carousel, Reels, Stories', tone: 'Aspirational, visual-first', goal: 'Brand awareness + saves/shares', kpis: 'Saves, shares, carousel swipes', rules: 'Carousel only. 15\u201325 hashtags. Link in bio.' },
      twitter: { audience: 'Aviation news followers, industry watchers', frequency: '5/day', formats: 'Text + image, under 280 chars', tone: 'News-wire, factual, concise', goal: 'Real-time visibility + link clicks', kpis: 'Link clicks, retweets', rules: 'Under 280 chars. 1\u20133 hashtags max.' },
      youtube: { audience: 'Prospective buyers, aviation enthusiasts, researchers', frequency: '1/week', formats: 'Walkthroughs, cockpit tours, market analysis', tone: 'Educational, detailed, expert', goal: 'Long-form authority + search visibility', kpis: 'Watch time, subscribers, CTR', rules: 'All categories. Variety content.' },
      tiktok: { audience: 'Young aviation enthusiasts, AvGeek community', frequency: '1/day', formats: 'Short-form video, cockpit content, behind-the-scenes', tone: 'Casual, energetic, authentic', goal: 'Brand discovery + viral potential', kpis: 'Views, shares, follows', rules: 'AvGeek content focus. No listing copy.' }
    };

    container.innerHTML = `
      <div class="domain-page">
        <div class="section-header">
          <div class="section-title">Channel Strategy Playbook</div>
          <div class="section-subtitle">Platform-specific content strategy and posting rules</div>
        </div>

        ${Object.entries(playbook).map(([id, pb]) => {
          const p = platforms[id];
          return `
            <div class="channel-card" style="border-left-color:${p.color}">
              <div class="channel-card-header">
                <span class="platform-icon" style="background:${p.color};width:36px;height:36px;font-size:16px">${p.icon}</span>
                <div>
                  <div style="font-family:var(--ga-font-display);font-size:16px;font-weight:700;color:var(--ga-navy)">${p.name}</div>
                  <div style="font-size:12px;color:var(--ga-muted)">${p.cat}</div>
                </div>
              </div>
              <div class="channel-card-body">
                <div><div class="channel-field-label">Audience</div><div class="channel-field-value">${pb.audience}</div></div>
                <div><div class="channel-field-label">Frequency</div><div class="channel-field-value">${pb.frequency}</div></div>
                <div><div class="channel-field-label">Formats</div><div class="channel-field-value">${pb.formats}</div></div>
                <div><div class="channel-field-label">Tone</div><div class="channel-field-value">${pb.tone}</div></div>
                <div><div class="channel-field-label">Goal</div><div class="channel-field-value">${pb.goal}</div></div>
                <div><div class="channel-field-label">KPIs</div><div class="channel-field-value">${pb.kpis}</div></div>
              </div>
              <div style="margin-top:12px;padding:10px;background:var(--ga-off-white);border-radius:var(--ga-radius);font-size:12px">
                <strong style="color:var(--ga-red)">Rules:</strong> ${pb.rules}
              </div>
            </div>`;
        }).join('')}
      </div>`;
  }

  return { render };
})();
