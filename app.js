// ============================================================
// Rinkside App — app.js
// NHL chatbot with live API data, hockey fan voice
// ============================================================

const NHL_BASE = 'https://api-web.nhle.com/v1';

// --- 1. NHL API fetch with proxy fallback ---
async function nhlFetch(path) {
    const url = `${NHL_BASE}${path}`;
    const encoded = encodeURIComponent(url);

    // Try allorigins first
    try {
        const res = await fetch(`https://api.allorigins.win/get?url=${encoded}`);
        if (res.ok) {
            const data = await res.json();
            return JSON.parse(data.contents);
        }
    } catch (_) { }

    // Fallback: corsproxy.io
    try {
        const res = await fetch(`https://corsproxy.io/?${encoded}`);
        if (res.ok) return await res.json();
    } catch (_) { }

    // Last resort: direct
    const res = await fetch(url);
    if (!res.ok) throw new Error(`NHL API error: ${res.status}`);
    return res.json();
}

// ============================================================
// 2. Chat UI
// ============================================================

function addMessage(text, sender = 'bot') {
    const chat = document.getElementById('chat-messages');
    const msg = document.createElement('div');
    msg.className = `message ${sender}`;
    msg.innerHTML = `<div class="avatar">${sender === 'bot' ? '🏒' : '👤'}</div><div class="bubble">${text}</div>`;
    chat.appendChild(msg);
    chat.scrollTop = chat.scrollHeight;
}

function showTyping() {
    const chat = document.getElementById('chat-messages');
    const typing = document.createElement('div');
    typing.className = 'message bot typing';
    typing.id = 'typing';
    typing.innerHTML = `<div class="avatar">🏒</div><div class="bubble"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>`;
    chat.appendChild(typing);
    chat.scrollTop = chat.scrollHeight;
}

function hideTyping() {
    const el = document.getElementById('typing');
    if (el) el.remove();
}

function sendSuggestion(el) {
    const text = el.textContent.replace(/^[^\w]+/, '').trim();
    const input = document.getElementById('chat-input');
    if (input) {
        input.value = text;
        document.getElementById('chat-form').dispatchEvent(new Event('submit'));
    }
}

async function handleSubmit() {
    const input = document.getElementById('chat-input');
    const q = input.value.trim();
    if (!q) return;
    input.value = '';
    addMessage(q, 'user');
    showTyping();
    try {
        const reply = await getResponse(q);
        hideTyping();
        addMessage(reply, 'bot');
    } catch (e) {
        hideTyping();
        addMessage(`Oof, couldn't connect to the NHL API right now. Try again in a sec — even Bettman has bad days.`, 'bot');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('chat-form');
    if (form) {
        form.addEventListener('submit', e => {
            e.preventDefault();
            handleSubmit();
        });
    }
});

// ============================================================
// 3. Intent Router
// ============================================================

async function getResponse(q) {
    const lq = q.toLowerCase();

    if (match(lq, ['standings', 'league table', 'who is first', 'who leads', 'points leader', 'top team']))
        return getStandings();

    if (match(lq, ['score', 'scores', 'games today', 'results', 'last night', 'tonight', 'schedule', 'on tonight', 'playing tonight']))
        return getScores();

    if (match(lq, ['top scorer', 'top scorers', 'points leader', 'most points', 'scoring leader', 'leading scorer', 'point leader']))
        return getTopScorers();

    if (match(lq, ['goalie', 'goalies', 'save percentage', 'best goalie', 'top goalie', 'between the pipes', 'netminder', 'backstop']))
        return getTopGoalies();

    if (match(lq, ['jack adams', 'best coach', 'coach of the year']))
        return awardsOpinion('jack_adams', q);

    if (match(lq, ['hart trophy', 'hart memorial', 'mvp', 'most valuable', 'best player award']))
        return awardsOpinion('hart', q);

    if (match(lq, ['norris trophy', 'best defenceman', 'best defenseman', 'top d-man', 'norris']))
        return awardsOpinion('norris', q);

    if (match(lq, ['calder trophy', 'best rookie', 'rookie of the year', 'calder']))
        return awardsOpinion('calder', q);

    if (match(lq, ['conn smythe', 'playoff mvp', 'smythe']))
        return awardsOpinion('conn_smythe', q);

    if (match(lq, ['trade', 'signing', 'signed', 'traded', 'free agent', 'rumour', 'rumor', 'deadline']))
        return tradeOpinion(q);

    if (match(lq, ['stanley cup', 'cup winner', 'cup favourite', 'cup favorite', 'win the cup', 'best team', 'championship', 'cup prediction', 'who will win']))
        return getCupPrediction();

    if (match(lq, ['salary cap', 'cap space', 'cap hit', 'cap ceiling', 'ltir', 'buyout']))
        return explainSalaryCap();

    if (match(lq, ['draft', 'nhl draft', 'first overall', 'draft pick', 'prospect']))
        return explainDraft();

    if (match(lq, ['playoff format', 'how do playoffs work', 'playoff structure', 'wildcard', 'wild card', 'how playoffs']))
        return explainPlayoffs();

    if (match(lq, ['shootout', 'shoot out', 'penalty shots', 'skills competition']))
        return explainShootout();

    if (match(lq, ['fighting', 'fight', 'enforcer', 'dropping the gloves', 'fisticuffs']))
        return explainFighting();

    if (match(lq, ['lines', 'line combinations', 'fourth line', 'first line', 'line matching', 'forward lines']))
        return explainLines();

    if (match(lq, ['faceoff', 'face-off', 'face off', 'dot', 'circle']))
        return explainFaceoffs();

    if (match(lq, ['opinion', 'think', 'better', 'compare', 'vs', 'versus', 'greatest', 'goat', 'who is better', 'comparison']))
        return generalOpinion(q);

    // Team outlook — check before generic icing/offside
    const teamMatch = detectTeam(lq);
    if (teamMatch && match(lq, ['playoff', 'season', 'outlook', 'chances', 'contender', 'rebuild', 'cup run', 'how are', 'doing this']))
        return getTeamOutlook(teamMatch);

    if (match(lq, ['icing', 'icing the puck']))
        return explainIcing();

    if (match(lq, ['offside', 'off-side', 'off side']))
        return explainOffside();

    if (match(lq, ['penalty', 'penalties', 'power play', 'power-play', 'pp', 'shorthanded', 'pk', 'penalty kill']))
        return explainPenalties();

    if (match(lq, ['hat trick', 'hat-trick', 'three goals']))
        return explainHatTrick();

    if (match(lq, ['lingo', 'slang', 'terms', 'glossary', 'what does', 'what is a', 'bar down', 'top cheese', 'celly', 'chirp', 'dangle', 'snipe', 'biscuit', 'barn']))
        return explainLingo(q);

    if (match(lq, ['who is', 'tell me about', 'stats for', 'player', 'career']) || /^[a-z]+ [a-z]+$/.test(lq.trim()))
        return searchPlayer(q);

    return fallback(q);
}

// ============================================================
// 4. match() helper
// ============================================================

function match(str, keywords) {
    return keywords.some(k => str.includes(k));
}

