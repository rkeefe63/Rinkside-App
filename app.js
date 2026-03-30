// ── NHL API ────────────────────────────────────────────────
const NHL = 'https://api-web.nhle.com/v1';

async function nhlFetch(url) {
    const proxies = [
        u => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`,
        u => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    ];
    for (const proxy of proxies) {
        try {
            const res = await fetch(proxy(url));
            if (!res.ok) continue;
            const data = await res.json();
            if (data.contents) return JSON.parse(data.contents);
            return data;
        } catch (e) { continue; }
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error(`NHL API error: ${res.status}`);
    return res.json();
}

// ── Chat UI ────────────────────────────────────────────────
const messages = document.getElementById('chat-messages');
const form = document.getElementById('chat-form');
const input = document.getElementById('chat-input');

function addMessage(role, html) {
    const div = document.createElement('div');
    div.className = `message ${role}`;
    div.innerHTML = `<div class="avatar">${role === 'bot' ? '🏒' : '👤'}</div><div class="bubble">${html}</div>`;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return div;
}

function showTyping() {
    const div = document.createElement('div');
    div.className = 'message bot typing';
    div.innerHTML = `<div class="avatar">🏒</div><div class="bubble"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>`;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return div;
}

function sendSuggestion(el) {
    input.value = el.textContent.replace(/^[^\w]+/, '').trim();
    form.dispatchEvent(new Event('submit'));
}

form.addEventListener('submit', async e => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    addMessage('user', text);
    input.value = '';
    const typing = showTyping();
    try {
        const response = await getResponse(text.toLowerCase());
        typing.remove();
        addMessage('bot', response);
    } catch (err) {
        typing.remove();
        addMessage('bot', `<span class="error">Oof, couldn't connect to the NHL API right now. Try again in a sec — even Bettman has bad days.</span>`);
    }
});

// ── Intent Router ──────────────────────────────────────────
async function getResponse(q) {
    if (match(q, ['standing', 'division', 'conference', 'table', 'league', 'playoff', 'wild card', 'first place', 'last place', 'best record', 'worst record'])) return await getStandings();
    if (match(q, ['today', 'tonight', 'game', 'schedule', 'score', 'on tonight', 'on today', 'matchup', 'result', 'final score', 'last night', 'any games'])) return await getScores();
    if (match(q, ['top scorer', 'point leader', 'most point', 'scoring leader', 'art ross', 'leading in point', 'leading the nhl', 'most goal', 'goal leader', 'assist leader', 'most assist', 'best scorer', 'leading scorer', 'point', 'goals', 'assists'])) return await getTopScorers();
    if (match(q, ['goalie', 'goaltender', 'save', 'gaa', 'sv%', 'vezina', 'best goalie', 'top goalie', 'netminder'])) return await getTopGoalies();
    if (match(q, ['jack adams', 'coach of the year', 'best coach', 'coaching'])) return awardsOpinion('jack_adams', q);
    if (match(q, ['hart trophy', 'hart memorial', 'mvp', 'most valuable'])) return awardsOpinion('hart', q);
    if (match(q, ['norris', 'best defenceman', 'best defenseman', 'top defenceman', 'top defenseman'])) return awardsOpinion('norris', q);
    if (match(q, ['calder', 'rookie of the year', 'best rookie', 'top rookie'])) return awardsOpinion('calder', q);
    if (match(q, ['conn smythe', 'playoff mvp', 'best playoff'])) return awardsOpinion('conn_smythe', q);
    if (match(q, ['trade', 'traded', 'deadline', 'rumor', 'rumour', 'signing', 'signed', 'free agent'])) return tradeOpinion(q);
    if (match(q, ['thought', 'think', 'opinion', 'feel about', 'take on', 'what about', 'who should', 'who will', 'who would', 'best team', 'worst team', 'favourite', 'favorite', 'overrated', 'underrated'])) return generalOpinion(q);
    if (match(q, ['icing'])) return explainIcing();
    if (match(q, ['offside', 'off side'])) return explainOffside();
    if (match(q, ['penalty', 'penalties', 'power play', 'pp', 'shorthanded', 'penalty kill', 'hooking', 'tripping', 'slashing'])) return explainPenalties();
    if (match(q, ['hat trick', 'hat-trick'])) return explainHatTrick();
    if (match(q, ['bar down', 'top cheese', 'celly', 'chirp', 'dangle', 'snipe', 'biscuit', 'barn', 'twig', 'wheel'])) return explainLingo(q);
    if (match(q, ['who is', 'tell me about', 'stats for', 'how is', 'how has', 'how many', 'player', 'mcdavid', 'matthews', 'draisaitl', 'crosby', 'ovechkin', 'makar', 'hedman', 'mackinnon', 'rantanen', 'pastrnak'])) return await searchPlayer(q);
    return fallback(q);
}

