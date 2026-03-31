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
const messagesEl = document.getElementById('chat-messages');
const formEl = document.getElementById('chat-form');
const inputEl = document.getElementById('chat-input');

function addMessage(role, html) {
    const div = document.createElement('div');
    div.className = `message ${role}`;
    div.innerHTML = `<div class="avatar">${role === 'bot' ? '🏒' : '👤'}</div><div class="bubble">${html}</div>`;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

function showTyping() {
    const div = document.createElement('div');
    div.className = 'message bot typing';
    div.id = 'typing-indicator';
    div.innerHTML = `<div class="avatar">🏒</div><div class="bubble"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>`;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

function hideTyping() {
    const el = document.getElementById('typing-indicator');
    if (el) el.remove();
}

function sendSuggestion(el) {
    inputEl.value = el.textContent.replace(/^[^\w]+/, '').trim();
    formEl.dispatchEvent(new Event('submit'));
}

formEl.addEventListener('submit', async e => {
    e.preventDefault();
    const text = inputEl.value.trim();
    if (!text) return;
    addMessage('user', text);
    inputEl.value = '';
    showTyping();
    try {
        const response = await getResponse(text.toLowerCase());
        hideTyping();
        addMessage('bot', response);
    } catch (err) {
        hideTyping();
        addMessage('bot', `<span class="error">Oof, couldn't connect to the NHL API right now. Try again in a sec — even Bettman has bad days.</span>`);
    }
});

// ── Helpers ────────────────────────────────────────────────
function match(q, keywords) { return keywords.some(k => q.includes(k)); }

function breakdown(title, notes) {
    return `<div style="margin-top:1rem;padding:1rem;background:rgba(79,142,247,0.07);border:1px solid rgba(79,142,247,0.2);border-left:3px solid var(--accent);border-radius:10px;">
<div style="font-size:0.8rem;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:0.75rem">🎙️ ${title}</div>
${notes.map(n => `<p style="font-size:0.88rem;color:var(--text);line-height:1.7;margin-bottom:0.6rem">${n}</p>`).join('')}
</div>`;
}

// ── Intent Router ──────────────────────────────────────────
async function getResponse(q) {
    if (match(q, ['standing', 'division', 'conference', 'first place', 'last place', 'best record', 'worst record', 'league table'])) return await getStandings();
    if (match(q, ['today', 'tonight', 'any games', 'games today', 'schedule', 'score', 'result', 'last night', 'matchup'])) return await getScores();
    if (match(q, ['top scorer', 'point leader', 'most point', 'scoring leader', 'art ross', 'leading the nhl', 'most goal', 'goal leader', 'assist leader', 'best scorer', 'leading scorer'])) return await getTopScorers();
    if (match(q, ['goalie', 'goaltender', 'save', 'gaa', 'sv%', 'vezina', 'best goalie', 'top goalie', 'netminder', 'between the pipe'])) return await getTopGoalies();
    if (match(q, ['jack adams', 'coach of the year', 'best coach'])) return awardsOpinion('jack_adams', q);
    if (match(q, ['hart trophy', 'hart memorial', 'mvp', 'most valuable'])) return awardsOpinion('hart', q);
    if (match(q, ['norris', 'best defenceman', 'best defenseman', 'top defenseman', 'top defenceman'])) return awardsOpinion('norris', q);
    if (match(q, ['calder', 'rookie of the year', 'best rookie', 'top rookie'])) return awardsOpinion('calder', q);
    if (match(q, ['conn smythe', 'playoff mvp'])) return awardsOpinion('conn_smythe', q);
    if (match(q, ['trade', 'traded', 'deadline', 'rumor', 'rumour', 'signing', 'signed', 'free agent'])) return tradeOpinion(q);
    if (match(q, ['stanley cup', 'win the cup', 'cup this year', 'cup prediction', 'cup contender', 'cup favourite', 'cup favorite', 'winning the cup', 'who wins', 'best team'])) return await getCupPrediction();
    if (match(q, ['salary cap', 'cap space', 'cap hit', 'cap ceiling', 'collective bargaining'])) return explainSalaryCap();
    if (match(q, ['draft', 'nhl draft', 'lottery', 'first overall', 'prospect'])) return explainDraft();
    if (match(q, ['playoff format', 'how do playoffs work', 'playoff seeding', 'how does the playoff', 'playoff structure'])) return explainPlayoffs();
    if (match(q, ['shootout', 'shoot out'])) return explainShootout();
    if (match(q, ['fight', 'fighting', 'enforcer', 'dropping the gloves'])) return explainFighting();
    if (match(q, ['line change', 'fourth line', 'first line', 'line combination', 'forward line', 'defensive pair'])) return explainLines();
    if (match(q, ['faceoff', 'face off', 'face-off'])) return explainFaceoffs();
    if (match(q, ['icing'])) return explainIcing();
    if (match(q, ['offside', 'off side'])) return explainOffside();
    if (match(q, ['penalty', 'penalties', 'power play', 'shorthanded', 'penalty kill', 'hooking', 'tripping', 'slashing'])) return explainPenalties();
    if (match(q, ['hat trick', 'hat-trick'])) return explainHatTrick();
    if (match(q, ['bar down', 'top cheese', 'celly', 'chirp', 'dangle', 'snipe', 'biscuit', 'barn', 'twig', 'wheel', 'apple', 'beauty', 'flow', 'gongshow', 'barn burner', 'standing on his head', 'between the pipes', 'backstop', 'blueliner', 'grinder', 'plug', 'pigeon', 'tape to tape', 'breakaway', 'odd-man', 'cycle', 'forecheck', 'backcheck', 'trap', 'top shelf', 'five hole', 'five-hole', 'glove side', 'blocker side', 'wraparound', 'saucer pass', 'one timer', 'one-timer', 'clapper', 'slap shot', 'wrist shot', 'backhand', 'deke', 'spin-o-rama', 'spinorama', 'lacrosse', 'michigan', 'coast to coast', 'end to end'])) return explainLingo(q);
    if (match(q, ['thought', 'think', 'opinion', 'feel about', 'better than', 'vs', 'versus', 'overrated', 'underrated', 'favourite', 'favorite', 'who should', 'who will', 'who would', 'greatest', 'goat'])) return generalOpinion(q);
    const teamMatch = detectTeam(q);
    if (teamMatch && match(q, ['playoff', 'make it', 'making it', 'will they', 'chance', 'contend', 'bubble', 'clinch', 'season', 'outlook', 'how are', 'how is', 'doing this', 'think about', 'thoughts on', 'doing', 'look', 'good', 'bad', 'win', 'lose', 'cup', 'rebuild', 'tank', 'trade', 'future', 'this year', 'year', 'gonna', 'going to', 'think they', 'any good', 'any chance'])) return await getTeamOutlook(teamMatch);
    if (match(q, ['who is', 'tell me about', 'stats for', 'how is', 'how has', 'player', 'mcdavid', 'matthews', 'draisaitl', 'crosby', 'ovechkin', 'makar', 'hedman', 'mackinnon', 'rantanen', 'pastrnak'])) return await searchPlayer(q);
    return fallback();
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
    let html = `Here's where things stand in the NHL right now 🏒<br><br>`;
    Object.entries(divisions).forEach(([div, teams]) => {
        html += `<strong>${div}</strong><table class="stat-table"><thead><tr><th>#</th><th>Team</th><th>GP</th><th>W</th><th>L</th><th>OTL</th><th>PTS</th></tr></thead><tbody>`;
        teams.slice(0, 8).forEach((t, i) => {
            const icon = i < 3 ? '🟢' : i === 3 ? '🟡' : '';
            html += `<tr><td class="rank">${icon}${i + 1}</td><td class="team-name">${t.teamName.default}</td><td>${t.gamesPlayed}</td><td>${t.wins}</td><td>${t.losses}</td><td>${t.otLosses}</td><td class="highlight">${t.points}</td></tr>`;
        });
        html += `</tbody></table><br>`;
    });
    const sorted = [...standings].sort((a, b) => b.points - a.points);
    const leader = sorted[0];
    const last = sorted[sorted.length - 1];
    html += `🟢 = Division leader &nbsp;|&nbsp; 🟡 = Wild card spot<br><br>`;
    html += breakdown('Standings Breakdown', [
        `<strong>${leader.teamName.default}</strong> lead the league with <span class="highlight">${leader.points} points</span>. That's the benchmark everyone else is chasing.`,
        `<strong>${last.teamName.default}</strong> are at the bottom with ${last.points} points — tough season, but that's a strong lottery position.`,
        `<strong>How to read this:</strong> GP = games played, W/L = wins/losses, OTL = overtime loss (worth 1 point), PTS = total points. Two points for a win, one for an OTL.`
    ]);
    return html;
}

// ── Scores ─────────────────────────────────────────────────
async function getScores() {
    const dateStr = new Date().toISOString().split('T')[0];
    const data = await nhlFetch(`${NHL}/schedule/${dateStr}`);
    const games = data.gameWeek?.[0]?.games || [];
    if (!games.length) return `No games on the schedule today — even the NHL takes a breather. Check back tomorrow 🏒`;
    let html = `Here's tonight's slate — ${games.length} game${games.length > 1 ? 's' : ''} on the board 🎽<br><br>`;
    games.forEach(g => {
        const away = g.awayTeam, home = g.homeTeam;
        const isLive = g.gameState === 'LIVE' || g.gameState === 'CRIT';
        const isFinal = g.gameState === 'FINAL' || g.gameState === 'OFF';
        const scoreStr = (isLive || isFinal) ? `<span class="highlight">${away.score ?? 0} – ${home.score ?? 0}</span>` : '';
        const status = isFinal ? '✅ Final' : isLive ? '🔴 Live' : `🕐 ${g.startTimeUTC ? new Date(g.startTimeUTC).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'TBD'}`;
        html += `<div style="margin-bottom:0.75rem;padding:0.75rem;background:var(--bg-input);border:1px solid var(--border);border-radius:10px;display:flex;justify-content:space-between;align-items:center;">
            <span><strong>${away.abbrev}</strong> @ <strong>${home.abbrev}</strong> ${scoreStr}</span>
            <span style="font-size:0.8rem;color:var(--text-muted)">${status}</span>
        </div>`;
    });
    return html;
}

// ── Top Scorers ────────────────────────────────────────────
async function getTopScorers() {
    const data = await nhlFetch(`${NHL}/skater-stats-leaders/current?categories=points&limit=10`);
    const players = data.points;
    let html = `The Art Ross race is heating up 🎯<br><br><table class="stat-table"><thead><tr><th>#</th><th>Player</th><th>Team</th><th>G</th><th>A</th><th>PTS</th></tr></thead><tbody>`;
    players.forEach((p, i) => {
        html += `<tr><td class="rank">${i + 1}</td><td class="team-name">${p.firstName.default} ${p.lastName.default}</td><td>${p.teamAbbrevs}</td><td>${p.goals ?? '—'}</td><td>${p.assists ?? '—'}</td><td class="highlight">${p.value}</td></tr>`;
    });
    html += `</tbody></table><br>`;
    const leader = players[0];
    const gap = leader.value - players[1].value;
    const topGoals = [...players].sort((a, b) => (b.goals ?? 0) - (a.goals ?? 0))[0];
    const topAssists = [...players].sort((a, b) => (b.assists ?? 0) - (a.assists ?? 0))[0];
    html += breakdown('Rinkside Breakdown', [
        `<strong>${leader.firstName.default} ${leader.lastName.default}</strong> leads with <span class="highlight">${leader.value} pts</span>. ${gap > 5 ? `${gap}-point cushion — this race might be over.` : `Only ${gap} back — far from settled.`}`,
        `<strong>${topGoals.firstName.default} ${topGoals.lastName.default}</strong> leads in goals (${topGoals.goals}) — pure sniper energy.`,
        `<strong>${topAssists.firstName.default} ${topAssists.lastName.default}</strong> leads in assists (${topAssists.assists}) — the playmaker of this group.`,
        `<strong>G</strong> = goals, <strong>A</strong> = assists, <strong>PTS</strong> = G+A combined. Points are the currency of the NHL.`
    ]);
    return html;
}

// ── Top Goalies ────────────────────────────────────────────
async function getTopGoalies() {
    const data = await nhlFetch(`${NHL}/goalie-stats-leaders/current?categories=savePctg&limit=10`);
    const goalies = data.savePctg;
    let html = `Between the pipes — Vezina Trophy conversation starts here 🥅<br><br><table class="stat-table"><thead><tr><th>#</th><th>Goalie</th><th>Team</th><th>SV%</th><th>GAA</th></tr></thead><tbody>`;
    goalies.forEach((g, i) => {
        html += `<tr><td class="rank">${i + 1}</td><td class="team-name">${g.firstName.default} ${g.lastName.default}</td><td>${g.teamAbbrevs}</td><td class="highlight">${g.value?.toFixed(3) ?? '—'}</td><td>${g.goalsAgainstAverage?.toFixed(2) ?? '—'}</td></tr>`;
    });
    html += `</tbody></table><br>`;
    const top = goalies[0];
    html += breakdown('Rinkside Breakdown', [
        `<strong>${top.firstName.default} ${top.lastName.default}</strong> leads at <span class="highlight">${top.value?.toFixed(3)}</span> SV%. ${top.value > 0.930 ? "Absolutely standing on his head." : top.value > 0.920 ? "Elite-tier numbers — legitimate Vezina conversation." : "Solid numbers in a tough league."}`,
        `<strong>SV%</strong> = save percentage (higher is better). <strong>GAA</strong> = goals against average (lower is better). A .920+ SV% is elite. GAA under 2.50 is excellent.`
    ]);
    return html;
}

// ── Cup Prediction ─────────────────────────────────────────
async function getCupPrediction() {
    const data = await nhlFetch(`${NHL}/standings/now`);
    const standings = data.standings;
    const sorted = [...standings].sort((a, b) => b.points - a.points);
    const top5 = sorted.slice(0, 5);
    const east = standings.filter(t => t.conferenceName === 'Eastern').sort((a, b) => b.points - a.points)[0];
    const west = standings.filter(t => t.conferenceName === 'Western').sort((a, b) => b.points - a.points)[0];
    let html = `<strong>Stanley Cup Prediction 🏆</strong><br><br><strong>Top 5 right now:</strong><table class="stat-table"><thead><tr><th>#</th><th>Team</th><th>PTS</th><th>W</th></tr></thead><tbody>`;
    top5.forEach((t, i) => {
        html += `<tr><td class="rank">${i + 1}</td><td class="team-name">${t.teamName.default}</td><td class="highlight">${t.points}</td><td>${t.wins}</td></tr>`;
    });
    html += `</tbody></table><br>`;
    const gap = top5[0].points - top5[1].points;
    html += breakdown('Cup Breakdown', [
        `<strong>${top5[0].teamName.default}</strong> are the favourite right now — ${top5[0].points} points, ${top5[0].wins} wins. ${gap > 8 ? `That ${gap}-point gap isn't an accident.` : `But the gap is tight — this could look different by April.`}`,
        `East leader: <strong>${east.teamName.default}</strong> (${east.points} pts). West leader: <strong>${west.teamName.default}</strong> (${west.points} pts).`,
        `The Cup is decided by goaltending, special teams, and health. The best team in October rarely lifts it in June — a hot goalie in April changes everything.`,
        `My pick: <strong>${top5[0].teamName.default}</strong> are the favourite, but watch <strong>${top5[1].teamName.default}</strong> and <strong>${top5[2].teamName.default}</strong> as legitimate threats. The dark horse is whoever gets hot at the right time with a goalie standing on his head.`
    ]);
    return html;
}

// ── Team Outlook ───────────────────────────────────────────
const TEAM_MAP = {
    // Atlantic
    'senators': 'OTT', 'ottawa': 'OTT', 'sens': 'OTT',
    'maple leafs': 'TOR', 'toronto': 'TOR', 'leafs': 'TOR', 'buds': 'TOR', 'the buds': 'TOR',
    'canadiens': 'MTL', 'montreal': 'MTL', 'habs': 'MTL', 'bleu blanc rouge': 'MTL',
    'bruins': 'BOS', 'boston': 'BOS', 'bs': 'BOS', 'big bad bruins': 'BOS',
    'sabres': 'BUF', 'buffalo': 'BUF',
    'red wings': 'DET', 'detroit': 'DET', 'wings': 'DET', 'winged wheel': 'DET',
    'panthers': 'FLA', 'florida': 'FLA', 'cats': 'FLA',
    'lightning': 'TBL', 'tampa': 'TBL', 'tampa bay': 'TBL', 'bolts': 'TBL',
    // Metropolitan
    'rangers': 'NYR', 'new york rangers': 'NYR', 'blueshirts': 'NYR', 'broadway blueshirts': 'NYR',
    'islanders': 'NYI', 'new york islanders': 'NYI', 'isles': 'NYI',
    'devils': 'NJD', 'new jersey': 'NJD', 'devs': 'NJD',
    'flyers': 'PHI', 'philadelphia': 'PHI', 'broad street bullies': 'PHI',
    'penguins': 'PIT', 'pittsburgh': 'PIT', 'pens': 'PIT', 'sid and the kids': 'PIT',
    'capitals': 'WSH', 'washington': 'WSH', 'caps': 'WSH',
    'hurricanes': 'CAR', 'carolina': 'CAR', 'canes': 'CAR',
    'blue jackets': 'CBJ', 'columbus': 'CBJ', 'jackets': 'CBJ', 'cbj': 'CBJ',
    // Central
    'jets': 'WPG', 'winnipeg': 'WPG',
    'wild': 'MIN', 'minnesota': 'MIN', 'mn wild': 'MIN',
    'blackhawks': 'CHI', 'chicago': 'CHI', 'hawks': 'CHI', 'black hawks': 'CHI',
    'avalanche': 'COL', 'colorado': 'COL', 'avs': 'COL',
    'stars': 'DAL', 'dallas': 'DAL',
    'predators': 'NSH', 'nashville': 'NSH', 'preds': 'NSH',
    'blues': 'STL', 'st. louis': 'STL', 'st louis': 'STL', 'note': 'STL',
    'utah': 'UTA', 'utah hockey': 'UTA',
    // Pacific
    'ducks': 'ANA', 'anaheim': 'ANA', 'mighty ducks': 'ANA',
    'flames': 'CGY', 'calgary': 'CGY', 'c of red': 'CGY',
    'oilers': 'EDM', 'edmonton': 'EDM', 'oil': 'EDM',
    'kings': 'LAK', 'los angeles': 'LAK', 'la kings': 'LAK',
    'sharks': 'SJS', 'san jose': 'SJS', 'sharks tank': 'SJS',
    'kraken': 'SEA', 'seattle': 'SEA',
    'canucks': 'VAN', 'vancouver': 'VAN', 'nucks': 'VAN', 'nux': 'VAN',
    'golden knights': 'VGK', 'vegas': 'VGK', 'knights': 'VGK', 'vgk': 'VGK',
};

function detectTeam(q) {
    for (const [name, abbrev] of Object.entries(TEAM_MAP)) {
        if (q.includes(name)) return abbrev;
    }
    return null;
}

async function getTeamOutlook(abbrev) {
    const [standingsData, scheduleData] = await Promise.all([
        nhlFetch(`${NHL}/standings/now`),
        nhlFetch(`${NHL}/club-schedule-season/${abbrev}/now`)
    ]);
    const team = standingsData.standings.find(t => t.teamAbbrev.default === abbrev);
    if (!team) return `Couldn't find data for that team right now — try again in a sec.`;
    const name = team.teamName.default;
    const pts = team.points, gp = team.gamesPlayed, gamesLeft = 82 - gp;
    const confTeams = standingsData.standings.filter(t => t.conferenceName === team.conferenceName).sort((a, b) => b.points - a.points);
    const confRank = confTeams.findIndex(t => t.teamAbbrev.default === abbrev) + 1;
    const wcCutoff = confTeams[7]?.points ?? 0;
    const ptsBehind = wcCutoff - pts;
    const inPlayoffs = confRank <= 8;
    const upcoming = scheduleData?.games?.filter(g => g.gameState === 'FUT' || g.gameState === 'PRE')?.slice(0, 4) ?? [];
    let html = `<strong>${name} — Playoff Outlook</strong><br><br>`;
    html += `<table class="stat-table"><thead><tr><th>GP</th><th>W</th><th>L</th><th>OTL</th><th>PTS</th><th>Conf Rank</th></tr></thead><tbody><tr><td>${gp}</td><td>${team.wins}</td><td>${team.losses}</td><td>${team.otLosses}</td><td class="highlight">${pts}</td><td>${confRank}</td></tr></tbody></table><br>`;
    if (upcoming.length) {
        html += `<strong>Upcoming Games:</strong><br>`;
        upcoming.forEach(g => {
            const isHome = g.homeTeam?.abbrev === abbrev;
            const opp = isHome ? g.awayTeam?.abbrev : g.homeTeam?.abbrev;
            const date = new Date(g.startTimeUTC).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            html += `<div style="font-size:0.85rem;padding:0.35rem 0;border-bottom:1px solid var(--border)">${date} — ${isHome ? 'vs' : '@'} <strong>${opp}</strong></div>`;
        });
        html += `<br>`;
    }
    html += breakdown(`${name} Breakdown`, [
        inPlayoffs ? `<strong>${name} are IN a playoff spot</strong> — sitting ${confRank}${confRank === 1 ? 'st' : confRank === 2 ? 'nd' : confRank === 3 ? 'rd' : 'th'} in the conference with ${pts} points. The job is to protect that position.`
            : `<strong>${name} are OUTSIDE the playoff picture</strong> — ${confRank}th in the conference, ${ptsBehind} point${ptsBehind === 1 ? '' : 's'} back of the final wild card spot.`,
        `With ${gamesLeft} games left, max possible points: ${pts + gamesLeft * 2}. ${gamesLeft < 20 ? `The runway is getting short — every game is a playoff game now.` : `Still plenty of time, but they need to start banking points.`}`,
        upcoming.length ? `Those upcoming matchups are critical: ${upcoming.map(g => { const isHome = g.homeTeam?.abbrev === abbrev; const opp = isHome ? g.awayTeam?.abbrev : g.homeTeam?.abbrev; return `${isHome ? 'vs' : '@'}${opp}`; }).join(', ')}. Results here will tell you everything about where this team is headed.` : ``,
        inPlayoffs ? `Bottom line: ${name} control their own destiny. Stay healthy, keep the power play clicking, don't give away points in overtime.`
            : `Bottom line: ${ptsBehind > 6 ? `${ptsBehind} points is a real hole — they need to be near-perfect the rest of the way.` : `${ptsBehind} points is very closeable — one good week and they're right back in it. No margin for error though.`}`
    ].filter(Boolean));
    return html;
}

// ── Awards ─────────────────────────────────────────────────
function awardsOpinion(award, q) {
    const opinions = {
        jack_adams: `<strong>Jack Adams Award — Coach of the Year</strong><br><br>The Jack Adams goes to the coach who got the most out of his roster. Voters love the guy who overachieved — took a middling team and turned them into a playoff contender.<br><br>${q.includes('lindy ruff') ? `<strong>Lindy Ruff</strong> winning the Jack Adams is a story about patience and trust. Ruff is one of the most experienced coaches in the league — when a coach with that pedigree gets the right pieces and the team responds, voters take notice.` : `The Jack Adams conversation is always one of the best debates of the awards season.`}`,
        hart: `<strong>Hart Trophy — NHL MVP</strong><br><br>The Hart goes to the player judged most valuable to his team — not just the best numbers, but who their team would miss the most. McDavid has made it his personal property in recent years, but when someone else carries a weaker team to the playoffs, the debate gets spicy.`,
        norris: `<strong>Norris Trophy — Best Defenceman</strong><br><br>The Norris goes to the defenceman who combines offensive production with defensive responsibility. Cale Makar has redefined what a modern blueliner looks like. Old school voters weight points. Modern analytics voters want shot suppression and tough minutes. The best Norris candidates do both.`,
        calder: `<strong>Calder Trophy — Rookie of the Year</strong><br><br>The Calder is always exciting — you're watching the next generation announce themselves. Voters love a guy who came in and immediately looked like a veteran. No adjustment period, just straight-up dominance from night one.`,
        conn_smythe: `<strong>Conn Smythe Trophy — Playoff MVP</strong><br><br>Handed out on the ice after the Cup is won. Usually goes to the best player on the winning team. Goalies who steal series are the classic Conn Smythe story. A forward who goes off for 15+ points in a run is almost a lock.`
    };
    return opinions[award] || fallback();
}

function tradeOpinion(q) {
    return `Trades and roster moves — the real chess match in the NHL.<br><br>${q.includes('deadline') ? `The trade deadline is the most chaotic 24 hours in hockey. The best deals address a specific need without gutting the prospect pool.` : `The best trades in NHL history look lopsided in hindsight. That's what makes the deadline and draft so compelling.`}<br><br>For the latest moves and rumours, TSN and Sportsnet are your best bets — and Elliotte Friedman's 32 Thoughts column is required reading.`;
}

function generalOpinion(q) {
    if ((q.includes('mackinnon') || q.includes('mckinnon')) && q.includes('mcdavid')) return playerComparison('mackinnon_mcdavid');
    if (q.includes('matthews') && q.includes('mcdavid')) return playerComparison('matthews_mcdavid');
    if (q.includes('crosby') && q.includes('mcdavid')) return playerComparison('crosby_mcdavid');
    if (q.includes('ovechkin') && q.includes('gretzky')) return playerComparison('ovechkin_gretzky');
    if (q.includes('best player') || q.includes('best in the nhl') || q.includes('greatest') || q.includes('goat')) return playerComparison('best_player');
    if (q.includes('overrated')) return `The most "overrated" players are usually guys who got massive contracts based on one great season. The truly elite — McDavid, MacKinnon, Matthews — are actually <em>underrated</em> because no contract captures what they bring nightly.`;
    if (q.includes('underrated')) return `Underrated players are the backbone of every championship team — the guys who kill penalties, block shots, win faceoffs, and never show up on the highlight reel. Every Cup winner has three or four of them.`;
    return `Good hockey debate. Get more specific and I'll dig in — player vs. player, award predictions, Cup contenders, team outlooks. That's where it gets fun. 🏒`;
}

function playerComparison(matchup) {
    const comparisons = {
        mackinnon_mcdavid: `<strong>MacKinnon vs. McDavid</strong> 🏒<br><br><strong>McDavid is the best player on the planet</strong> — the speed, the hands, the vision. There's never been anyone who does what he does at even strength.<br><br>But <strong>MacKinnon's case is legitimate</strong>. Most complete player in the game — elite in all three zones, Cup ring, competes harder than almost anyone.<br><br>McDavid makes you gasp. MacKinnon makes you win. <em>Friedman take: McDavid is the best player. MacKinnon is the best hockey player. There's a difference.</em>`,
        matthews_mcdavid: `<strong>Matthews vs. McDavid</strong> 🏒<br><br><strong>McDavid</strong> is the better all-around player — skating, playmaking, taking over a game at will.<br><br>But <strong>Matthews</strong> might be the purest goal scorer the NHL has seen in a generation. Fastest shot release in the league, legitimate 60-goal threat every season. McDavid wins the overall debate, but Matthews has carved out his own lane.`,
        crosby_mcdavid: `<strong>Crosby vs. McDavid</strong> 🏒<br><br><strong>Crosby</strong> — three Cups, two Olympic golds, every major award. Changed how the game is played.<br><br><strong>McDavid</strong> is doing things with the puck that Crosby never did. Peak for peak, McDavid might have the edge on pure skill. But Crosby's résumé is the standard. Until McDavid wins a Cup, Crosby holds the edge in the all-time conversation.`,
        ovechkin_gretzky: `<strong>Ovechkin vs. Gretzky</strong> 🏒<br><br>Ovechkin broke Gretzky's all-time goals record — one of the most remarkable achievements in sports history.<br><br>But Gretzky had 1,963 assists. Ovechkin has fewer total points than Gretzky has assists.<br><br>Ovechkin is the greatest goal scorer who ever lived. Gretzky is the greatest hockey player who ever lived. Those aren't the same thing.`,
        best_player: `<strong>Best player in the NHL right now?</strong> 🏒<br><br><strong>Connor McDavid</strong>. Multiple Hart Trophies, multiple scoring titles, makes plays no one else on the planet can make.<br><br>Second place: <strong>MacKinnon</strong> (most complete), <strong>Matthews</strong> (best goal scorer), <strong>Draisaitl</strong> (best player on 29 other teams). But McDavid is in a tier by himself.`
    };
    return comparisons[matchup] || generalOpinion('');
}

// ── Awards ─────────────────────────────────────────────────
function awardsOpinion(award, q) {
    const opinions = {
        jack_adams: `<strong>Jack Adams Award — Coach of the Year</strong><br><br>The Jack Adams goes to the coach who got the most out of his roster. Voters love the guy who overachieved — took a middling team and turned them into a playoff contender.<br><br>${q.includes('lindy ruff') ? `<strong>Lindy Ruff</strong> winning the Jack Adams is a story about patience and trust. Ruff is one of the most experienced coaches in the league — when a coach with that pedigree gets the right pieces and the team responds, voters take notice.` : `The Jack Adams conversation is always one of the best debates of the awards season.`}`,
        hart: `<strong>Hart Trophy — NHL MVP</strong><br><br>The Hart goes to the player judged most valuable to his team — not just the best numbers, but who their team would miss the most. McDavid has made it his personal property in recent years, but when someone else carries a weaker team to the playoffs, the debate gets spicy.`,
        norris: `<strong>Norris Trophy — Best Defenceman</strong><br><br>The Norris goes to the defenceman who combines offensive production with defensive responsibility. Cale Makar has redefined what a modern blueliner looks like. Old school voters weight points. Modern analytics voters want shot suppression and tough minutes. The best Norris candidates do both.`,
        calder: `<strong>Calder Trophy — Rookie of the Year</strong><br><br>The Calder is always exciting — you're watching the next generation announce themselves. Voters love a guy who came in and immediately looked like a veteran. No adjustment period, just straight-up dominance from night one.`,
        conn_smythe: `<strong>Conn Smythe Trophy — Playoff MVP</strong><br><br>Handed out on the ice after the Cup is won. Usually goes to the best player on the winning team. Goalies who steal series are the classic Conn Smythe story. A forward who goes off for 15+ points in a run is almost a lock.`
    };
    return opinions[award] || fallback();
}

function tradeOpinion(q) {
    return `Trades and roster moves — the real chess match in the NHL.<br><br>${q.includes('deadline') ? `The trade deadline is the most chaotic 24 hours in hockey. The best deadline deals address a specific need without gutting the prospect pool.` : `The best trades in NHL history look lopsided in hindsight. That's what makes the deadline and draft so compelling.`}<br><br>For the latest moves and rumours, TSN and Sportsnet are your best bets — and Elliotte Friedman's 32 Thoughts column is required reading.`;
}

function generalOpinion(q) {
    if ((q.includes('mackinnon') || q.includes('mckinnon')) && q.includes('mcdavid')) return playerComparison('mackinnon_mcdavid');
    if (q.includes('matthews') && q.includes('mcdavid')) return playerComparison('matthews_mcdavid');
    if (q.includes('crosby') && q.includes('mcdavid')) return playerComparison('crosby_mcdavid');
    if (q.includes('ovechkin') && q.includes('gretzky')) return playerComparison('ovechkin_gretzky');
    if (q.includes('best player') || q.includes('best in the nhl') || q.includes('greatest') || q.includes('goat')) return playerComparison('best_player');
    if (q.includes('overrated')) return `The most "overrated" players are usually guys who got massive contracts based on one great season. The truly elite — McDavid, MacKinnon, Matthews — are actually <em>underrated</em> because no contract captures what they bring nightly.`;
    if (q.includes('underrated')) return `Underrated players are the backbone of every championship team — the guys who kill penalties, block shots, win faceoffs, and never show up on the highlight reel. Every Cup winner has three or four of them.`;
    return `Good hockey debate. Get more specific and I'll dig in — player vs. player, award predictions, Cup contenders, team outlooks. That's where it gets fun. 🏒`;
}

function playerComparison(matchup) {
    const comparisons = {
        mackinnon_mcdavid: `<strong>MacKinnon vs. McDavid</strong> 🏒<br><br><strong>McDavid is the best player on the planet</strong> — the speed, the hands, the vision. There's never been anyone who does what he does at even strength.<br><br>But <strong>MacKinnon's case is legitimate</strong>. Most complete player in the game — elite in all three zones, Cup ring, competes harder than almost anyone.<br><br>McDavid makes you gasp. MacKinnon makes you win. <em>Friedman take: McDavid is the best player. MacKinnon is the best hockey player. There's a difference.</em>`,
        matthews_mcdavid: `<strong>Matthews vs. McDavid</strong> 🏒<br><br><strong>McDavid</strong> is the better all-around player — skating, playmaking, taking over a game at will.<br><br>But <strong>Matthews</strong> might be the purest goal scorer the NHL has seen in a generation. Fastest shot release in the league, legitimate 60-goal threat every season. McDavid wins the overall debate, but Matthews has carved out his own lane.`,
        crosby_mcdavid: `<strong>Crosby vs. McDavid</strong> 🏒<br><br><strong>Crosby</strong> — three Cups, two Olympic golds, every major award. Changed how the game is played.<br><br><strong>McDavid</strong> is doing things with the puck that Crosby never did. Peak for peak, McDavid might have the edge on pure skill. But until McDavid wins a Cup, Crosby holds the edge in the all-time conversation.`,
        ovechkin_gretzky: `<strong>Ovechkin vs. Gretzky</strong> 🏒<br><br>Ovechkin broke Gretzky's all-time goals record — one of the most remarkable achievements in sports history.<br><br>But Gretzky had 1,963 assists alone. Ovechkin has fewer total points than Gretzky has assists.<br><br>Ovechkin is the greatest goal scorer who ever lived. Gretzky is the greatest hockey player who ever lived. Those aren't the same thing.`,
        best_player: `<strong>Best player in the NHL right now?</strong> 🏒<br><br><strong>Connor McDavid</strong>. Multiple Hart Trophies, multiple scoring titles, makes plays no one else on the planet can make.<br><br>Second place: <strong>MacKinnon</strong> (most complete), <strong>Matthews</strong> (best goal scorer), <strong>Draisaitl</strong> (would be the best player on 29 other teams). But McDavid is in a tier by himself.`
    };
    return comparisons[matchup] || generalOpinion('');
}