// ============================================================
// 5. breakdown() helper
// ============================================================

function breakdown(title, notes) {
    const paras = notes.map(n => `<p>${n}</p>`).join('');
    return `<div style="border-left:3px solid var(--accent,#c8102e);padding:8px 12px;margin-top:10px;">
  <div style="font-variant:small-caps;font-weight:700;margin-bottom:6px;">${title}</div>
  ${paras}
</div>`;
}

// ============================================================
// 6. getStandings()
// ============================================================

async function getStandings() {
    const data = await nhlFetch('/standings/now');
    const teams = data.standings || [];
    if (!teams.length) return "Couldn't pull the standings right now — the ice must be getting resurfaced. Try again in a bit.";

    const east = teams.filter(t => t.conferenceName === 'Eastern').sort((a, b) => b.points - a.points).slice(0, 8);
    const west = teams.filter(t => t.conferenceName === 'Western').sort((a, b) => b.points - a.points).slice(0, 8);

    function tableRows(list) {
        return list.map((t, i) => {
            const name = t.teamName?.default || t.teamAbbrev?.default || 'Unknown';
            const abbrev = t.teamAbbrev?.default || '';
            const pts = t.points ?? 0;
            const gp = t.gamesPlayed ?? 0;
            const w = t.wins ?? 0;
            const l = t.losses ?? 0;
            const ot = t.otLosses ?? 0;
            return `<tr><td>${i + 1}</td><td><strong>${abbrev}</strong> ${name}</td><td>${gp}</td><td>${w}</td><td>${l}</td><td>${ot}</td><td><strong>${pts}</strong></td></tr>`;
        }).join('');
    }

    const table = (title, rows) => `
    <strong>${title}</strong>
    <table style="width:100%;border-collapse:collapse;font-size:0.85em;margin:6px 0 12px;">
      <thead><tr style="border-bottom:1px solid #444;">
        <th>#</th><th>Team</th><th>GP</th><th>W</th><th>L</th><th>OT</th><th>PTS</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;

    const leader = teams.sort((a, b) => b.points - a.points)[0];
    const leaderName = leader?.teamName?.default || 'the top team';

    return `Here's how the league looks right now — ${leaderName} sitting pretty at the top of the pile:
${table('🏒 Eastern Conference (Top 8)', tableRows(east))}
${table('🏒 Western Conference (Top 8)', tableRows(west))}
${breakdown('The Lay of the Land', [
        `${leaderName} leads the league in points — they've been dialled in all season.`,
        'The playoff picture is always shifting. Eight teams per conference make it, with the top three in each division guaranteed a spot.',
        'Ask me about a specific team\'s outlook, or who I think lifts the Cup!'
    ])}`;
}

// ============================================================
// 7. getScores()
// ============================================================

async function getScores() {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    let data;
    try {
        data = await nhlFetch(`/schedule/${dateStr}`);
    } catch (_) {
        return "Couldn't grab the schedule right now — the Zamboni must be blocking the API. Try again shortly.";
    }

    const games = data.gameWeek?.[0]?.games || [];
    if (!games.length) {
        return `No games found for ${dateStr}. Might be an off day — even the boys need rest. Try asking about standings or top scorers!`;
    }

    const lines = games.map(g => {
        const away = g.awayTeam?.abbrev || 'AWAY';
        const home = g.homeTeam?.abbrev || 'HOME';
        const awayScore = g.awayTeam?.score ?? '';
        const homeScore = g.homeTeam?.score ?? '';
        const state = g.gameState || '';
        const period = g.periodDescriptor?.periodType || '';
        const timeRemain = g.clock?.timeRemaining || '';

        let status = '';
        if (state === 'FINAL' || state === 'OFF') {
            status = `<span style="color:#aaa;">FINAL</span>`;
        } else if (state === 'LIVE' || state === 'CRIT') {
            status = `<span style="color:#c8102e;">LIVE — ${period} ${timeRemain}</span>`;
        } else {
            const startTime = g.startTimeUTC ? new Date(g.startTimeUTC).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD';
            status = `<span style="color:#aaa;">${startTime}</span>`;
        }

        const scoreStr = (awayScore !== '' && homeScore !== '') ? `${awayScore} – ${homeScore}` : 'vs';
        return `<div style="padding:4px 0;border-bottom:1px solid #333;"><strong>${away}</strong> ${scoreStr} <strong>${home}</strong> &nbsp; ${status}</div>`;
    }).join('');

    return `Here's the schedule for <strong>${dateStr}</strong>:<br><br>${lines}<br>
${breakdown('Quick Take', [
        `${games.length} game${games.length !== 1 ? 's' : ''} on the docket today.`,
        'Ask me about standings, top scorers, or who I think wins the Cup!'
    ])}`;
}

// ============================================================
// 8. getTopScorers()
// ============================================================

async function getTopScorers() {
    const data = await nhlFetch('/skater-stats-leaders/current?categories=points&limit=10');
    const scorers = data.points || [];
    if (!scorers.length) return "Can't pull the scoring leaders right now — try again in a sec.";

    const rows = scorers.map((p, i) => {
        const name = `${p.firstName?.default || ''} ${p.lastName?.default || ''}`.trim();
        const team = p.teamAbbrev || '';
        const pts = p.value ?? 0;
        const g = p.goals ?? 0;
        const a = p.assists ?? 0;
        const gp = p.gamesPlayed ?? 0;
        return `<tr><td>${i + 1}</td><td><strong>${name}</strong></td><td>${team}</td><td>${gp}</td><td>${g}</td><td>${a}</td><td><strong>${pts}</strong></td></tr>`;
    }).join('');

    const leader = scorers[0];
    const leaderName = `${leader?.firstName?.default || ''} ${leader?.lastName?.default || ''}`.trim();

    return `Top 10 scoring leaders right now — ${leaderName} is absolutely bar down this season:
<table style="width:100%;border-collapse:collapse;font-size:0.85em;margin:8px 0;">
  <thead><tr style="border-bottom:1px solid #444;">
    <th>#</th><th>Player</th><th>Team</th><th>GP</th><th>G</th><th>A</th><th>PTS</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
${breakdown('Scoring Race Breakdown', [
        `${leaderName} is leading the pack — pure top cheese every night.`,
        'Points leaders often drive Hart Trophy conversations. Ask me who I think wins the Hart!',
        'Want to compare two players head-to-head? Just ask — e.g. "Matthews vs McDavid".'
    ])}`;
}

// ============================================================
// 9. getTopGoalies()
// ============================================================

async function getTopGoalies() {
    const data = await nhlFetch('/goalie-stats-leaders/current?categories=savePctg&limit=10');
    const goalies = data.savePctg || [];
    if (!goalies.length) return "Can't pull goalie stats right now — the crease is empty. Try again shortly.";

    const rows = goalies.map((g, i) => {
        const name = `${g.firstName?.default || ''} ${g.lastName?.default || ''}`.trim();
        const team = g.teamAbbrev || '';
        const svPct = g.value != null ? (g.value * 100).toFixed(2) + '%' : 'N/A';
        const gp = g.gamesPlayed ?? 0;
        const wins = g.wins ?? 0;
        const gaa = g.goalsAgainstAverage != null ? g.goalsAgainstAverage.toFixed(2) : 'N/A';
        return `<tr><td>${i + 1}</td><td><strong>${name}</strong></td><td>${team}</td><td>${gp}</td><td>${wins}</td><td>${gaa}</td><td><strong>${svPct}</strong></td></tr>`;
    }).join('');

    const leader = goalies[0];
    const leaderName = `${leader?.firstName?.default || ''} ${leader?.lastName?.default || ''}`.trim();

    return `Top 10 goalies by save percentage — ${leaderName} is absolutely standing on his head between the pipes:
<table style="width:100%;border-collapse:collapse;font-size:0.85em;margin:8px 0;">
  <thead><tr style="border-bottom:1px solid #444;">
    <th>#</th><th>Goalie</th><th>Team</th><th>GP</th><th>W</th><th>GAA</th><th>SV%</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
${breakdown('Between the Pipes', [
        `${leaderName} leads all netminders in save percentage — that's a Vezina-calibre season.`,
        'A great goalie can steal a series. Ask me about the Vezina Trophy or Cup predictions!',
        'Goaltending wins championships — it\'s the most important position on the ice.'
    ])}`;
}

// ============================================================
// 10. awardsOpinion()
// ============================================================

function awardsOpinion(award, q) {
    const opinions = {
        jack_adams: {
            title: 'Jack Adams Award — Best Coach',
            body: `The Jack Adams is all about who got the most out of their roster. Right now the conversation usually circles around coaches who took a middling team and turned them into a playoff contender — that's the real test. A guy who inherits a 100-point team and wins 100 points isn't the story. Give me the coach who had no business being in the playoff race and found a way.`,
            notes: [
                'Look for coaches who overachieved relative to their roster talent.',
                'System matters — teams that defend well and transition quickly reflect great coaching.',
                'Mid-season adjustments after injuries or slumps are a huge factor voters consider.'
            ]
        },
        hart: {
            title: 'Hart Trophy — League MVP',
            body: `The Hart is the most debated trophy in hockey. Is it the best player, or the most valuable to his team? Historically voters lean toward the guy whose team would fall apart without him. McDavid has made it his personal property in recent years, but when a guy on a weaker team puts up monster numbers, the conversation gets spicy.`,
            notes: [
                'McDavid and Draisaitl have dominated Hart voting — Edmonton\'s offence runs through them.',
                'A player on a playoff team almost always wins — narrative matters.',
                'Watch for a breakout season from a guy carrying a rebuilding team — that\'s a Hart story.'
            ]
        },
        norris: {
            title: 'Norris Trophy — Best Defenceman',
            body: `The Norris goes to the defenceman who combines offensive production with defensive responsibility. Cale Makar has redefined what a modern blueliner looks like — he's a power play quarterback, a transition driver, and a shutdown guy all in one. But don't sleep on the two-way guys who don't light up the scoresheet — they get votes too.`,
            notes: [
                'Makar, Fox, and Hedman are perennial Norris candidates.',
                'Points matter, but so does plus/minus, ice time, and defensive zone starts.',
                'The best defencemen today are essentially a third forward on the power play.'
            ]
        },
        calder: {
            title: 'Calder Trophy — Best Rookie',
            body: `The Calder is always exciting because you're watching the next generation announce themselves. The best Calder races happen when two or three rookies are all having historic seasons. Voters love a guy who came in and immediately looked like a veteran — no adjustment period, just straight-up dominance from night one.`,
            notes: [
                'Eligibility: players in their first NHL season with fewer than 25 prior games.',
                'Forwards tend to win more often, but a dominant rookie defenceman can steal it.',
                'Watch for rookies on playoff teams — they get more exposure and votes.'
            ]
        },
        conn_smythe: {
            title: 'Conn Smythe Trophy — Playoff MVP',
            body: `The Conn Smythe is the most dramatic trophy in hockey. It's handed out in the moment, on the ice, after the Cup is won. Usually it goes to the best player on the winning team — but occasionally a guy on the losing side has such a ridiculous series that voters can't ignore him. Goalies who steal series are the classic Conn Smythe story.`,
            notes: [
                'Goalies win the Conn Smythe more than any other position — standing on his head in the playoffs is the ultimate narrative.',
                'A forward who goes off for 15+ points in a run is almost a lock.',
                'The Conn Smythe is about moments — overtime goals, shutouts, series-defining performances.'
            ]
        }
    };

    const a = opinions[award];
    if (!a) return fallback(q);

    return `<strong>${a.title}</strong><br><br>${a.body}<br>${breakdown('Key Factors', a.notes)}`;
}