function match(q, keywords) { return keywords.some(k => q.includes(k)); }

// ── Breakdown helper ───────────────────────────────────────
function breakdown(title, notes) {
    return `<div style="margin-top:1rem;padding:1rem;background:rgba(79,142,247,0.07);border:1px solid rgba(79,142,247,0.2);border-left:3px solid var(--accent);border-radius:10px;">
    <div style="font-size:0.8rem;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:0.75rem">🎙️ ${title}</div>
    ${notes.map(n => `<p style="font-size:0.88rem;color:var(--text);line-height:1.7;margin-bottom:0.6rem">${n}</p>`).join('')}
    </div>`;
}

// ── Standings ──────────────────────────────────────────────
async function getStandings() {
    const data = await nhlFetch(`${NHL}/standings/now`);
    const standings = data.standings;
    const divisions = {};
    standings.forEach(t => {
        if (!divisions[t.divisionName]) divisions[t.divisionName] = [];
        divisions[t.divisionName].push(t);
    });
    let html = `Here's where things stand in the NHL right now. Every point matters — this is where the playoff picture is taking shape 🏒<br><br>`;
    Object.entries(divisions).forEach(([div, teams]) => {
        html += `<strong>${div}</strong>`;
        html += `<table class="stat-table"><thead><tr><th>#</th><th>Team</th><th>GP</th><th>W</th><th>L</th><th>OTL</th><th>PTS</th></tr></thead><tbody>`;
        teams.slice(0, 8).forEach((t, i) => {
            const icon = i < 3 ? '🟢' : i === 3 ? '🟡' : '';
            html += `<tr><td class="rank">${icon} ${i + 1}</td><td class="team-name">${t.teamName.default}</td><td>${t.gamesPlayed}</td><td>${t.wins}</td><td>${t.losses}</td><td>${t.otLosses}</td><td class="highlight">${t.points}</td></tr>`;
        });
        html += `</tbody></table><br>`;
    });
    html += `🟢 = Division leader &nbsp;|&nbsp; 🟡 = Wild card spot<br><br>`;
    const sorted = [...standings].sort((a, b) => b.points - a.points);
    const leader = sorted[0];
    const last = sorted[sorted.length - 1];
    const bubble = standings.filter(t => t.wildcardSequence === 1 || t.wildcardSequence === 2);
    const notes = [
        `<strong>${leader.teamName.default}</strong> are sitting on top of the league with <span class="highlight">${leader.points} points</span>. That's the benchmark everyone else is chasing right now.`,
        bubble.length ? `The wild card race is where it gets spicy — <strong>${bubble.map(t => t.teamName.default).join(' and ')}</strong> are right on that bubble. One bad week and they're watching the playoffs from the couch.` : `The playoff picture is starting to take shape — watch the wild card spots closely as the schedule tightens up.`,
        `<strong>${last.teamName.default}</strong> are at the bottom with ${last.points} points. Tough season — but hey, that's a strong lottery position come draft time.`,
        `How to read this: <strong>GP</strong> = games played, <strong>W/L</strong> = wins/losses, <strong>OTL</strong> = overtime losses (still worth 1 point), <strong>PTS</strong> = total points. Two points for a win, one for an OTL, zero for a regulation loss.`
    ];
    html += breakdown('Standings Breakdown', notes);
    return html;
}