// ── Rules ──────────────────────────────────────────────────
function explainSalaryCap() {
    return `<strong>The NHL Salary Cap</strong> 💰<br><br>Every team has the same maximum spend — around <strong>$88M USD</strong> right now.<br><br><strong>Cap hit</strong> = a player's average annual value. A 4-year $40M deal = $10M cap hit per year.<br><br><strong>Cap space</strong> = how much room a team has left to sign players. The cap forces GMs to make hard decisions — pay your star $12M or spread that across three solid players? The best GMs find value — players outperforming their cap hit. That's how you build a contender.`;
}

function explainDraft() {
    return `<strong>The NHL Draft</strong> 🎓<br><br>Every June, teams select amateur players in seven rounds. Worst teams pick first, best teams pick last.<br><br><strong>The Draft Lottery:</strong> Bottom teams don't automatically get the first pick — there's a lottery among non-playoff teams to prevent tanking.<br><br>A franchise centre or elite defenceman taken top-5 can change an organization for a decade. Teams guard their first-round picks fiercely in trades.`;
}

function explainPlayoffs() {
    return `<strong>NHL Playoff Format</strong> 🏆<br><br>16 teams make it — 8 from each conference. Top 3 in each division get automatic spots, plus 2 wild cards per conference. Best-of-seven all the way through.<br><br><strong>Home ice advantage:</strong> Higher seed hosts Games 1, 2, 5, and 7. In a tight series, home ice matters enormously.<br><br>The Stanley Cup Playoffs are 16 teams, four rounds, and two months of the most intense hockey of the year. Nothing else comes close.`;
}