// ============================================================
// 11. tradeOpinion()
// ============================================================

function tradeOpinion(q) {
    return `Trades and signings — the lifeblood of the offseason and the trade deadline. Here's how I think about roster moves:
${breakdown('Trade Deadline Philosophy', [
        'Buyers need to ask: does this move actually push us over the top, or are we just rearranging deck chairs?',
        'Sellers should be aggressive — rental players rarely re-sign, so get the picks and prospects while you can.',
        'The best trades are the ones that look lopsided at first but age well. Patience is a virtue in the NHL.',
        'Cap retention is the secret weapon — teams can move expensive players by eating part of the salary.',
        'Always follow the picks. A first-round pick is currency. Two firsts and a prospect? That\'s a franchise-altering deal.'
    ])}
<br>Want me to look up a specific player or team? Just ask — I can pull live stats and standings to give you context on any move.`;
}

// ============================================================
// 12. generalOpinion() — with player comparison routing
// ============================================================

function generalOpinion(q) {
    const lq = q.toLowerCase();

    // Route to player comparisons first
    if (match(lq, ['mackinnon']) && match(lq, ['mcdavid']))
        return playerComparison('mackinnon_mcdavid');
    if (match(lq, ['matthews']) && match(lq, ['mcdavid']))
        return playerComparison('matthews_mcdavid');
    if (match(lq, ['crosby']) && match(lq, ['mcdavid']))
        return playerComparison('crosby_mcdavid');
    if ((match(lq, ['ovechkin']) && match(lq, ['gretzky'])) || match(lq, ['ovi vs gretzky', 'gretzky vs ovi']))
        return playerComparison('ovechkin_gretzky');
    if (match(lq, ['best player', 'greatest player', 'best in the world', 'best player in the nhl', 'goat']))
        return playerComparison('best_player');

    // Generic opinion
    return `Hot take incoming — hockey opinions are my bread and butter. Here's where I stand on the big picture:
${breakdown('State of the Game', [
        'The NHL is in a golden era of skill. The speed and skill level today is unlike anything we\'ve seen — McDavid, Makar, Matthews, MacKinnon are all playing at a level that would\'ve been science fiction 20 years ago.',
        'Goaltending is the great equalizer. Any team with a hot goalie in April is dangerous — that\'s what makes the playoffs so unpredictable.',
        'The salary cap has created parity. No dynasty lasts forever anymore — you build a window and you go for it.',
        'Ask me something specific — player comparisons, award picks, Cup predictions. I\'ve got opinions on all of it.'
    ])}`;
}