// ── Scores ─────────────────────────────────────────────────
async function getScores() {
    const dateStr = new Date().toISOString().split('T')[0];
    const data = await nhlFetch(`${NHL}/schedule/${dateStr}`);
    const games = data.gameWeek?.[0]?.games || [];
    if (!games.length) return `No games on the schedule today — even the NHL takes a breather sometimes. Check back tomorrow, the boys'll be back on the ice soon enough. 🏒`;
    let html = `Here's tonight's slate. ${games.length} game${games.length > 1 ? 's' : ''} on the board — grab your jersey 🎽<br><br>`;
    games.forEach(g => {
        const away = g.awayTeam, home = g.homeTeam;
        const isLive = g.gameState === 'LIVE' || g.gameState === 'CRIT';
        const isFinal = g.gameState === 'FINAL' || g.gameState === 'OFF';
        const scoreStr = (isLive || isFinal) ? `<span class="highlight">${away.score ?? 0} – ${home.score ?? 0}</span>` : '';
        const status = isFinal ? '✅ Final' : isLive ? '🔴 Live' : `🕐 ${g.startTimeUTC ? new Date(g.startTimeUTC).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'TBD'}`;
        html += `<div style="margin-bottom:0.75rem;padding:0.75rem;background:var(--bg-input);border:1px solid var(--border);border-radius:10px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <span><strong>${away.abbrev}</strong> @ <strong>${home.abbrev}</strong> ${scoreStr}</span>
                <span style="font-size:0.8rem;color:var(--text-muted)">${status}</span>
            </div>
            ${isLive && g.periodDescriptor ? `<div style="font-size:0.78rem;color:var(--accent);margin-top:0.3rem">Period ${g.periodDescriptor.number} • ${g.clock?.timeRemaining ?? ''}</div>` : ''}
        </div>`;
    });
    return html;
}

// ── Top Scorers ────────────────────────────────────────────
async function getTopScorers() {
    const data = await nhlFetch(`${NHL}/skater-stats-leaders/current?categories=points&limit=10`);
    const players = data.points;
    let html = `The Art Ross race is heating up. Here are the top point-getters in the league right now 🎯<br><br>`;
    html += `<table class="stat-table"><thead><tr><th>#</th><th>Player</th><th>Team</th><th>G</th><th>A</th><th>PTS</th></tr></thead><tbody>`;
    players.forEach((p, i) => {
        html += `<tr><td class="rank">${i + 1}</td><td class="team-name">${p.firstName.default} ${p.lastName.default}</td><td>${p.teamAbbrevs}</td><td>${p.goals ?? '—'}</td><td>${p.assists ?? '—'}</td><td class="highlight">${p.value}</td></tr>`;
    });
    html += `</tbody></table><br>`;
    const leader = players[0];
    const leaderName = `${leader.firstName.default} ${leader.lastName.default}`;
    const gap = leader.value - players[1].value;
    const second = `${players[1].firstName.default} ${players[1].lastName.default}`;
    const topGoals = [...players].sort((a, b) => (b.goals ?? 0) - (a.goals ?? 0))[0];
    const topAssists = [...players].sort((a, b) => (b.assists ?? 0) - (a.assists ?? 0))[0];
    const notes = [
        `<strong>${leaderName}</strong> leads the Art Ross race with <span class="highlight">${leader.value} points</span>. ${gap > 5 ? `That's a ${gap}-point cushion over ${second} — this race might already be over, folks.` : `Only ${gap} point${gap === 1 ? '' : 's'} ahead of ${second} — this one's far from settled.`}`,
        `<strong>${topGoals.firstName.default} ${topGoals.lastName.default}</strong> leads in goals with ${topGoals.goals}. Pure sniper — this is a guy who makes goalies nervous every single shift.`,
        `<strong>${topAssists.firstName.default} ${topAssists.lastName.default}</strong> leads in assists with ${topAssists.assists}. The playmaker of this group — the kind of player who makes everyone around him better.`,
        `How to read this: <strong>G</strong> = goals, <strong>A</strong> = assists, <strong>PTS</strong> = points (G + A combined). Points are the currency of the NHL — it's how you measure offensive impact.`
    ];
    html += breakdown('Rinkside Breakdown', notes);
    return html;
}