function explainShootout() {
    return `<strong>The Shootout</strong> 🎯<br><br>If tied after regulation and a 5-minute 3-on-3 overtime, it goes to a shootout. Three shooters per team go one-on-one against the goalie. Most goals after three rounds wins — if still tied, sudden death.<br><br><strong>Points:</strong> Regulation win = 2 pts. OT/shootout win = 2 pts. OT/shootout loss = 1 pt (the "loser point"). That loser point is why standings get complicated.`;
}

function explainFighting() {
    return `<strong>Fighting in Hockey</strong> 🥊<br><br>Unlike other sports, fighting isn't an automatic game misconduct. Two players who mutually agree to fight get a 5-minute major each — but stay in the game.<br><br>The enforcer role has largely disappeared from the modern NHL. Cap constraints mean teams can't afford a player whose only job is to fight. But a fight can still shift momentum and send a message after a dirty hit. The NHL has never banned it outright.`;
}

function explainLines() {
    return `<strong>Hockey Lines & Pairings</strong> 📋<br><br>Teams dress 12 forwards (4 lines of 3) and 6 defencemen (3 pairs).<br><br>• <strong>First line</strong> — your stars. Most ice time, toughest matchups.<br>• <strong>Second line</strong> — strong contributors. Good teams have a second line that can score.<br>• <strong>Third line</strong> — checking line. Responsible, defensive, physical.<br>• <strong>Fourth line</strong> — energy, physicality, penalty killing.<br><br>The best teams have depth — when your fourth line scores, that's a great sign for your team's culture.`;
}