// ============================================================
// 13. playerComparison()
// ============================================================

function playerComparison(key) {
    const comparisons = {
        mackinnon_mcdavid: `<strong>MacKinnon vs McDavid — the debate that never gets old.</strong><br><br>
McDavid is the fastest human being to ever lace up skates. His edge work and acceleration are genuinely supernatural — he makes NHL defencemen look like pylons. But MacKinnon? He's the most complete player in the game. Stronger on pucks, better in his own end, and just as dangerous offensively. McDavid has the edge in pure skill ceiling, but MacKinnon has the Cup ring and the two-way game to back it up.
${breakdown('The Verdict', [
            'McDavid: best pure skater and puck-handler in NHL history. Generational talent.',
            'MacKinnon: more complete player, better in all three zones, proven winner.',
            'If you\'re building a team to win now? MacKinnon. If you want the most electrifying player alive? McDavid.',
            'Both are top-3 players in NHL history by the time they\'re done. We\'re lucky to watch them both.'
        ])}`,

        matthews_mcdavid: `<strong>Matthews vs McDavid — the great rivalry of this generation.</strong><br><br>
Matthews is the most lethal goal scorer in the modern game. His shot is bar down from anywhere — wrist shot, one-timer, backhand, doesn't matter. He's a 60-goal scorer in a 60-goal era. McDavid is the better all-around player — more assists, more playmaking, more speed — but Matthews makes the argument that pure goal-scoring is its own superpower.
${breakdown('The Verdict', [
            'McDavid leads in points, assists, and skating — he\'s the better overall player by most metrics.',
            'Matthews leads in goals and shooting percentage — nobody scores like him right now.',
            'McDavid has more Hart Trophies. Matthews has a Cup ring. Both arguments are valid.',
            'This rivalry is good for hockey. Two different styles, both elite, both must-watch every night.'
        ])}`,

        crosby_mcdavid: `<strong>Crosby vs McDavid — the generational handoff debate.</strong><br><br>
Crosby is the gold standard. Two Cups, three Hart Trophies, the most complete player of his era. He does everything — scores, sets up, wins faceoffs, plays in his own end, leads in the room. McDavid has the higher skill ceiling and is already putting up numbers that rival Crosby's best seasons. But Crosby has the hardware and the legacy.
${breakdown('The Verdict', [
            'Crosby: two Cups, three Harts, the most complete player of the 2000s. The benchmark.',
            'McDavid: generationally faster, already has multiple scoring titles and Hart Trophies.',
            'Crosby wins the legacy argument today. McDavid has time to close the gap.',
            'Ask any scout — they\'d take either one first overall without blinking.'
        ])}`,

        ovechkin_gretzky: `<strong>Ovechkin vs Gretzky — the goal-scoring GOAT debate.</strong><br><br>
Gretzky's 894 goals is the record Ovechkin chased his whole career — and he got there. But Gretzky's 2,857 points is a different planet entirely. Ovi is the greatest goal scorer in NHL history, full stop. Gretzky is the greatest point producer, playmaker, and overall player. They're not really comparable — they're both the best at different things.
${breakdown('The Verdict', [
            'Gretzky: 2,857 points. His assist total alone beats every player\'s total points. Untouchable.',
            'Ovechkin: broke the all-time goals record. The most prolific goal scorer the game has ever seen.',
            'Gretzky wins the GOAT debate on total impact. Ovi wins the pure goal-scoring debate.',
            'Both are once-in-a-century talents. The NHL was lucky to have them both.'
        ])}`,

        best_player: `<strong>Best player in the NHL right now?</strong><br><br>
Connor McDavid. It's not really a debate. He's won multiple Hart Trophies, multiple scoring titles, and he makes plays that literally no one else on the planet can make. But the conversation is richer than just one name.
${breakdown('Top 5 Right Now', [
            '1. Connor McDavid — the best player alive. Fastest, most skilled, most dominant.',
            '2. Nathan MacKinnon — most complete player in the game. Cup winner. Two-way monster.',
            '3. Auston Matthews — best goal scorer in the modern era. Lethal from anywhere.',
            '4. Cale Makar — best defenceman in the world. Redefining the position.',
            '5. Leon Draisaitl — elite scorer, elite playmaker, makes McDavid even better.'
        ])}`
    };

    return comparisons[key] || generalOpinion('opinion');
}

// ============================================================
// 14. getCupPrediction() — live standings + analytical breakdown
// ============================================================