// ── Top Goalies ────────────────────────────────────────────
async function getTopGoalies() {
    const data = await nhlFetch(`${NHL}/goalie-stats-leaders/current?categories=savePctg&limit=10`);
    const goalies = data.savePctg;
    let html = `Between the pipes, these are the guys standing on their heads right now. Vezina Trophy conversation starts here 🥅<br><br>`;
    html += `<table class="stat-table"><thead><tr><th>#</th><th>Goalie</th><th>Team</th><th>SV%</th><th>GAA</th></tr></thead><tbody>`;
    goalies.forEach((g, i) => {
        html += `<tr><td class="rank">${i + 1}</td><td class="team-name">${g.firstName.default} ${g.lastName.default}</td><td>${g.teamAbbrevs}</td><td class="highlight">${g.value?.toFixed(3) ?? '—'}</td><td>${g.goalsAgainstAverage?.toFixed(2) ?? '—'}</td></tr>`;
    });
    html += `</tbody></table><br>`;
    const top = goalies[0];
    const topName = `${top.firstName.default} ${top.lastName.default}`;
    const elite = goalies.filter(g => (g.value ?? 0) > 0.920);
    const notes = [
        `<strong>${topName}</strong> is your SV% leader at <span class="highlight">${top.value?.toFixed(3)}</span>. ${top.value > 0.930 ? "That's an absolutely elite number — this goalie is single-handedly stealing games." : top.value > 0.920 ? "Solid elite-tier numbers — a legitimate Vezina conversation." : "Respectable numbers in a tough league."}`,
        `${elite.length > 1 ? `There are ${elite.length} goalies above .920 SV% right now — that's a deep group of quality starters this season.` : `Only ${topName} is above .920 SV% in this group — elite goaltending is hard to find.`}`,
        `How to read this: <strong>SV%</strong> = save percentage — what fraction of shots the goalie stopped. <strong>GAA</strong> = goals against average per game. Higher SV% is better, lower GAA is better. A .920+ SV% is elite. A GAA under 2.50 is excellent.`
    ];
    html += breakdown('Rinkside Breakdown', notes);
    return html;
}

// ── Awards & Opinions ──────────────────────────────────────
function awardsOpinion(award, q) {
    const opinions = {
        jack_adams: {
            title: 'Jack Adams Award — Coach of the Year',
            body: `The Jack Adams goes to the coach judged to have contributed the most to his team's success. It's voted on by the NHL Broadcasters' Association — so it's as much about narrative as it is about wins.<br><br>
            The best Jack Adams cases are usually coaches who either overachieved with a rebuilding team, turned a struggling roster around mid-season, or took a contender to the next level. It rewards the guy who got more out of his group than anyone expected.<br><br>
            Historically, coaches who win it tend to be in their first or second full season with a team — there's a freshness factor. A veteran coach with a loaded roster rarely wins it, even if they do a great job, because the expectation is already there.<br><br>
            ${q.includes('lindy ruff') ? `<strong>Lindy Ruff</strong> winning the Jack Adams is a story about patience and trust. Ruff is one of the most experienced coaches in the league — he's been around long enough to know exactly what a team needs at every stage. When a coach with that kind of pedigree gets the right pieces around him and the team responds, voters take notice. It validates the process.` : `The Jack Adams conversation is always one of the best debates of the awards season — there's rarely a clear-cut winner.`}`
        },
        hart: {
            title: 'Hart Trophy — NHL MVP',
            body: `The Hart Memorial Trophy goes to the player judged most valuable to his team. Key word: <em>valuable</em>. It's not just about who put up the best numbers — it's about who their team would miss the most.<br><br>
            That's why a superstar on a bad team can win it. If you remove that player and the team goes from playoff contender to lottery team, that's a Hart Trophy argument.<br><br>
            Typically the winner is either the Art Ross leader (top scorer) or a player whose team finished near the top of the standings. The debate gets interesting when those two things don't overlap.`
        },
        norris: {
            title: 'Norris Trophy — Best Defenceman',
            body: `The Norris Trophy goes to the defenceman who demonstrates the greatest all-around ability. It's the most debated award in hockey because "all-around" means different things to different people.<br><br>
            Old school voters weight offensive production heavily — points, power play contributions. Modern analytics voters want to see defensive zone coverage, shot suppression, and ice time in tough situations.<br><br>
            The best Norris candidates do both — they quarterback the power play, log 25+ minutes a night, and make the right play in their own end. That combination is incredibly rare, which is why the same names come up every year.`
        },
        calder: {
            title: 'Calder Trophy — Rookie of the Year',
            body: `The Calder Memorial Trophy goes to the player selected as the most proficient in his first year of NHL competition. Players are eligible if they haven't played more than 25 NHL games in previous seasons.<br><br>
            The Calder race is one of the most exciting awards because you're watching players announce themselves to the league for the first time. A great Calder season can define a player's trajectory for years.<br><br>
            Voters tend to reward players who made an immediate impact — not just good numbers, but players who looked like they belonged from night one. Confidence, compete level, and clutch moments matter as much as the stat line.`
        },
        conn_smythe: {
            title: 'Conn Smythe Trophy — Playoff MVP',
            body: `The Conn Smythe goes to the most valuable player in the playoffs — and it doesn't have to go to a player on the winning team, though it almost always does.<br><br>
            Playoff hockey is a completely different animal. The ice shrinks, the hitting gets harder, the goaltending gets better, and every shift feels like it matters. The Conn Smythe winner is usually the guy who showed up in the biggest moments — overtime goals, shutout performances, series-defining plays.<br><br>
            Goalies win it more often than any other position. When a goalie steals a series, it's impossible to give it to anyone else. But a dominant forward who scores in every round makes a compelling case too.`
        }
    };
    const a = opinions[award];
    return `<strong>${a.title}</strong><br><br>${a.body}`;
}