function explainFaceoffs() {
    return `<strong>Faceoffs</strong> 🔵<br><br>Every play starts with a faceoff — two players battle for the puck at a dot. Nine dots on the ice.<br><br>Winning a faceoff in your offensive zone means an immediate scoring chance. Winning in your defensive zone means clearing safely. Elite faceoff men win 55%+ of their draws — a massive edge over 82 games, especially on the penalty kill.`;
}

function explainIcing() {
    return `<strong>Icing</strong> 🚫<br><br>If a player shoots the puck from their own side of the red centre line and it crosses the opposing goal line untouched, that's icing. Play stops, faceoff comes back to the defensive zone of the team that iced it.<br><br><strong>Exception:</strong> Shorthanded teams can ice the puck — one of the few advantages of killing a penalty.<br><br><em>Think of it like not being allowed to punt in football just to avoid pressure. Same energy.</em>`;
}

function explainOffside() {
    return `<strong>Offside</strong> 🚦<br><br>A player is offside if they enter the offensive zone before the puck does. Both skates have to be over the blue line after the puck crosses.<br><br><strong>Coach's challenge:</strong> Since 2015, coaches can challenge offside on goals. If a player was offside on the zone entry that led to the goal — even 30 seconds earlier — the goal gets waved off.<br><br><em>Watch the linesman's eyes — tracking the puck and skates simultaneously. Toughest job on the ice.</em>`;
}