async function getCupPrediction() {
    let teams = [];
    try {
        const data = await nhlFetch('/standings/now');
        teams = data.standings || [];
    } catch (_) {
        return "Can't pull live standings right now — but my Cup pick is always the team with the hottest goalie in April. Ask me again in a sec!";
    }

    const sorted = [...teams].sort((a, b) => b.points - a.points);
    const top5 = sorted.slice(0, 5);

    const rows = top5.map((t, i) => {
        const name = t.teamName?.default || t.teamAbbrev?.default || 'Unknown';
        const abbrev = t.teamAbbrev?.default || '';
        const pts = t.points ?? 0;
        const gp = t.gamesPlayed ?? 0;
        const w = t.wins ?? 0;
        return `<tr><td>${i + 1}</td><td><strong>${abbrev}</strong> ${name}</td><td>${gp}</td><td>${w}</td><td><strong>${pts}</strong></td></tr>`;
    }).join('');

    const east = teams.filter(t => t.conferenceName === 'Eastern').sort((a, b) => b.points - a.points)[0];
    const west = teams.filter(t => t.conferenceName === 'Western').sort((a, b) => b.points - a.points)[0];
    const overall = sorted[0];

    const overallName = overall?.teamName?.default || 'the top team';
    const eastName = east?.teamName?.default || 'the East leader';
    const westName = west?.teamName?.default || 'the West leader';

    return `<strong>Stanley Cup Prediction — based on live standings</strong><br><br>
Here are the top 5 teams in the league right now:
<table style="width:100%;border-collapse:collapse;font-size:0.85em;margin:8px 0;">
  <thead><tr style="border-bottom:1px solid #444;">
    <th>#</th><th>Team</th><th>GP</th><th>W</th><th>PTS</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
${breakdown('Cup Breakdown', [
        `${overallName} leads the league in points — they're the favourite on paper, but the regular season means nothing if you don't have a goalie who can steal games in April.`,
        `In the East, ${eastName} has been the most consistent team. They've got the depth and the structure to go deep.`,
        `In the West, ${westName} is the team everyone is watching. If their goaltending holds, they're dangerous.`,
        'The Cup is decided by goaltending, special teams, and health. The best team in October rarely lifts it in June.',
        'My formula: take the team with the best goalie, add a power play that clicks at 25%+, and give me a coach who can adjust between periods. That\'s your Cup winner.',
        'Ask me about a specific team\'s outlook — I\'ll pull their schedule and standings and give you the real breakdown.'
    ])}`;
}

// ============================================================
// 15. TEAM_MAP — all 32 NHL teams
// ============================================================

const TEAM_MAP = {
    // Atlantic
    'boston bruins': 'BOS', 'bruins': 'BOS',
    'buffalo sabres': 'BUF', 'sabres': 'BUF',
    'detroit red wings': 'DET', 'red wings': 'DET',
    'florida panthers': 'FLA', 'panthers': 'FLA',
    'montreal canadiens': 'MTL', 'canadiens': 'MTL', 'habs': 'MTL',
    'ottawa senators': 'OTT', 'senators': 'OTT', 'sens': 'OTT',
    'tampa bay lightning': 'TBL', 'lightning': 'TBL', 'bolts': 'TBL',
    'toronto maple leafs': 'TOR', 'maple leafs': 'TOR', 'leafs': 'TOR',
    // Metropolitan
    'carolina hurricanes': 'CAR', 'hurricanes': 'CAR', 'canes': 'CAR',
    'columbus blue jackets': 'CBJ', 'blue jackets': 'CBJ',
    'new jersey devils': 'NJD', 'devils': 'NJD',
    'new york islanders': 'NYI', 'islanders': 'NYI',
    'new york rangers': 'NYR', 'rangers': 'NYR',
    'philadelphia flyers': 'PHI', 'flyers': 'PHI',
    'pittsburgh penguins': 'PIT', 'penguins': 'PIT', 'pens': 'PIT',
    'washington capitals': 'WSH', 'capitals': 'WSH', 'caps': 'WSH',
    // Central
    'arizona coyotes': 'ARI', 'coyotes': 'ARI', 'yotes': 'ARI',
    'utah hockey club': 'UTA', 'utah': 'UTA',
    'chicago blackhawks': 'CHI', 'blackhawks': 'CHI', 'hawks': 'CHI',
    'colorado avalanche': 'COL', 'avalanche': 'COL', 'avs': 'COL',
    'dallas stars': 'DAL', 'stars': 'DAL',
    'minnesota wild': 'MIN', 'wild': 'MIN',
    'nashville predators': 'NSH', 'predators': 'NSH', 'preds': 'NSH',
    'st. louis blues': 'STL', 'blues': 'STL',
    'winnipeg jets': 'WPG', 'jets': 'WPG',
    // Pacific
    'anaheim ducks': 'ANA', 'ducks': 'ANA',
    'calgary flames': 'CGY', 'flames': 'CGY',
    'edmonton oilers': 'EDM', 'oilers': 'EDM',
    'los angeles kings': 'LAK', 'kings': 'LAK',
    'san jose sharks': 'SJS', 'sharks': 'SJS',
    'seattle kraken': 'SEA', 'kraken': 'SEA',
    'vancouver canucks': 'VAN', 'canucks': 'VAN',
    'vegas golden knights': 'VGK', 'golden knights': 'VGK', 'knights': 'VGK'
};

// ============================================================
// 16. detectTeam()
// ============================================================

function detectTeam(lq) {
    for (const [name, abbrev] of Object.entries(TEAM_MAP)) {
        if (lq.includes(name)) return abbrev;
    }
    return null;
}

// ============================================================
// 17. getTeamOutlook() — standings + schedule, playoff analysis
// ============================================================

async function getTeamOutlook(abbrev) {
    let standingsData, scheduleData;
    try {
        [standingsData, scheduleData] = await Promise.all([
            nhlFetch('/standings/now'),
            nhlFetch(`/club-schedule-season/${abbrev}/now`)
        ]);
    } catch (_) {
        return `Couldn't pull data for ${abbrev} right now — try again in a moment.`;
    }

    const standings = standingsData.standings || [];
    const teamStanding = standings.find(t => t.teamAbbrev?.default === abbrev);

    if (!teamStanding) {
        return `Couldn't find standings data for ${abbrev}. Double-check the team name and try again.`;
    }

    const name = teamStanding.teamName?.default || abbrev;
    const pts = teamStanding.points ?? 0;
    const gp = teamStanding.gamesPlayed ?? 0;
    const w = teamStanding.wins ?? 0;
    const l = teamStanding.losses ?? 0;
    const ot = teamStanding.otLosses ?? 0;
    const conf = teamStanding.conferenceName || 'Conference';
    const div = teamStanding.divisionName || 'Division';
    const divRank = teamStanding.divisionSequence ?? '?';
    const confRank = teamStanding.conferenceSequence ?? '?';
    const wildcardRank = teamStanding.wildcardSequence ?? '?';

    // Next few games from schedule
    const games = scheduleData.games || [];
    const upcoming = games
        .filter(g => g.gameState === 'FUT' || g.gameState === 'PRE')
        .slice(0, 3);

    const upcomingStr = upcoming.length
        ? upcoming.map(g => {
            const opp = g.awayTeam?.abbrev === abbrev ? g.homeTeam?.abbrev : g.awayTeam?.abbrev;
            const loc = g.awayTeam?.abbrev === abbrev ? '@ ' : 'vs ';
            const date = g.gameDate || '';
            return `<li>${date} — ${loc}<strong>${opp}</strong></li>`;
        }).join('')
        : '<li>No upcoming games found</li>';

    // Playoff analysis
    const inPlayoffs = confRank <= 8;
    const playoffStatus = inPlayoffs
        ? `<span style="color:#4caf50;">✔ In a playoff spot</span> (${conf} rank: ${confRank})`
        : `<span style="color:#c8102e;">✘ Outside playoff picture</span> (${conf} rank: ${confRank}, Wildcard: ${wildcardRank})`;

    const ptsPace = gp > 0 ? ((pts / gp) * 82).toFixed(0) : 'N/A';

    return `<strong>${name} — Season Outlook</strong><br><br>
<table style="width:100%;border-collapse:collapse;font-size:0.85em;margin:6px 0;">
  <tr><td><strong>Record</strong></td><td>${w}–${l}–${ot}</td></tr>
  <tr><td><strong>Points</strong></td><td>${pts} (${gp} GP)</td></tr>
  <tr><td><strong>Points Pace</strong></td><td>${ptsPace} pts over 82 games</td></tr>
  <tr><td><strong>Division</strong></td><td>${div} (Rank: ${divRank})</td></tr>
  <tr><td><strong>Playoff Status</strong></td><td>${playoffStatus}</td></tr>
</table>
<br><strong>Upcoming Games:</strong><ul>${upcomingStr}</ul>
${breakdown('Analyst Take', [
        inPlayoffs
            ? `${name} is in the mix — ${pts} points and a ${conf} rank of ${confRank} puts them in the conversation. The question is whether they can hold on or push higher.`
            : `${name} is on the outside looking in right now. They need to string wins together fast — every point matters at this stage of the season.`,
        `At a ${ptsPace}-point pace over 82 games, you get a sense of where this team is trending.`,
        'Goaltending and special teams will decide if they make a run. Ask me about their division rivals or Cup contenders!'
    ])}`;
}

// ============================================================
// 18. explainSalaryCap()
// ============================================================