function tradeOpinion(q) {
    return `Trades and roster moves are where the real chess match happens in the NHL. ${q.includes('deadline') ? `The trade deadline is the most chaotic 24 hours in hockey — GMs are on the phone constantly, beat reporters are camped outside arenas, and every rumour feels like it could be real. The best deadline deals are the ones that address a specific need without gutting the prospect pool.` :
        q.includes('free agent') || q.includes('signing') ? `Free agency in the NHL is a different beast than other sports. Most of the real movement happens in restricted free agency — teams matching offers, bridge deals, arbitration. Unrestricted free agency gets the headlines, but the smart teams do their best work before July 1st.` :
            `The best trades in NHL history are the ones that look lopsided in hindsight. At the time, both sides thought they were winning. That's what makes the deadline and the draft so compelling — nobody really knows how it plays out until years later.`
        }<br><br>I don't have live trade news, but for the latest moves and rumours, TSN and Sportsnet are your best bets — and Elliotte Friedman's 32 Thoughts column is basically required reading.`;
}

function generalOpinion(q) {
    // Player comparisons
    if ((q.includes('mckinnon') || q.includes('mackinnon')) && q.includes('mcdavid')) return playerComparison('mackinnon_mcdavid');
    if (q.includes('matthews') && q.includes('mcdavid')) return playerComparison('matthews_mcdavid');
    if (q.includes('crosby') && q.includes('mcdavid')) return playerComparison('crosby_mcdavid');
    if (q.includes('ovechkin') && q.includes('gretzky')) return playerComparison('ovechkin_gretzky');
    if (q.includes('best player') || q.includes('best in the world') || q.includes('best in the nhl')) return playerComparison('best_player');
    if (q.includes('best team') || q.includes('cup favourite') || q.includes('cup favorite') || q.includes('win the cup') || q.includes('stanley cup')) return teamOpinion();
    if (q.includes('overrated')) return `Overrated is a strong word in hockey — but if we're being honest, the most "overrated" players are usually guys who get massive contracts based on one great season and then settle into being solid but not elite. The NHL is littered with $8M cap hits that don't quite deliver. The truly elite players — McDavid, MacKinnon, Matthews — are actually <em>underrated</em> because no contract can capture what they bring on a nightly basis.`;
    if (q.includes('underrated')) return `Underrated players are the backbone of every championship team. The guys who kill penalties, block shots, win faceoffs, and never show up on the highlight reel — those are the players coaches lose sleep over when they leave in free agency. Every Cup winner has three or four of those guys in the lineup.`;

    const responses = [
        `That's a great hockey take. Drop a more specific question — player comparison, award race, team outlook — and I'll give you a proper Rinkside breakdown on it. 🏒`,
        `Good hockey debate. Get more specific and I'll dig in — player vs. player, award predictions, Cup contenders. That's where it gets fun.`
    ];
    return responses[Math.floor(Math.random() * responses.length)];
}

function playerComparison(matchup) {
    const comparisons = {
        mackinnon_mcdavid: `<strong>MacKinnon vs. McDavid</strong> — the best debate in hockey right now 🏒<br><br>
        Here's the honest take: <strong>McDavid is the best player on the planet</strong>, and it's not particularly close on pure skill. The speed, the hands, the vision — there's never been anyone who does what he does at even strength. He makes the impossible look routine.<br><br>
        But <strong>MacKinnon's case is legitimate</strong>. He's the most complete player in the game — elite in all three zones, plays in every situation, competes harder than almost anyone, and has carried Colorado to a Stanley Cup. He's the guy you'd want if you needed one player to win you a series.<br><br>
        The difference? McDavid makes you gasp. MacKinnon makes you win. Depending on what you value, you can make a case for either — and that's what makes this debate so good.<br><br>
        <em>Friedman take: McDavid is the best player. MacKinnon is the best hockey player. There's a difference.</em>`,

        matthews_mcdavid: `<strong>Matthews vs. McDavid</strong> — Toronto vs. Edmonton, the modern rivalry 🏒<br><br>
        <strong>McDavid</strong> is the better all-around player — the skating, the playmaking, the ability to take over a game at will. He's the standard everyone else is measured against.<br><br>
        But <strong>Matthews</strong> might be the purest goal scorer the NHL has seen in a generation. His shot release is the fastest in the league, his positioning is elite, and he's a legitimate 60-goal threat every season. If you need one goal in one game, Matthews might actually be your guy.<br><br>
        McDavid wins the overall debate. But Matthews has carved out his own lane — and in a league that values goal scoring, that lane is worth a lot.<br><br>
        <em>The real question is: would you rather have McDavid's ceiling or Matthews' consistency? Both answers are defensible.</em>`,

        crosby_mcdavid: `<strong>Crosby vs. McDavid</strong> — the generational debate 🏒<br><br>
        This one comes down to era and what you value. <strong>Crosby</strong> is the most complete player of his generation — three Stanley Cups, two Olympic golds, every major individual award. He changed how the game is played and did it while being the most physically targeted player in the league for 15 years.<br><br>
        <strong>McDavid</strong> is doing things with the puck that Crosby never did. The pure skating ability, the top-end speed — it's a different kind of dominance.<br><br>
        Peak for peak? McDavid might have the edge on pure skill. But Crosby's résumé — especially the playoff success — is the standard. Until McDavid wins a Cup, Crosby holds the edge in the all-time conversation.<br><br>
        <em>Both answers are right. That's what makes it the best debate in hockey.</em>`,

        ovechkin_gretzky: `<strong>Ovechkin vs. Gretzky</strong> — the goal scoring debate for the ages 🏒<br><br>
        Ovechkin broke Gretzky's all-time goals record — a number that was supposed to be untouchable. That alone is one of the most remarkable achievements in sports history.<br><br>
        But context matters: <strong>Gretzky's assist totals alone</strong> would make him the all-time points leader. He had 1,963 assists. Ovechkin has fewer total points than Gretzky has assists. The Great One played in a higher-scoring era, but the gap in playmaking is staggering.<br><br>
        Ovechkin is the greatest goal scorer who ever lived. Gretzky is the greatest hockey player who ever lived. Those aren't the same thing — and both statements are true.`,

        best_player: `<strong>Best player in the NHL right now?</strong> 🏒<br><br>
        <strong>Connor McDavid</strong>. It's not a debate — it's a fact. He's won the Hart Trophy multiple times, leads the league in points in most seasons, and does things with the puck that make professional hockey players stop and stare.<br><br>
        The conversation for second place is genuinely interesting: <strong>Nathan MacKinnon</strong> is the most complete player, <strong>Auston Matthews</strong> is the best pure goal scorer, and <strong>Leon Draisaitl</strong> — McDavid's linemate — would be the best player on 29 other teams.<br><br>
        But McDavid is in a tier by himself. The only real debate is whether he's the best player of his generation or the best player ever. That conversation is already happening.`
    };

    return comparisons[matchup] || generalOpinion('');
}