function explainPenalties() {
    return `<strong>Penalties & the Power Play</strong> ⚡<br><br>When a player commits a foul, they go to the box and their team plays shorthanded. The other team gets a <strong>power play</strong>.<br><br>• Common calls: Hooking, Tripping, Interference, Slashing, High-sticking<br>• <strong>Minor</strong> = 2 min (ends early if PP scores)<br>• <strong>Major</strong> = 5 min (does NOT end early)<br><br>A power play converting at 20%+ is elite. Special teams win playoff series.`;
}

function explainHatTrick() {
    return `<strong>Hat Trick</strong> 🎩<br><br>Three goals by one player in a single game. Fans throw their hats on the ice — a tradition going back to the 1940s.<br><br><strong>Natural hat trick:</strong> Three consecutive goals, uninterrupted. Way rarer, way more impressive.<br><br><strong>Gordie Howe hat trick:</strong> A goal, an assist, AND a fight in the same game. The ultimate power move.`;
}

function explainLingo(q) {
    const terms = {
        'bar down': `<strong>Bar down</strong> 🚨 — When a shot hits the crossbar and drops straight into the net. Makes a distinct "ping" that every hockey fan lives for. Pure filth.`,
        'top cheese': `<strong>Top cheese</strong> 🧀 — A shot that goes up high in the net, under the crossbar. Also called "top shelf" or "top cheddar." If someone went top cheese, the goalie had zero chance.`,
        'top shelf': `<strong>Top shelf</strong> 🧀 — Same as top cheese. A shot that beats the goalie up high, under the crossbar. Where mama hides the cookies.`,
        'celly': `<strong>Celly</strong> 🎉 — Short for celebration. What a player does after scoring. From the subtle fist pump to the full-on dive across the ice, the celly is an art form. Some guys have signature cellies. Some keep it cool. Either way, you earned it.`,
        'chirp': `<strong>Chirp</strong> 🗣️ — Trash talk on the ice. Hockey players are notorious chirpers. The best chirps are creative, quick, and land right after a big play. Getting chirped and not responding? That's a bad look.`,
        'dangle': `<strong>Dangle</strong> � — A sick stickhandling move that dekes out a defender or goalie. "He dangled right through the defense" means he made everyone look silly. Pure skill, maximum disrespect.`,
        'deke': `<strong>Deke</strong> 🏒 — A fake or feint move to get past a defender or goalie. Short for "decoy." The foundation of every great dangle.`,
        'snipe': `<strong>Snipe</strong> � — A perefectly placed shot that beats the goalie clean. No luck — just a shooter who knows exactly where they're putting it. A sniper is a player known for their shooting accuracy.`,
        'biscuit': `<strong>Biscuit</strong> 🏒 — The puck. "Put the biscuit in the basket" = score a goal. Hockey lingo makes everything sound better.`,
        'barn': `<strong>Barn</strong> 🏟️ — The arena. A packed barn with a rowdy crowd is one of the best atmospheres in sports.`,
        'twig': `<strong>Twig</strong> 🏒 — A hockey stick. Old school term from when sticks were made of wood. Players are very particular about their twigs — curve, flex, length. It's personal.`,
        'wheel': `<strong>Wheel</strong> 🛞 — To skate fast. "He can wheel" means serious speed. "Wheeling and dealing" means flying up the ice and making plays happen.`,
        'apple': `<strong>Apple</strong> 🍎 — An assist. "He had two apples on that goal." Some guys are apple merchants — they rack up assists without scoring much themselves.`,
        'beauty': `<strong>Beauty</strong> 😎 — A compliment. A great player, a great play, or a great person. "What a beauty." One of the highest compliments in hockey culture.`,
        'flow': `<strong>Flow</strong> 💇 — Long, beautiful hockey hair flowing out the back of the helmet. A rite of passage. The better the flow, the better the player — or so the legend goes.`,
        'gongshow': `<strong>Gongshow</strong> 🎪 — A chaotic, wild game or situation. "That third period was a total gongshow." Can be used positively (wild, exciting game) or negatively (complete mess).`,
        'barn burner': `<strong>Barn burner</strong> 🔥 — A high-scoring, back-and-forth, exciting game. The kind of game where both goalies are getting lit up and nobody's sitting down.`,
        'standing on his head': `<strong>Standing on his head</strong> 🥅 — A goalie making incredible saves, keeping his team in the game against all odds. "He was standing on his head out there" = the goalie was the only reason they didn't lose by five.`,
        'between the pipes': `<strong>Between the pipes</strong> 🥅 — In goal. The goalposts are the "pipes." "Who's between the pipes tonight?" = who's starting in goal?`,
        'backstop': `<strong>Backstop</strong> 🥅 — Another word for goalie. "Their backstop was unreal tonight."`,
        'blueliner': `<strong>Blueliner</strong> 🔵 — A defenceman. They play near the blue line. "Elite blueliner" = elite defenceman.`,
        'grinder': `<strong>Grinder</strong> 💪 — A hard-working, physical player who doesn't score much but contributes in other ways — winning battles, blocking shots, killing penalties. Every team needs grinders.`,
        'plug': `<strong>Plug</strong> 🔌 — A bad player. Not a compliment. "He's a plug" = he shouldn't be in the NHL.`,
        'pigeon': `<strong>Pigeon</strong> 🐦 — A player who benefits from playing with better teammates but can't produce on their own. "He's a pigeon" = his numbers are inflated by his linemates.`,
        'tape to tape': `<strong>Tape to tape</strong> 🎯 — A perfect pass, from one player's stick tape directly to another's. No bobbling, no chasing — just clean possession.`,
        'breakaway': `<strong>Breakaway</strong> 🏃 — When a player gets behind the defence and goes one-on-one with the goalie. One of the most exciting plays in hockey.`,
        'odd-man': `<strong>Odd-man rush</strong> ⚡ — When the attacking team has more players than defenders on a rush (2-on-1, 3-on-2). Creates high-danger scoring chances.`,
        'cycle': `<strong>Cycle</strong> 🔄 — When a team maintains possession in the offensive zone by moving the puck along the boards in a circular pattern, wearing down the defence.`,
        'forecheck': `<strong>Forecheck</strong> 🏒 — Aggressive pressure in the offensive zone to win the puck back. Teams with a strong forecheck are exhausting to play against.`,
        'backcheck': `<strong>Backcheck</strong> 🏃 — Forwards skating back hard to help defend against an opposing rush. "He doesn't backcheck" = a knock on a player's defensive effort.`,
        'trap': `<strong>Neutral zone trap</strong> 😴 — A defensive system where a team clogs the neutral zone to prevent odd-man rushes. Effective but boring to watch. The New Jersey Devils made it famous in the 90s.`,
        'five hole': `<strong>Five hole</strong> 🕳️ — The gap between a goalie's legs. Scoring five-hole means putting the puck right through the middle. Goalies hate giving up five-hole goals.`,
        'five-hole': `<strong>Five hole</strong> 🕳️ — The gap between a goalie's legs. Scoring five-hole means putting the puck right through the middle.`,
        'glove side': `<strong>Glove side</strong> 🧤 — The side of the net where the goalie holds their catching glove. A glove-side snipe is a thing of beauty.`,
        'blocker side': `<strong>Blocker side</strong> 🏒 — The side of the net where the goalie holds their stick (blocker). Generally considered the weaker side for most goalies.`,
        'wraparound': `<strong>Wraparound</strong> 🔄 — When a player skates around the back of the net and tries to tuck the puck in from behind the goal line. Requires quick hands and a sleeping goalie.`,
        'saucer pass': `<strong>Saucer pass</strong> 🛸 — A pass that floats through the air like a flying saucer to avoid a defender's stick. One of the prettiest plays in hockey when it connects.`,
        'one timer': `<strong>One-timer</strong> ⚡ — When a player shoots the puck immediately off a pass without stopping it first. The hardest shot in hockey to stop — the goalie has no time to set.`,
        'one-timer': `<strong>One-timer</strong> ⚡ — When a player shoots the puck immediately off a pass without stopping it first. The hardest shot in hockey to stop.`,
        'clapper': `<strong>Clapper</strong> 💥 — A slap shot. "He wound up and let a clapper go" = he took a big slap shot.`,
        'slap shot': `<strong>Slap shot</strong> 💥 — The hardest shot in hockey. Player winds up and slaps the puck with full force. Can reach 100+ mph. The clapper.`,
        'wrist shot': `<strong>Wrist shot</strong> 🎯 — A quick, accurate shot using wrist motion. More accurate than a slap shot, harder to read for goalies. The bread and butter of most snipers.`,
        'backhand': `<strong>Backhand</strong> 🔄 — A shot or pass using the back of the blade. Harder to execute but nearly impossible to read — goalies hate a good backhand.`,
        'spin-o-rama': `<strong>Spin-o-rama</strong> 🌀 — A move where a player spins 360 degrees while shooting or passing. Made famous by Peter Forsberg. Banned in shootouts but still legal in regular play.`,
        'spinorama': `<strong>Spin-o-rama</strong> 🌀 — A 360-degree spin move while shooting or passing. One of the most highlight-reel plays in hockey.`,
        'lacrosse': `<strong>Lacrosse goal / Michigan</strong> 🥍 — When a player picks the puck up on their stick blade and tucks it into the net from behind the goal, like a lacrosse shot. Also called "The Michigan." One of the most jaw-dropping plays in hockey.`,
        'michigan': `<strong>The Michigan</strong> 🥍 — When a player picks the puck up on their stick blade and tucks it into the net from behind the goal. Named after a move from college hockey. Mikael Granlund and Trevor Zegras have pulled it off in the NHL. Absolutely filthy.`,
        'coast to coast': `<strong>Coast to coast</strong> 🌊 — When a player carries the puck the entire length of the ice, from their own end to scoring. The ultimate individual effort. "He went coast to coast and buried it."`,
        'end to end': `<strong>End to end</strong> 🏒 — Same as coast to coast. A player carrying the puck the full length of the ice.`
    };
    for (const [term, explanation] of Object.entries(terms)) {
        if (q.includes(term)) return explanation;
    }
    return `Hockey has its own language — here are some classics you should know:<br><br>
<span class="suggestion" onclick="sendSuggestion(this)">Bar down</span>
<span class="suggestion" onclick="sendSuggestion(this)">Top cheese</span>
<span class="suggestion" onclick="sendSuggestion(this)">Celly</span>
<span class="suggestion" onclick="sendSuggestion(this)">Chirp</span>
<span class="suggestion" onclick="sendSuggestion(this)">Dangle</span>
<span class="suggestion" onclick="sendSuggestion(this)">Five hole</span>
<span class="suggestion" onclick="sendSuggestion(this)">The Michigan</span>
<span class="suggestion" onclick="sendSuggestion(this)">Saucer pass</span>`;
}