function explainSalaryCap() {
    return `The NHL salary cap is the great equalizer — every team has the same ceiling, which is what makes the league so competitive.
${breakdown('Salary Cap 101', [
        'The cap ceiling is set each summer based on league revenues. Teams cannot exceed it at any point during the season.',
        'Cap hit is the average annual value (AAV) of a contract — a 5-year, $50M deal has a $10M cap hit per year.',
        'LTIR (Long-Term Injured Reserve) allows teams to exceed the cap if a player with a cap hit ≥ $3,900 is injured for 10+ games and 24+ days. It\'s a loophole teams use aggressively.',
        'Buyouts let teams terminate a contract early, but they still count against the cap at a reduced rate for twice the remaining contract length.',
        'Cap space is the difference between the cap ceiling and a team\'s current commitments. Teams need to keep enough space to sign their roster.',
        'The cap floor is the minimum teams must spend — usually about $20M below the ceiling. Small-market teams sometimes struggle to hit it.'
    ])}`;
}

// ============================================================
// 19. explainDraft()
// ============================================================

function explainDraft() {
    return `The NHL Draft is where franchises are built — or rebuilt. It's the most important event of the offseason.
${breakdown('NHL Draft Explained', [
        'The draft has 7 rounds. Teams pick in reverse order of the previous season\'s standings — worst team picks first.',
        'The Draft Lottery determines the top picks. The 16 teams that missed the playoffs enter, with the worst teams getting the best odds. No team can win the lottery more than twice in a row.',
        'First-round picks are gold. A top-10 pick can change a franchise. Teams trade picks years in advance to move up or acquire talent.',
        'European players (especially Russians and Swedes) have historically been undervalued in early rounds — that\'s changed significantly.',
        'Goalies are notoriously hard to project. Most teams avoid taking a goalie in the first round.',
        'The best drafts in history produced multiple Hall of Famers. The 2003 draft (Crosby year) is considered the greatest ever.'
    ])}`;
}

// ============================================================
// 20. explainPlayoffs()
// ============================================================

function explainPlayoffs() {
    return `The NHL playoffs are the most intense postseason in professional sports. Here's how it works:
${breakdown('Playoff Format', [
        '16 teams qualify — 8 from each conference. The top 3 teams in each division get automatic spots, plus 2 wildcards per conference.',
        'Round 1: Division matchups. 1st in division vs 2nd wildcard, 2nd in division vs 1st wildcard. Best-of-7.',
        'Round 2 (Conference Semifinals): Division winners face each other. Best-of-7.',
        'Round 3 (Conference Finals): One team from each conference advances. Best-of-7.',
        'Stanley Cup Final: East vs West. Best-of-7. The winner gets the Cup.',
        'Home ice advantage goes to the higher seed. In a Game 7, home ice matters enormously.',
        'Overtime in the playoffs is sudden death — no shootouts. They play until someone scores, no matter how long it takes. The longest game in history went 6 OT periods.'
    ])}`;
}

// ============================================================
// 21. explainShootout()
// ============================================================

function explainShootout() {
    return `The shootout — hockey's version of a penalty shootout, and just as controversial.
${breakdown('How the Shootout Works', [
        'If a game is tied after 60 minutes of regulation, teams play a 5-minute 3-on-3 overtime period.',
        'If still tied after OT, it goes to a shootout. Each team selects 3 shooters who go one-on-one against the goalie.',
        'The team with more goals after 3 rounds wins. If still tied, it goes to sudden death — one shooter per team until someone scores and the other doesn\'t.',
        'Coaches choose their shooters strategically — some guys are elite in shootouts, others fall apart under pressure.',
        'A shootout win counts as 2 points in the standings. The losing team gets 1 point (the OT loss point).',
        'Purists hate the shootout — they\'d rather play 4-on-4 or 3-on-3 until someone scores. The debate never ends.'
    ])}`;
}

// ============================================================
// 22. explainFighting()
// ============================================================

function explainFighting() {
    return `Fighting in hockey — one of the most debated topics in the sport.
${breakdown('Fighting in the NHL', [
        'Fighting is technically illegal but tolerated under Rule 46. Players who fight receive a 5-minute major penalty.',
        'The enforcer role has largely disappeared from the modern NHL. Cap constraints mean teams can\'t afford to carry a player whose only job is to fight.',
        'Historically, fighting served as "self-policing" — players would answer for dirty hits with their fists. The code was real.',
        'Today, supplemental discipline (suspensions and fines from the Department of Player Safety) has replaced much of that role.',
        'Staged fights — two willing combatants dropping the gloves — are rare now. Most fights happen organically after a big hit.',
        'The debate: does fighting protect skilled players, or is it just violence for entertainment? The league has quietly let it fade without banning it outright.'
    ])}`;
}

// ============================================================
// 23. explainLines()
// ============================================================

function explainLines() {
    return `Line combinations are the chess match within the game — coaches spend hours getting them right.
${breakdown('Forward Lines & Defence Pairs', [
        'Teams dress 12 forwards (4 lines of 3) and 6 defencemen (3 pairs). Lines rotate every 45–60 seconds.',
        'The first line is your best offensive unit — usually your top centre flanked by two wingers. This is where your stars play.',
        'The second line is your secondary scoring threat. A good second line is the difference between a contender and a pretender.',
        'The third line is typically a two-way checking line — responsible, defensive, but can chip in offensively.',
        'The fourth line is the energy line — physical, hard-working, and there to change the momentum. They don\'t play much but their shifts matter.',
        'Line matching is when coaches try to get their best line against the opponent\'s worst, or their checking line against the opponent\'s stars. Home teams have last change, which is a huge advantage.',
        'Defence pairs: top pair handles the toughest minutes, second pair is solid two-way, third pair is sheltered.'
    ])}`;
}

// ============================================================
// 24. explainFaceoffs()
// ============================================================

function explainFaceoffs() {
    return `Faceoffs — the most underrated skill in hockey, and one of the most important.
${breakdown('Faceoffs Explained', [
        'A faceoff starts play after a stoppage. The referee drops the puck between two opposing centres.',
        'There are 9 faceoff dots on the ice — one at centre, two in each zone\'s corners, and two in the neutral zone.',
        'Winning a faceoff in your own zone means your team gets possession and can clear the puck. Losing it means the opponent can set up their power play or cycle.',
        'Elite faceoff men win 55–60% of their draws. That\'s a massive edge over a full game.',
        'Technique matters: hand position, body leverage, reading the linesman\'s drop, and quick hands all factor in.',
        'Teams with dominant faceoff centres (like Patrice Bergeron was) have a structural advantage — they start more possessions on their terms.'
    ])}`;
}

// ============================================================
// 25. explainIcing()
// ============================================================

function explainIcing() {
    return `Icing — one of the most fundamental rules in hockey, and one that trips up new fans.
${breakdown('Icing Explained', [
        'Icing is called when a player shoots the puck from their own side of the red centre line and it crosses the opposing team\'s goal line untouched.',
        'When icing is called, play stops and the faceoff comes back to the offending team\'s defensive zone.',
        'The NHL uses "hybrid icing" — a linesman waves off icing if the defending player can reach the puck first. This prevents dangerous races to the boards.',
        'Icing is NOT called if: the team is shorthanded (killing a penalty), the goalie touches the puck, or the referee judges the defending player could have played the puck.',
        'Teams use icing intentionally to relieve pressure when killing a penalty — it\'s one of the few times it\'s a smart play.',
        'Repeated icings are exhausting for the team doing it — you can\'t change lines after an icing call, so tired players stay on the ice.'
    ])}`;
}