function teamOpinion() {
    return `<strong>Stanley Cup contenders</strong> — let's break it down 🏆<br><br>
    Every year the Cup conversation starts the same way: follow the goaltending. You can have the best roster in the league, but if your goalie goes cold in April, you're going home early. That's the NHL.<br><br>
    The teams that consistently contend share a few things: <strong>elite centre depth</strong> (the best teams have two legitimate top-six centres), <strong>a reliable starter in net</strong>, and <strong>a power play that converts</strong>. Special teams win playoff series — it's not glamorous, but it's true.<br><br>
    The dark horse every year is the team that gets hot at the right time. Playoff hockey rewards momentum, and a team that's playing its best hockey in March and April is dangerous regardless of where they finished in the standings.<br><br>
    Ask me about a specific team and I'll give you a proper breakdown on their Cup chances.`;
}

// ── Player Search ──────────────────────────────────────────
async function searchPlayer(q) {
    const cleaned = q.replace(/who is|tell me about|stats for|how is|how has|how many|player/g, '').trim();
    if (!cleaned || cleaned.length < 2) return `Who are you looking for? Give me a name — first, last, or both — and I'll pull up their numbers.`;
    const data = await nhlFetch(`https://search.d3.nhle.com/api/v1/search/player?culture=en-us&limit=5&q=${encodeURIComponent(cleaned)}&active=true`);
    if (!data || data.length === 0) return `Couldn't find anyone matching "${cleaned}" on the active roster. Double-check the spelling — even Elliotte Friedman has to confirm names sometimes.`;
    const pid = data[0].playerId;
    const info = await nhlFetch(`${NHL}/player/${pid}/landing`);
    const s = info.featuredStats?.regularSeason?.subSeason;
    const isGoalie = info.position === 'G';
    let statsHtml = '';
    if (s) {
        statsHtml = isGoalie
            ? `<table class="stat-table"><thead><tr><th>GP</th><th>W</th><th>L</th><th>SV%</th><th>GAA</th><th>SO</th></tr></thead><tbody><tr><td>${s.gamesPlayed ?? '—'}</td><td>${s.wins ?? '—'}</td><td>${s.losses ?? '—'}</td><td class="highlight">${s.savePctg?.toFixed(3) ?? '—'}</td><td>${s.goalsAgainstAverage?.toFixed(2) ?? '—'}</td><td>${s.shutouts ?? '—'}</td></tr></tbody></table>`
            : `<table class="stat-table"><thead><tr><th>GP</th><th>G</th><th>A</th><th>PTS</th><th>+/-</th><th>PIM</th></tr></thead><tbody><tr><td>${s.gamesPlayed ?? '—'}</td><td>${s.goals ?? '—'}</td><td>${s.assists ?? '—'}</td><td class="highlight">${s.points ?? '—'}</td><td>${s.plusMinus ?? '—'}</td><td>${s.pim ?? '—'}</td></tr></tbody></table>`;
    }
    const name = `${info.firstName?.default} ${info.lastName?.default}`;
    const pts = s?.points ?? 0;
    const svp = s?.savePctg ?? 0;
    const notes = isGoalie
        ? [`SV% of ${svp.toFixed(3)} tells the real story. ${svp > 0.930 ? "That's elite — this goalie is standing on his head." : svp > 0.915 ? "Solid starter numbers." : "Room to grow, but every goalie goes through stretches."}`, `GAA of ${s?.goalsAgainstAverage?.toFixed(2) ?? '—'} — ${(s?.goalsAgainstAverage ?? 3) < 2.5 ? "excellent. Giving up fewer than 2.5 goals a game is top-tier." : "league average. Needs to tighten up to be a true difference-maker."}`]
        : [`${pts > 60 ? `${pts} points is a legitimate top-line season — this is one of the best players in the world right now.` : pts > 40 ? `${pts} points puts ${info.firstName?.default} in solid second-line territory — a real contributor.` : `Still building — keep an eye on the development curve.`}`, `+/- of ${s?.plusMinus ?? '—'} tells you how the team performs when ${info.firstName?.default} is on the ice. ${(s?.plusMinus ?? 0) > 10 ? "Positive impact — good things happen when this player is out there." : (s?.plusMinus ?? 0) < -10 ? "That's a number the coaching staff will want to address." : "Roughly even — solid two-way presence."}`];
    return `<strong>${name}</strong> ${info.sweaterNumber ? `#${info.sweaterNumber}` : ''} — ${info.position} | ${info.fullTeamName?.default ?? ''}<br>
    <span style="color:var(--text-muted);font-size:0.85rem">${info.currentAge ? `${info.currentAge} years old` : ''}${info.birthCountry ? ` · ${info.birthCountry}` : ''}</span><br><br>
    <strong>This season:</strong>${statsHtml}<br>${breakdown('Rinkside Breakdown', notes)}`;
}

// ── Rules & Lingo ──────────────────────────────────────────
function explainIcing() {
    return `<strong>Icing</strong> — here's the deal 🚫<br><br>If a player shoots the puck from their own side of the red center line and it crosses the opposing goal line untouched, that's icing. Play stops, faceoff comes back to the defensive zone of the team that iced it.<br><br><strong>Why it exists:</strong> Stops teams from just chucking the puck 200 feet to kill time or relieve pressure.<br><br><strong>Exception:</strong> Shorthanded teams can ice the puck — one of the few advantages of killing a penalty.<br><br><em>Think of it like not being allowed to punt in football just to avoid pressure. Same energy.</em>`;
}

function explainOffside() {
    return `<strong>Offside</strong> — the rule that causes more bar arguments than anything else 🚦<br><br>A player is offside if they enter the offensive zone before the puck does. Both skates have to be over the blue line after the puck crosses — one skate on the line counts as onside.<br><br><strong>Coach's challenge:</strong> Since 2015, coaches can challenge offside on goals. If a player was offside on the zone entry that led to the goal — even 30 seconds earlier — the goal gets waved off. Controversial? Absolutely.<br><br><em>Watch the linesman's eyes — they're tracking the puck and skates simultaneously. Toughest job on the ice.</em>`;
}

