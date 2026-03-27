/**
 * AvSocialOS v2 — Compliance Validators
 * All platform rules as executable validators.
 * Used by QA page, Calendar, Tasks, and Publishing Control Center.
 *
 * Location: 12_TECH_STACK_AND_AI > AvSocialOS > app > js > validators.js
 */

const Validators = (() => {
    'use strict';

    // =========================================================================
    // Rule Definitions
    // =========================================================================

    const RULES = [
        // ---- Hard Block Rules (blocking: true) ----
        {
            code: 'UTM_REQUIRED',
            description: 'Post must include utm_source, utm_medium, and utm_campaign',
            severity: 'error',
            platform: 'all',
            blocking: true,
            check: (post) => {
                const utm = post.utm || {};
                return !!(utm.utm_source && utm.utm_medium && utm.utm_campaign);
            }
        },
        {
            code: 'TINYURL_REQUIRED',
            description: 'Post must include a tinyurl tracking link',
            severity: 'error',
            platform: 'all',
            blocking: true,
            check: (post) => {
                return !!(post.tinyurl && post.tinyurl.trim().length > 0);
            }
        },
        {
            code: 'BROKER_REQUIRED',
            description: 'Listing posts must include broker_name',
            severity: 'error',
            platform: 'all',
            blocking: true,
            check: (post) => {
                if (post.content_type !== 'listing') return true;
                return !!(post.broker_name && post.broker_name.trim().length > 0);
            }
        },
        {
            code: 'LI_JETS_ONLY',
            description: 'LinkedIn listing posts are restricted to jets category only',
            severity: 'error',
            platform: 'linkedin',
            blocking: true,
            check: (post) => {
                if (post.content_type !== 'listing') return true;
                return post.category === 'jets';
            }
        },
        {
            code: 'FB_NO_JETS',
            description: 'Facebook listing posts cannot be jets category',
            severity: 'error',
            platform: 'facebook',
            blocking: true,
            check: (post) => {
                if (post.content_type !== 'listing') return true;
                return post.category !== 'jets';
            }
        },
        {
            code: 'IG_CAROUSEL_ONLY',
            description: 'Instagram posts must be carousel or video_reel format',
            severity: 'error',
            platform: 'instagram',
            blocking: true,
            check: (post) => {
                return post.content_type === 'carousel' || post.content_type === 'video_reel';
            }
        },
        {
            code: 'IG_HASHTAG_RANGE',
            description: 'Instagram posts must have 15-25 hashtags',
            severity: 'error',
            platform: 'instagram',
            blocking: true,
            check: (post) => {
                const hashtags = post.hashtags || [];
                return hashtags.length >= 15 && hashtags.length <= 25;
            }
        },
        {
            code: 'X_CHAR_LIMIT',
            description: 'Twitter/X posts must not exceed 280 characters',
            severity: 'error',
            platform: 'twitter',
            blocking: true,
            check: (post) => {
                const text = post.copy_text || '';
                return text.length <= 280;
            }
        },
        {
            code: 'IAN_CASEY_REVIEW',
            description: 'Posts assigned to Ian require Casey approval before publish',
            severity: 'error',
            platform: 'all',
            blocking: true,
            check: (post) => {
                if (post.assignee !== 'ian') return true;
                return post.approved_by_casey === true;
            }
        },

        // ---- Soft Warning Rules (blocking: false) ----
        {
            code: 'PILOT_MIX_LOW',
            description: 'Pilot-first posts should be at least 50% of total in period',
            severity: 'warning',
            platform: 'all',
            blocking: false,
            check: (post, context) => {
                // Individual post check — always passes. Use checkPilotFirstMix for batch.
                return true;
            }
        },
        {
            code: 'CADENCE_GAP',
            description: 'No posts scheduled in next 48 hours for this platform',
            severity: 'warning',
            platform: 'all',
            blocking: false,
            check: (post, context) => {
                // Individual post check — always passes. Use checkCadenceGaps for batch.
                return true;
            }
        },
        {
            code: 'TEMPLATE_FATIGUE',
            description: 'Template used more than 10 times in the last 30 days',
            severity: 'warning',
            platform: 'all',
            blocking: false,
            check: (post) => {
                if (!post.template_id || !post.template_use_count) return true;
                return post.template_use_count <= 10;
            }
        },
        {
            code: 'SERIES_UNLINKED',
            description: 'Post is missing series_id or campaign_id',
            severity: 'warning',
            platform: 'all',
            blocking: false,
            check: (post) => {
                return !!(post.series_id || post.campaign_id);
            }
        },
        {
            code: 'BROKER_PAGE_MISSING',
            description: 'Facebook listing post missing broker_page_url for tagging',
            severity: 'warning',
            platform: 'facebook',
            blocking: false,
            check: (post) => {
                if (post.content_type !== 'listing') return true;
                return !!(post.broker_page_url && post.broker_page_url.trim().length > 0);
            }
        }
    ];

    // =========================================================================
    // Internal Helpers
    // =========================================================================

    /**
     * Determine if a rule applies to a given post's platform.
     */
    function _ruleApplies(rule, post) {
        if (rule.platform === 'all') return true;
        const postPlatform = (post.platform || '').toLowerCase();
        return postPlatform === rule.platform;
    }

    /**
     * Run a set of rules against a post and return results.
     */
    function _runRules(rules, post, context) {
        const results = [];
        for (const rule of rules) {
            if (!_ruleApplies(rule, post)) continue;
            const passed = rule.check(post, context);
            results.push({
                rule_code: rule.code,
                description: rule.description,
                severity: rule.severity,
                blocking: rule.blocking,
                passed: !!passed
            });
        }
        return results;
    }

    // =========================================================================
    // Public API
    // =========================================================================

    /**
     * Run ALL applicable rules against a post.
     * @param {Object} post
     * @param {Object} [context] — optional batch context for aggregate rules
     * @returns {Array<{rule_code, description, severity, blocking, passed}>}
     */
    function validatePost(post, context) {
        if (!post) return [];
        return _runRules(RULES, post, context);
    }

    /**
     * Run only scheduling-blocking rules (UTM, tinyurl, broker).
     * @param {Object} post
     * @returns {{canSchedule: boolean, violations: Array}}
     */
    function validateForScheduling(post) {
        if (!post) return { canSchedule: false, violations: [] };

        const schedulingCodes = ['UTM_REQUIRED', 'TINYURL_REQUIRED', 'BROKER_REQUIRED'];
        const rules = RULES.filter(r => r.blocking && schedulingCodes.includes(r.code));
        const results = _runRules(rules, post);
        const violations = results.filter(r => !r.passed);

        return {
            canSchedule: violations.length === 0,
            violations
        };
    }

    /**
     * Run only publish-blocking rules (platform-specific format/content rules).
     * @param {Object} post
     * @returns {{canPublish: boolean, violations: Array}}
     */
    function validateForPublishing(post) {
        if (!post) return { canPublish: false, violations: [] };

        const publishCodes = [
            'UTM_REQUIRED', 'TINYURL_REQUIRED', 'BROKER_REQUIRED',
            'LI_JETS_ONLY', 'FB_NO_JETS', 'IG_CAROUSEL_ONLY',
            'IG_HASHTAG_RANGE', 'X_CHAR_LIMIT', 'IAN_CASEY_REVIEW'
        ];
        const rules = RULES.filter(r => r.blocking && publishCodes.includes(r.code));
        const results = _runRules(rules, post);
        const violations = results.filter(r => !r.passed);

        return {
            canPublish: violations.length === 0,
            violations
        };
    }

    /**
     * Run only approval-blocking rules.
     * @param {Object} post
     * @returns {{canApprove: boolean, violations: Array}}
     */
    function validateForApproval(post) {
        if (!post) return { canApprove: false, violations: [] };

        const approvalCodes = ['BROKER_REQUIRED', 'IAN_CASEY_REVIEW'];
        const rules = RULES.filter(r => r.blocking && approvalCodes.includes(r.code));
        const results = _runRules(rules, post);
        const violations = results.filter(r => !r.passed);

        return {
            canApprove: violations.length === 0,
            violations
        };
    }

    /**
     * Calculate pilot_first_flag percentage across a batch of posts.
     * @param {Array<Object>} posts
     * @returns {{percentage: number, belowTarget: boolean, target: number}}
     */
    function checkPilotFirstMix(posts) {
        if (!posts || posts.length === 0) {
            return { percentage: 0, belowTarget: true, target: 50 };
        }

        const pilotFirstCount = posts.filter(p => p.pilot_first_flag === true).length;
        const percentage = Math.round((pilotFirstCount / posts.length) * 100 * 10) / 10;

        return {
            percentage,
            belowTarget: percentage < 50,
            target: 50
        };
    }

    /**
     * Check if any active platform has no posts scheduled in the next 48 hours.
     * @param {Array<Object>} posts — posts with scheduled_at dates
     * @param {Object} channelStrategy — {linkedin: {active: true}, facebook: {active: true}, ...}
     * @returns {Array<{platform: string, gap_hours: number}>}
     */
    function checkCadenceGaps(posts, channelStrategy) {
        if (!channelStrategy) return [];

        const now = new Date();
        const cutoff = new Date(now.getTime() + 48 * 60 * 60 * 1000);
        const gaps = [];

        const activePlatforms = Object.keys(channelStrategy).filter(
            p => channelStrategy[p] && channelStrategy[p].active
        );

        for (const platform of activePlatforms) {
            const upcoming = (posts || []).filter(p => {
                if ((p.platform || '').toLowerCase() !== platform) return false;
                const scheduled = new Date(p.scheduled_at);
                return scheduled >= now && scheduled <= cutoff;
            });

            if (upcoming.length === 0) {
                // Find next scheduled post to compute gap
                const nextPost = (posts || [])
                    .filter(p => (p.platform || '').toLowerCase() === platform && new Date(p.scheduled_at) > now)
                    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))[0];

                const gapHours = nextPost
                    ? Math.round((new Date(nextPost.scheduled_at) - now) / (1000 * 60 * 60) * 10) / 10
                    : Infinity;

                gaps.push({ platform, gap_hours: gapHours });
            }
        }

        return gaps;
    }

    /**
     * Return all rules with metadata.
     * @returns {Array<Object>}
     */
    function getRules() {
        return RULES.map(r => ({
            code: r.code,
            description: r.description,
            severity: r.severity,
            platform: r.platform,
            blocking: r.blocking
        }));
    }

    /**
     * Return a single rule by its code.
     * @param {string} code
     * @returns {Object|null}
     */
    function getRuleByCode(code) {
        const rule = RULES.find(r => r.code === code);
        if (!rule) return null;
        return {
            code: rule.code,
            description: rule.description,
            severity: rule.severity,
            platform: rule.platform,
            blocking: rule.blocking
        };
    }

    // =========================================================================
    // Module Export
    // =========================================================================

    return {
        validatePost,
        validateForScheduling,
        validateForPublishing,
        validateForApproval,
        checkPilotFirstMix,
        checkCadenceGaps,
        getRules,
        getRuleByCode
    };
})();