// ============================================================
// 26. explainOffside()
// ============================================================

function explainOffside() {
    return `Offside — the rule that keeps the game honest and prevents cherry-picking.
${breakdown('Offside Explained', [
        'A player is offside if they enter the attacking zone (cross the blue line) before the puck does.',
        'The puck must fully cross the blue line before any attacking player. If a player\'s skate is in the zone before the puck, it\'s offside.',
        'When offside is called, play stops and the faceoff comes back to the neutral zone.',
        'The "delayed offside" rule: if a player enters the zone early but the puck hasn\'t crossed yet, the linesman raises his arm. If the attacking team clears the zone before touching the puck, play continues.',
        'Video review can be used to challenge offside calls on goals — if a player was offside before the goal, the goal is disallowed.',
        'The offside rule prevents players from camping in the offensive zone waiting for a long pass — it forces teams to carry the puck in together.'
    ])}`;
}

// ============================================================
// 27. explainPenalties()
// ============================================================

function explainPenalties() {
    return `Penalties and the power play — where games are won and lost.
${breakdown('Penalties & Power Plays', [
        'A minor penalty sends a player to the box for 2 minutes. Their team plays shorthanded (4-on-5). If the power play scores, the penalty ends early.',
        'A major penalty is 5 minutes and does NOT end early if the power play scores. Usually called for fighting or serious infractions.',
        'A misconduct is 10 minutes but the team does NOT play shorthanded — a replacement comes on.',
        'A game misconduct ejects the player for the rest of the game.',
        'The power play (PP) is when a team has a one-man advantage. Elite PP units convert at 25–30% — that\'s a massive edge.',
        'The penalty kill (PK) is the shorthanded team\'s defence. Great PK units kill 85%+ of penalties.',
        'Common penalties: hooking, holding, tripping, interference, high-sticking, slashing, cross-checking, delay of game.',
        'The "too many men" penalty is one of the most embarrassing — it means a team had too many players on the ice during a line change.'
    ])}`;
}

// ============================================================
// 28. explainHatTrick()
// ============================================================

function explainHatTrick() {
    return `The hat trick — one of hockey's most celebrated moments.
${breakdown('Hat Trick Explained', [
        'A hat trick is when a player scores 3 goals in a single game. Fans throw their hats onto the ice to celebrate.',
        'The tradition of throwing hats dates back to the 1940s — a Toronto haberdasher offered a free hat to any player who scored 3 goals.',
        'A "natural hat trick" is three consecutive goals by the same player, with no other goals scored in between. Much rarer and more impressive.',
        'A "Gordie Howe hat trick" is a goal, an assist, AND a fight in the same game — named after the legendary Gordie Howe.',
        'The NHL record for hat tricks in a career is held by Wayne Gretzky with 50.',
        'When a player scores 4 goals, it\'s sometimes called a "Texas hat trick" — though that term is more common in soccer.'
    ])}`;
}

// ============================================================
// 29. explainLingo()
// ============================================================

function explainLingo(q) {
    const lq = q.toLowerCase();

    const terms = {
        'bar down': '<strong>Bar down</strong> — when a shot hits the crossbar and goes straight down into the net. One of the most satisfying goals in hockey. Pure top cheese.',
        'top cheese': '<strong>Top cheese</strong> (also "top shelf", "top cheddar") — a shot that goes into the top of the net, just under the crossbar. Where mama hides the cookies.',
        'celly': '<strong>Celly</strong> — short for "celebration". What a player does after scoring. Can range from a simple fist pump to an elaborate choreographed routine.',
        'chirp': '<strong>Chirp</strong> — trash talk on the ice. Players chirp each other constantly. The best chirpers are an art form.',
        'dangle': '<strong>Dangle</strong> — a fancy stickhandling move to beat a defender. "He dangled right through the whole defence."',
        'snipe': '<strong>Snipe</strong> — a perfectly placed shot, usually top corner. "He sniped it bar down, top cheese." A sniper is a player known for their shot.',
        'biscuit': '<strong>Biscuit</strong> — the puck. "He put the biscuit in the basket."',
        'barn': '<strong>Barn</strong> — the arena. "Packed barn tonight in Toronto."',
        'apple': '<strong>Apple</strong> — an assist. "He had two apples on that goal."',
        'beauty': '<strong>Beauty</strong> — a compliment. A great player, a great play, or a great person. "What a beauty."',
        'wheel': '<strong>Wheel</strong> — to skate fast. "He can really wheel."',
        'twig': '<strong>Twig</strong> — a hockey stick.',
        'lid': '<strong>Lid</strong> — a helmet.',
        'bucket': '<strong>Bucket</strong> — also a helmet.',
        'flow': '<strong>Flow</strong> — long, beautiful hockey hair flowing out the back of the helmet. A rite of passage.',
        'gongshow': '<strong>Gongshow</strong> — a chaotic, wild game or situation. "That third period was a total gongshow."',
        'barn burner': '<strong>Barn burner</strong> — a high-scoring, exciting game.',
        'standing on his head': '<strong>Standing on his head</strong> — a goalie making incredible saves, keeping his team in the game against all odds.',
        'between the pipes': '<strong>Between the pipes</strong> — in goal. The goalposts are the "pipes".',
        'backstop': '<strong>Backstop</strong> — the goalie.',
        'netminder': '<strong>Netminder</strong> — another word for goalie.',
        'blueliner': '<strong>Blueliner</strong> — a defenceman (they play near the blue line).',
        'd-man': '<strong>D-man</strong> — defenceman.',
        'enforcer': '<strong>Enforcer</strong> — a player whose primary role is physical intimidation and fighting. Largely extinct in the modern NHL.',
        'grinder': '<strong>Grinder</strong> — a hard-working, physical player who doesn\'t score much but contributes in other ways.',
        'plug': '<strong>Plug</strong> — a bad player. Not a compliment.',
        'pigeon': '<strong>Pigeon</strong> — a player who benefits from playing with better teammates but can\'t produce on their own.',
        'tape to tape': '<strong>Tape to tape</strong> — a perfect pass, from one player\'s stick tape directly to another\'s.',
        'breakaway': '<strong>Breakaway</strong> — when a player gets behind the defence and goes one-on-one with the goalie.',
        'odd-man rush': '<strong>Odd-man rush</strong> — when the attacking team has more players than defenders on a rush (2-on-1, 3-on-2).',
        'cycle': '<strong>Cycle</strong> — when a team maintains possession in the offensive zone by moving the puck along the boards in a circular pattern.',
        'forecheck': '<strong>Forecheck</strong> — aggressive pressure in the offensive zone to win the puck back.',
        'backcheck': '<strong>Backcheck</strong> — forwards skating back to help defend against an opposing rush.',
        'neutral zone trap': '<strong>Neutral zone trap</strong> — a defensive system where a team clogs the neutral zone to prevent odd-man rushes. Effective but boring to watch.',
    };

    // Check if a specific term was asked about
    for (const [term, def] of Object.entries(terms)) {
        if (lq.includes(term)) return def;
    }

    // Return a glossary of common terms
    const glossary = ['bar down', 'top cheese', 'celly', 'chirp', 'dangle', 'snipe', 'biscuit', 'beauty', 'flow', 'standing on his head', 'between the pipes', 'gongshow'];
    const entries = glossary.map(t => `<li>${terms[t]}</li>`).join('');

    return `Hockey has its own language — here are some of the classics:<br><ul>${entries}</ul><br>Ask me about any specific term for a deeper breakdown!`;
}