function explainPenalties() {
    return `<strong>Penalties & the Power Play</strong> — where games are won and lost ⚡<br><br>When a player commits a foul, they go to the box and their team plays shorthanded. The other team gets a <strong>power play</strong>.<br><br><strong>Common calls:</strong><br>• <em>Hooking</em> — using your stick to impede a player<br>• <em>Tripping</em> — taking a player down<br>• <em>High-sticking</em> — stick above the shoulders<br>• <em>Interference</em> — hitting a player without the puck<br>• <em>Slashing</em> — whacking someone's stick or body<br><br><strong>Minor</strong> = 2 min (ends early if PP scores). <strong>Major</strong> = 5 min (does NOT end early). A power play converting at 20%+ is elite.`;
}

function explainHatTrick() {
    return `<strong>Hat Trick</strong> — one of the purest moments in hockey 🎩<br><br>Three goals by one player in a single game. Fans throw their hats on the ice — a tradition going back decades. The arena staff collects them all. Yes, really.<br><br><strong>Natural hat trick:</strong> Three consecutive goals, uninterrupted. Way rarer, way more impressive.<br><br><strong>Gordie Howe hat trick:</strong> A goal, an assist, AND a fight in the same game. Named after the legend himself. The ultimate power move.`;
}

function explainLingo(q) {
    const terms = {
        'bar down': `<strong>Bar down</strong> 🚨 — When a shot hits the crossbar and drops straight into the net. Makes a distinct "ping" that every hockey fan lives for. Pure filth.`,
        'top cheese': `<strong>Top cheese</strong> 🧀 — A shot that goes up high in the net, under the crossbar. "Cheese" = the top of the net. If someone went top cheese, the goalie had zero chance.`,
        'celly': `<strong>Celly</strong> 🎉 — Short for celebration. From the subtle fist pump to the full-on dive across the ice, the celly is an art form.`,
        'chirp': `<strong>Chirp</strong> 🗣️ — Trash talk on the ice. Hockey players are notorious chirpers. Getting chirped and not responding? That's a bad look.`,
        'dangle': `<strong>Dangle</strong> 🏒 — A sick stickhandling move that dekes out a defender or goalie. "He dangled right through the defense" means he made everyone look silly.`,
        'snipe': `<strong>Snipe</strong> 🎯 — A perfectly placed shot that beats the goalie clean. A sniper is a player known for shooting accuracy. Every team needs one.`,
        'biscuit': `<strong>Biscuit</strong> 🏒 — The puck. "Put the biscuit in the basket" = score a goal.`,
        'barn': `<strong>Barn</strong> 🏟️ — The arena. A packed barn with a rowdy crowd is one of the best atmospheres in sports.`,
        'twig': `<strong>Twig</strong> 🏒 — A hockey stick. Old school term from when sticks were made of wood. Players are very particular about their twigs.`,
        'wheel': `<strong>Wheel</strong> 🛞 — To skate fast. "He can wheel" means serious speed.`
    };
    for (const [term, explanation] of Object.entries(terms)) {
        if (q.includes(term)) return explanation;
    }
    return fallback(q);
}

// ── Fallback ───────────────────────────────────────────────
function fallback(q) {
    return `That one's a little outside my crease — but I'm always learning. Try asking me about:<br><br>
    <span class="suggestion" onclick="sendSuggestion(this)">📊 Current standings</span>
    <span class="suggestion" onclick="sendSuggestion(this)">🎯 Top scorers</span>
    <span class="suggestion" onclick="sendSuggestion(this)">🥅 Top goalies</span>
    <span class="suggestion" onclick="sendSuggestion(this)">🏆 Hart Trophy thoughts</span>
    <span class="suggestion" onclick="sendSuggestion(this)">🎽 Jack Adams Award</span>
    <span class="suggestion" onclick="sendSuggestion(this)">🎩 What's a hat trick?</span>`;
}
