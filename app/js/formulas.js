/**
 * AvSocialOS v2 — Standardized Formulas Engine
 * Client-side computation of all 14 standardized formulas.
 * Can compute from local data arrays or fetch from server API.
 *
 * Location: 12_TECH_STACK_AND_AI > AvSocialOS > app > js > formulas.js
 */

const Formulas = (() => {
    'use strict';

    // =========================================================================
    // Helper Utilities
    // =========================================================================

    function _pct(numerator, denominator) {
        if (!denominator || denominator === 0) return 0;
        return Math.round((numerator / denominator) * 100 * 10) / 10;
    }

    function _rate(numerator, denominator) {
        if (!denominator || denominator === 0) return 0;
        return Math.round((numerator / denominator) * 1000) / 1000;
    }

    // =========================================================================
    // Formula 1: Publish-Ready Rate
    // =========================================================================

    /**
     * Posts with all readiness checks passed / posts due within window.
     * @param {Array<Object>} posts — each post should have readiness_passed (bool) and due_within_window (bool)
     * @returns {{rate: number, ready: number, total: number, percentage: number}}
     */
    function publishReadyRate(posts) {
        if (!posts || posts.length === 0) {
            return { rate: 0, ready: 0, total: 0, percentage: 0 };
        }

        const dueInWindow = posts.filter(p => p.due_within_window === true);
        const ready = dueInWindow.filter(p => p.readiness_passed === true);

        return {
            rate: _rate(ready.length, dueInWindow.length),
            ready: ready.length,
            total: dueInWindow.length,
            percentage: _pct(ready.length, dueInWindow.length)
        };
    }

    // =========================================================================
    // Formula 2: On-Time Publish Rate
    // =========================================================================

    /**
     * Posts published on or before scheduled_at / total scheduled.
     * @param {Array<Object>} posts — each has scheduled_at
     * @param {Array<Object>} publishStatuses — each has post_id, published_at
     * @returns {{rate: number, onTime: number, total: number, percentage: number}}
     */
    function onTimePublishRate(posts, publishStatuses) {
        if (!posts || posts.length === 0) {
            return { rate: 0, onTime: 0, total: 0, percentage: 0 };
        }

        const statusMap = {};
        (publishStatuses || []).forEach(s => { statusMap[s.post_id] = s; });

        const scheduled = posts.filter(p => p.scheduled_at);
        let onTime = 0;

        for (const post of scheduled) {
            const status = statusMap[post.id || post.post_id];
            if (status && status.published_at) {
                if (new Date(status.published_at) <= new Date(post.scheduled_at)) {
                    onTime++;
                }
            }
        }

        return {
            rate: _rate(onTime, scheduled.length),
            onTime,
            total: scheduled.length,
            percentage: _pct(onTime, scheduled.length)
        };
    }

    // =========================================================================
    // Formula 3: Blocked Rate
    // =========================================================================

    /**
     * Posts with blocking violations / active posts.
     * @param {Array<Object>} posts
     * @param {Array<Object>} violations — each has post_id, blocking (bool)
     * @returns {{rate: number, blocked: number, total: number, percentage: number}}
     */
    function blockedRate(posts, violations) {
        if (!posts || posts.length === 0) {
            return { rate: 0, blocked: 0, total: 0, percentage: 0 };
        }

        const blockedPostIds = new Set();
        (violations || []).forEach(v => {
            if (v.blocking) blockedPostIds.add(v.post_id);
        });

        const activePosts = posts.filter(p => p.status !== 'archived' && p.status !== 'cancelled');
        const blockedCount = activePosts.filter(p => blockedPostIds.has(p.id || p.post_id)).length;

        return {
            rate: _rate(blockedCount, activePosts.length),
            blocked: blockedCount,
            total: activePosts.length,
            percentage: _pct(blockedCount, activePosts.length)
        };
    }

    // =========================================================================
    // Formula 4: Pilot-First Mix
    // =========================================================================

    /**
     * Posts with pilot_first_flag / total posts.
     * @param {Array<Object>} posts
     * @returns {{rate: number, pilotFirst: number, total: number, percentage: number, belowTarget: boolean}}
     */
    function pilotFirstMix(posts) {
        if (!posts || posts.length === 0) {
            return { rate: 0, pilotFirst: 0, total: 0, percentage: 0, belowTarget: true };
        }

        const pilotFirst = posts.filter(p => p.pilot_first_flag === true).length;
        const percentage = _pct(pilotFirst, posts.length);

        return {
            rate: _rate(pilotFirst, posts.length),
            pilotFirst,
            total: posts.length,
            percentage,
            belowTarget: percentage < 50
        };
    }

    // =========================================================================
    // Formula 5: Stage SLA Compliance
    // =========================================================================

    /**
     * Tasks completed within SLA / total per stage.
     * @param {Array<Object>} tasks — each has stage, completed_at, sla_deadline
     * @returns {{overall: number, byStage: Object}}
     */
    function stageSlaCompliance(tasks) {
        if (!tasks || tasks.length === 0) {
            return { overall: 0, byStage: {} };
        }

        const stages = {};
        let totalCompliant = 0;
        let totalTasks = 0;

        for (const task of tasks) {
            const stage = task.stage || 'unknown';
            if (!stages[stage]) {
                stages[stage] = { compliant: 0, total: 0, percentage: 0 };
            }
            stages[stage].total++;
            totalTasks++;

            if (task.completed_at && task.sla_deadline) {
                if (new Date(task.completed_at) <= new Date(task.sla_deadline)) {
                    stages[stage].compliant++;
                    totalCompliant++;
                }
            }
        }

        for (const stage of Object.keys(stages)) {
            stages[stage].percentage = _pct(stages[stage].compliant, stages[stage].total);
        }

        return {
            overall: _pct(totalCompliant, totalTasks),
            byStage: stages
        };
    }

    // =========================================================================
    // Formula 6: Cadence Compliance
    // =========================================================================

    /**
     * Actual posts / target by platform.
     * @param {Array<Object>} posts — each has platform
     * @param {Object} channelStrategy — {linkedin: {target: 5}, facebook: {target: 7}, ...}
     * @returns {{overall: number, byPlatform: Object}}
     */
    function cadenceCompliance(posts, channelStrategy) {
        if (!channelStrategy) {
            return { overall: 0, byPlatform: {} };
        }

        const byPlatform = {};
        let totalActual = 0;
        let totalTarget = 0;

        for (const [platform, config] of Object.entries(channelStrategy)) {
            const target = config.target || 0;
            const actual = (posts || []).filter(
                p => (p.platform || '').toLowerCase() === platform
            ).length;

            byPlatform[platform] = {
                actual,
                target,
                rate: _pct(actual, target)
            };

            totalActual += actual;
            totalTarget += target;
        }

        return {
            overall: _pct(totalActual, totalTarget),
            byPlatform
        };
    }

    // =========================================================================
    // Formula 7: Rule Compliance
    // =========================================================================

    /**
     * Compliant posts / total by platform.
     * @param {Array<Object>} posts
     * @param {Array<Object>} violations — each has post_id, blocking (bool)
     * @returns {{overall: number, byPlatform: Object}}
     */
    function ruleCompliance(posts, violations) {
        if (!posts || posts.length === 0) {
            return { overall: 0, byPlatform: {} };
        }

        const violatingPostIds = new Set();
        (violations || []).forEach(v => {
            if (v.blocking) violatingPostIds.add(v.post_id);
        });

        const byPlatform = {};
        let totalCompliant = 0;

        const platforms = [...new Set(posts.map(p => (p.platform || 'unknown').toLowerCase()))];

        for (const platform of platforms) {
            const platformPosts = posts.filter(p => (p.platform || '').toLowerCase() === platform);
            const compliant = platformPosts.filter(p => !violatingPostIds.has(p.id || p.post_id)).length;

            byPlatform[platform] = {
                compliant,
                total: platformPosts.length,
                percentage: _pct(compliant, platformPosts.length)
            };

            totalCompliant += compliant;
        }

        return {
            overall: _pct(totalCompliant, posts.length),
            byPlatform
        };
    }

    // =========================================================================
    // Formula 8: Template Performance
    // =========================================================================

    /**
     * Compute weighted score for templates and return sorted.
     * Score = (engagement_rate * 0.4) + (qi_yield * 0.3) + (session_rate * 0.2) + (reuse_count_norm * 0.1)
     * @param {Array<Object>} templates — each has template_id, name, engagement_rate, qi_yield, session_rate, use_count
     * @returns {Array<{template_id, name, score}>}
     */
    function templatePerformance(templates) {
        if (!templates || templates.length === 0) return [];

        const maxUseCount = Math.max(...templates.map(t => t.use_count || 0), 1);

        const scored = templates.map(t => {
            const engRate = t.engagement_rate || 0;
            const qiYield = t.qi_yield || 0;
            const sessionRate = t.session_rate || 0;
            const reuseNorm = (t.use_count || 0) / maxUseCount;

            const score = Math.round(
                (engRate * 0.4 + qiYield * 0.3 + sessionRate * 0.2 + reuseNorm * 0.1) * 1000
            ) / 1000;

            return {
                template_id: t.template_id,
                name: t.name,
                score
            };
        });

        scored.sort((a, b) => b.score - a.score);
        return scored;
    }

    // =========================================================================
    // Formula 9: Post-to-Session Rate
    // =========================================================================

    /**
     * Sessions / posts.
     * @param {Object} utmTracking — {sessions: number, posts: number}
     * @returns {{rate: number, sessions: number, posts: number}}
     */
    function postToSessionRate(utmTracking) {
        if (!utmTracking) return { rate: 0, sessions: 0, posts: 0 };

        const sessions = utmTracking.sessions || 0;
        const posts = utmTracking.posts || 0;

        return {
            rate: _rate(sessions, posts),
            sessions,
            posts
        };
    }

    // =========================================================================
    // Formula 10: Post-to-QI Yield
    // =========================================================================

    /**
     * QIs / posts.
     * @param {Object} utmTracking — {qi: number, posts: number}
     * @returns {{rate: number, qi: number, posts: number}}
     */
    function postToQiYield(utmTracking) {
        if (!utmTracking) return { rate: 0, qi: 0, posts: 0 };

        const qi = utmTracking.qi || 0;
        const posts = utmTracking.posts || 0;

        return {
            rate: _rate(qi, posts),
            qi,
            posts
        };
    }

    // =========================================================================
    // Formula 11: Parameter Integrity
    // =========================================================================

    /**
     * Valid UTMs / total.
     * @param {Object} utmTracking — {valid: number, total: number}
     * @returns {{rate: number, valid: number, total: number, percentage: number}}
     */
    function parameterIntegrity(utmTracking) {
        if (!utmTracking) return { rate: 0, valid: 0, total: 0, percentage: 0 };

        const valid = utmTracking.valid || 0;
        const total = utmTracking.total || 0;

        return {
            rate: _rate(valid, total),
            valid,
            total,
            percentage: _pct(valid, total)
        };
    }

    // =========================================================================
    // Formula 12: Series Completion
    // =========================================================================

    /**
     * Completed / planned per series.
     * @param {Array<Object>} series — each has series_id, name, completed, planned
     * @returns {{overall: number, bySeries: Array}}
     */
    function seriesCompletion(series) {
        if (!series || series.length === 0) {
            return { overall: 0, bySeries: [] };
        }

        let totalCompleted = 0;
        let totalPlanned = 0;

        const bySeries = series.map(s => {
            const completed = s.completed || 0;
            const planned = s.planned || 0;
            totalCompleted += completed;
            totalPlanned += planned;

            return {
                series_id: s.series_id,
                name: s.name,
                completed,
                planned,
                percentage: _pct(completed, planned)
            };
        });

        return {
            overall: _pct(totalCompleted, totalPlanned),
            bySeries
        };
    }

    // =========================================================================
    // Formula 13: Learning Coverage
    // =========================================================================

    /**
     * Posts with learnings / total published.
     * @param {Array<Object>} posts — published posts
     * @param {Array<Object>} learnings — each has post_id
     * @returns {{rate: number, covered: number, total: number, percentage: number}}
     */
    function learningCoverage(posts, learnings) {
        if (!posts || posts.length === 0) {
            return { rate: 0, covered: 0, total: 0, percentage: 0 };
        }

        const publishedPosts = posts.filter(p => p.status === 'published');
        const learningPostIds = new Set((learnings || []).map(l => l.post_id));
        const covered = publishedPosts.filter(p => learningPostIds.has(p.id || p.post_id)).length;

        return {
            rate: _rate(covered, publishedPosts.length),
            covered,
            total: publishedPosts.length,
            percentage: _pct(covered, publishedPosts.length)
        };
    }

    // =========================================================================
    // Formula 14: Publish Truth Accuracy
    // =========================================================================

    /**
     * Verified matches / total publish statuses.
     * @param {Array<Object>} publishStatuses — each has verified (bool)
     * @returns {{rate: number, matched: number, total: number, percentage: number}}
     */
    function publishTruthAccuracy(publishStatuses) {
        if (!publishStatuses || publishStatuses.length === 0) {
            return { rate: 0, matched: 0, total: 0, percentage: 0 };
        }

        const matched = publishStatuses.filter(s => s.verified === true).length;

        return {
            rate: _rate(matched, publishStatuses.length),
            matched,
            total: publishStatuses.length,
            percentage: _pct(matched, publishStatuses.length)
        };
    }

    // =========================================================================
    // Aggregate Compute
    // =========================================================================

    /**
     * Compute all 14 formulas from a single data object.
     * @param {Object} data
     * @param {Array} data.posts
     * @param {Array} data.tasks
     * @param {Array} data.publishStatuses
     * @param {Array} data.violations
     * @param {Object} data.utmTracking
     * @param {Array} data.templates
     * @param {Array} data.series
     * @param {Array} data.learnings
     * @param {Object} data.channelStrategy
     * @returns {Object} — all 14 formula results keyed by name
     */
    function computeAll(data) {
        const d = data || {};

        return {
            publishReadyRate: publishReadyRate(d.posts),
            onTimePublishRate: onTimePublishRate(d.posts, d.publishStatuses),
            blockedRate: blockedRate(d.posts, d.violations),
            pilotFirstMix: pilotFirstMix(d.posts),
            stageSlaCompliance: stageSlaCompliance(d.tasks),
            cadenceCompliance: cadenceCompliance(d.posts, d.channelStrategy),
            ruleCompliance: ruleCompliance(d.posts, d.violations),
            templatePerformance: templatePerformance(d.templates),
            postToSessionRate: postToSessionRate(d.utmTracking),
            postToQiYield: postToQiYield(d.utmTracking),
            parameterIntegrity: parameterIntegrity(d.utmTracking),
            seriesCompletion: seriesCompletion(d.series),
            learningCoverage: learningCoverage(d.posts, d.learnings),
            publishTruthAccuracy: publishTruthAccuracy(d.publishStatuses)
        };
    }

    /**
     * Fetch all formula results from the server API.
     * @returns {Promise<Object>} — same structure as computeAll
     */
    async function fetchAll() {
        if (typeof API === 'undefined' || !API.formulas) {
            throw new Error('API module not loaded. Cannot fetch formulas from server.');
        }

        const response = await API.formulas.get();
        return response;
    }

    // =========================================================================
    // Module Export
    // =========================================================================

    return {
        publishReadyRate,
        onTimePublishRate,
        blockedRate,
        pilotFirstMix,
        stageSlaCompliance,
        cadenceCompliance,
        ruleCompliance,
        templatePerformance,
        postToSessionRate,
        postToQiYield,
        parameterIntegrity,
        seriesCompletion,
        learningCoverage,
        publishTruthAccuracy,
        computeAll,
        fetchAll
    };
})();