// ============================================================
// 30. searchPlayer()
// ============================================================

async function searchPlayer(q) {
    // Extract a likely player name — strip common filler words
    const cleaned = q.replace(/who is|tell me about|stats for|stats on|how is|how about|what about|player/gi, '').trim();
    if (!cleaned || cleaned.length < 3) return fallback(q);

    const encoded = encodeURIComponent(cleaned);
    let players = [];

    try {
        const searchUrl = `https://search.d3.nhle.com/api/v1/search/player?culture=en-us&limit=5&q=${encoded}&active=true`;
        const encodedSearch = encodeURIComponent(searchUrl);

        let searchData;
        // Try allorigins
        try {
            const res = await fetch(`https://api.allorigins.win/get?url=${encodedSearch}`);
            if (res.ok) {
                const d = await res.json();
                searchData = JSON.parse(d.contents);
            }
        } catch (_) { }

        // Fallback: corsproxy
        if (!searchData) {
            try {
                const res = await fetch(`https://corsproxy.io/?${encodedSearch}`);
                if (res.ok) searchData = await res.json();
            } catch (_) { }
        }

        // Fallback: direct
        if (!searchData) {
            const res = await fetch(searchUrl);
            if (res.ok) searchData = await res.json();
        }

        players = Array.isArray(searchData) ? searchData : [];
    } catch (_) {
        return `Couldn't search for "${cleaned}" right now — the scouting report is delayed. Try again in a moment.`;
    }

    if (!players.length) {
        return `Couldn't find a player matching "<strong>${cleaned}</strong>". Try their full name — e.g. "Connor McDavid" or "Nathan MacKinnon".`;
    }

    const player = players[0];
    const pid = player.playerId;
    const fullName = `${player.name || cleaned}`;

    // Fetch player landing page
    let landing;
    try {
        landing = await nhlFetch(`/player/${pid}/landing`);
    } catch (_) {
        return `Found <strong>${fullName}</strong> but couldn't load their full profile right now. Try again shortly.`;
    }

    const info = landing;
    const firstName = info.firstName?.default || '';
    const lastName = info.lastName?.default || '';
    const name = `${firstName} ${lastName}`.trim() || fullName;
    const pos = info.position || '?';
    const team = info.currentTeamAbbrev || info.teamAbbrev || 'N/A';
    const jersey = info.sweaterNumber || '?';
    const nationality = info.birthCountry || '';
    const birthCity = info.birthCity?.default || '';
    const birthDate = info.birthDate || '';
    const heightCm = info.heightInCentimeters || '';
    const weightLbs = info.weightInPounds || '';

    const season = info.featuredStats?.regularSeason?.subSeason || info.featuredStats?.regularSeason?.career || {};
    const gp = season.gamesPlayed ?? '—';
    const goals = season.goals ?? '—';
    const assists = season.assists ?? '—';
    const pts = season.points ?? '—';
    const plusMinus = season.plusMinus ?? '—';

    // Goalie stats
    const svPct = season.savePctg != null ? (season.savePctg * 100).toFixed(2) + '%' : null;
    const gaa = season.goalsAgainstAverage != null ? season.goalsAgainstAverage.toFixed(2) : null;
    const wins = season.wins ?? '—';

    const isGoalie = pos === 'G';

    const statsRows = isGoalie
        ? `<tr><td>GP</td><td>${gp}</td></tr>
       <tr><td>Wins</td><td>${wins}</td></tr>
       <tr><td>GAA</td><td>${gaa ?? '—'}</td></tr>
       <tr><td>SV%</td><td>${svPct ?? '—'}</td></tr>`
        : `<tr><td>GP</td><td>${gp}</td></tr>
       <tr><td>Goals</td><td>${goals}</td></tr>
       <tr><td>Assists</td><td>${assists}</td></tr>
       <tr><td>Points</td><td>${pts}</td></tr>
       <tr><td>+/−</td><td>${plusMinus}</td></tr>`;

    return `<strong>#${jersey} ${name}</strong> — ${pos} | ${team}<br>
<table style="width:100%;border-collapse:collapse;font-size:0.85em;margin:6px 0;">
  <tr><td><strong>Born</strong></td><td>${birthDate} ${birthCity ? '· ' + birthCity : ''} ${nationality ? '· ' + nationality : ''}</td></tr>
  <tr><td><strong>Size</strong></td><td>${heightCm ? heightCm + ' cm' : '—'} / ${weightLbs ? weightLbs + ' lbs' : '—'}</td></tr>
</table>
<strong>Current Season Stats:</strong>
<table style="width:100%;border-collapse:collapse;font-size:0.85em;margin:6px 0;">
  ${statsRows}
</table>
${breakdown('Scout\'s Take', [
        `${name} is a ${pos} for the ${team}. ${isGoalie ? 'Goalies win championships — watch his save percentage and GAA as the season progresses.' : 'Track his points-per-game to see if he\'s playing at an elite level.'}`,
        'Want to compare him to another player? Just ask — e.g. "Matthews vs McDavid".',
        'Ask me about his team\'s playoff outlook or Cup chances!'
    ])}`;
}

// ============================================================
// 31. fallback()
// ============================================================

function fallback(q) {
    const suggestions = [
        'NHL standings',
        'Scores today',
        'Top scorers',
        'Best goalies',
        'Cup prediction',
        'Hart Trophy pick',
        'Norris Trophy pick',
        'Calder Trophy pick',
        'Connor McDavid stats',
        'Matthews vs McDavid',
        'MacKinnon vs McDavid',
        'Crosby vs McDavid',
        'Ovechkin vs Gretzky',
        'Best player in the NHL',
        'Explain icing',
        'Explain offside',
        'Explain the salary cap',
        'How do playoffs work',
        'What is a hat trick',
        'Hockey lingo',
        'Leafs playoff outlook',
        'Oilers season outlook',
        'Avalanche Cup chances',
    ];

    const picks = suggestions.sort(() => Math.random() - 0.5).slice(0, 6);
    const chips = picks.map(s => `<span class="suggestion" onclick="sendSuggestion(this)">${s}</span>`).join(' ');

    return `Not sure I caught that one — might've hit the post. Here are some things I can help with:<br><br>${chips}<br><br>Or just ask me anything about hockey — standings, scores, players, rules, awards, trades, or hot takes. I'm all ears.`;
}