// ── Player Search ──────────────────────────────────────────
async function searchPlayer(q) {
    const cleaned = q.replace(/who is|tell me about|stats for|how is|how has|how many|player/g, '').trim();
    if (!cleaned || cleaned.length < 2) return `Who are you looking for? Give me a name and I'll pull up their numbers.`;
    const data = await nhlFetch(`https://search.d3.nhle.com/api/v1/search/player?culture=en-us&limit=5&q=${encodeURIComponent(cleaned)}&active=true`);
    if (!data || data.length === 0) return `Couldn't find anyone matching "${cleaned}" on the active roster. Double-check the spelling — even Elliotte Friedman has to confirm names sometimes.`;
    const info = await nhlFetch(`${NHL}/player/${data[0].playerId}/landing`);
    const s = info.featuredStats?.regularSeason?.subSeason;
    const isGoalie = info.position === 'G';
    const name = `${info.firstName?.default} ${info.lastName?.default}`;
    const statsHtml = s ? (isGoalie
        ? `<table class="stat-table"><thead><tr><th>GP</th><th>W</th><th>SV%</th><th>GAA</th><th>SO</th></tr></thead><tbody><tr><td>${s.gamesPlayed ?? '—'}</td><td>${s.wins ?? '—'}</td><td class="highlight">${s.savePctg?.toFixed(3) ?? '—'}</td><td>${s.goalsAgainstAverage?.toFixed(2) ?? '—'}</td><td>${s.shutouts ?? '—'}</td></tr></tbody></table>`
        : `<table class="stat-table"><thead><tr><th>GP</th><th>G</th><th>A</th><th>PTS</th><th>+/-</th></tr></thead><tbody><tr><td>${s.gamesPlayed ?? '—'}</td><td>${s.goals ?? '—'}</td><td>${s.assists ?? '—'}</td><td class="highlight">${s.points ?? '—'}</td><td>${s.plusMinus ?? '—'}</td></tr></tbody></table>`) : '';
    const pts = s?.points ?? 0;
    const notes = isGoalie
        ? [`SV% of ${s?.savePctg?.toFixed(3) ?? '—'} — ${(s?.savePctg ?? 0) > 0.930 ? "elite. Standing on his head." : (s?.savePctg ?? 0) > 0.915 ? "solid starter numbers." : "room to grow."}`]
        : [`${pts > 60 ? `${pts} points is a legitimate top-line season.` : pts > 40 ? `${pts} points — solid second-line contributor.` : `Still building — keep an eye on the development curve.`}`];
    return `<strong>${name}</strong> ${info.sweaterNumber ? `#${info.sweaterNumber}` : ''} — ${info.position} | ${info.fullTeamName?.default ?? ''}<br>
<span style="color:var(--text-muted);font-size:0.85rem">${info.currentAge ? `${info.currentAge} years old` : ''}${info.birthCountry ? ` · ${info.birthCountry}` : ''}</span><br><br>
<strong>This season:</strong>${statsHtml}<br>${breakdown('Rinkside Breakdown', notes)}`;
}

// ── Fallback ───────────────────────────────────────────────
function fallback() {
    return `That one's a little outside my crease. Here's what I can help with:<br><br>
<span class="suggestion" onclick="sendSuggestion(this)">📊 Current standings</span>
<span class="suggestion" onclick="sendSuggestion(this)">🎯 Top scorers</span>
<span class="suggestion" onclick="sendSuggestion(this)">🥅 Top goalies</span>
<span class="suggestion" onclick="sendSuggestion(this)">🏆 Cup prediction</span>
<span class="suggestion" onclick="sendSuggestion(this)">🎽 Jack Adams Award</span>
<span class="suggestion" onclick="sendSuggestion(this)">🏒 MacKinnon vs McDavid</span>`;
}

// ── Scoreboard Strip ───────────────────────────────────────
async function loadScoreboard() {
    const inner = document.getElementById('scoreboard-inner');
    try {
        const dateStr = new Date().toISOString().split('T')[0];
        const data = await nhlFetch(`${NHL}/schedule/${dateStr}`);
        const games = data.gameWeek?.[0]?.games || [];
        if (!games.length) {
            inner.innerHTML = `<span class="scoreboard-loading">No games scheduled today</span>`;
            return;
        }
        inner.innerHTML = games.map(g => {
            const away = g.awayTeam?.abbrev || '?';
            const home = g.homeTeam?.abbrev || '?';
            const isLive = g.gameState === 'LIVE' || g.gameState === 'CRIT';
            const isFinal = g.gameState === 'FINAL' || g.gameState === 'OFF';
            const scoreStr = (isLive || isFinal) ? `${g.awayTeam?.score ?? 0}–${g.homeTeam?.score ?? 0}` : 'vs';
            const status = isFinal ? 'Final' : isLive ? `P${g.periodDescriptor?.number} ${g.clock?.timeRemaining ?? ''}` : g.startTimeUTC ? new Date(g.startTimeUTC).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'TBD';
            return `<div class="scoreboard-game ${isLive ? 'live' : ''}">
                <span class="teams">${away} <span class="score">${scoreStr}</span> ${home}</span>
                <span class="status">${status}</span>
            </div>`;
        }).join('');
    } catch (e) {
        inner.innerHTML = `<span class="scoreboard-loading">Scoreboard unavailable</span>`;
    }
}

// ── Sidebar Stats ──────────────────────────────────────────
async function loadSidebarStats() {
    // Today panel
    try {
        const dateStr = new Date().toISOString().split('T')[0];
        const data = await nhlFetch(`${NHL}/schedule/${dateStr}`);
        const games = data.gameWeek?.[0]?.games || [];
        const facts = [
            'Wayne Gretzky holds 61 NHL records — including most goals, assists, and points.',
            'The Stanley Cup is the oldest professional sports trophy in North America, dating to 1893.',
            'A regulation NHL rink is 200 feet long and 85 feet wide.',
            'The fastest recorded shot in NHL history was 108.8 mph by Zdeno Chara.',
            'NHL players skate an average of 5 miles per game.',
            'The first NHL game was played on December 19, 1917.',
            'Connor McDavid has won the Hart Trophy multiple times before turning 30.',
            'Goalie pads can be no wider than 11 inches — a rule introduced to increase scoring.',
            'The "Original Six" era ran from 1942 to 1967 with just six teams in the league.',
            'A hockey puck is frozen before games to reduce bouncing on the ice.'
        ];
        const fact = facts[Math.floor(Math.random() * facts.length)];
        document.getElementById('today-content').innerHTML = `
            <div class="today-games">${games.length}</div>
            <div class="today-label">game${games.length !== 1 ? 's' : ''} today · ${new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
            <div class="today-fact">💡 ${fact}</div>`;
    } catch (e) {
        document.getElementById('today-content').innerHTML = `<span class="sidebar-loading">Unavailable</span>`;
    }

    // Top scorer
    try {
        const data = await nhlFetch(`${NHL}/skater-stats-leaders/current?categories=points&limit=1`);
        const p = data.points?.[0];
        if (p) {
            document.getElementById('top-scorer-content').innerHTML = `
                <div class="sidebar-stat-name">${p.firstName.default} ${p.lastName.default}</div>
                <div class="sidebar-stat-team">${p.teamAbbrevs}</div>
                <div class="sidebar-stat-value">${p.value}</div>
                <div class="sidebar-stat-label">points · ${p.goals ?? 0}G ${p.assists ?? 0}A</div>`;
        }
    } catch (e) {
        document.getElementById('top-scorer-content').innerHTML = `<span class="sidebar-loading">Unavailable</span>`;
    }

    // Top goalie
    try {
        const data = await nhlFetch(`${NHL}/goalie-stats-leaders/current?categories=savePctg&limit=1`);
        const g = data.savePctg?.[0];
        if (g) {
            document.getElementById('top-goalie-content').innerHTML = `
                <div class="sidebar-stat-name">${g.firstName.default} ${g.lastName.default}</div>
                <div class="sidebar-stat-team">${g.teamAbbrevs}</div>
                <div class="sidebar-stat-value">${g.value?.toFixed(3)}</div>
                <div class="sidebar-stat-label">save % · ${g.goalsAgainstAverage?.toFixed(2)} GAA</div>`;
        }
    } catch (e) {
        document.getElementById('top-goalie-content').innerHTML = `<span class="sidebar-loading">Unavailable</span>`;
    }
}

// Load on page start
loadScoreboard();
loadSidebarStats();
