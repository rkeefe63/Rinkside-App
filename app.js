// ── NHL API ────────────────────────────────────────────────
const NHL = 'https://api-web.nhle.com/v1';
const PROXY = 'https://corsproxy.io/?';

async function nhlFetch(url) {
    const res = await fetch(PROXY + encodeURIComponent(url));
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
    div.innerHTML = `
    <div class="avatar">${role === 'bot' ? '🏒' : '👤'}</div>
    <div class="bubble">${html}</div>`;
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
    if (match(q, ['today', 'tonight', 'game', 'schedule', 'score', 'playing', 'on tonight', 'on today', 'matchup', 'result', 'final score', 'last night'])) return await getScores();
    if (match(q, ['top scorer', 'point leader', 'most point', 'scoring leader', 'art ross', 'leading in point', 'leading the nhl', 'most goal', 'goal leader', 'assist leader', 'most assist', 'best scorer', 'leading scorer', 'point', 'goals', 'assists'])) return await getTopScorers();
    if (match(q, ['goalie', 'goaltender', 'save', 'gaa', 'sv%', 'vezina', 'best goalie', 'top goalie', 'between the pipe', 'netminder'])) return await getTopGoalies();
    if (match(q, ['icing'])) return explainIcing();
    if (match(q, ['offside', 'off side'])) return explainOffside();
    if (match(q, ['penalty', 'penalties', 'power play', 'pp', 'shorthanded', 'penalty kill', 'hooking', 'tripping', 'slashing'])) return explainPenalties();
    if (match(q, ['hat trick', 'hat-trick'])) return explainHatTrick();
    if (match(q, ['bar down', 'top cheese', 'celly', 'chirp', 'dangle', 'snipe', 'biscuit', 'barn', 'twig', 'wheel'])) return explainLingo(q);
    if (match(q, ['who is', 'tell me about', 'stats for', 'how is', 'how has', 'how many', 'player', 'mcdavid', 'matthews', 'draisaitl', 'crosby', 'ovechkin', 'makar', 'hedman', 'mackinnon', 'rantanen', 'pastrnak'])) return await searchPlayer(q);
    return fallback(q);
}


function match(q, keywords) {
    return keywords.some(k => q.includes(k));
}

// ── Standings ──────────────────────────────────────────────
async function getStandings() {
    const data = await nhlFetch(`${NHL}/standings/now`);
    const standings = data.standings;

    const divisions = {};
    standings.forEach(t => {
        const div = t.divisionName;
        if (!divisions[div]) divisions[div] = [];
        divisions[div].push(t);
    });

    let html = `Here's where things stand in the NHL right now. Every point matters — this is where the playoff picture is taking shape 🏒<br><br>`;

    Object.entries(divisions).forEach(([div, teams]) => {
        html += `<strong>${div}</strong>`;
        html += `<table class="stat-table"><thead><tr>
      <th>#</th><th>Team</th><th>GP</th><th>W</th><th>L</th><th>OTL</th><th>PTS</th>
    </tr></thead><tbody>`;
        teams.slice(0, 8).forEach((t, i) => {
            const playoff = i < 3 ? '🟢' : i === 3 ? '🟡' : '';
            html += `<tr>
        <td class="rank">${playoff} ${i + 1}</td>
        <td class="team-name">${t.teamName.default}</td>
        <td>${t.gamesPlayed}</td>
        <td>${t.wins}</td>
        <td>${t.losses}</td>
        <td>${t.otLosses}</td>
        <td class="highlight">${t.points}</td>
      </tr>`;
        });
        html += `</tbody></table><br>`;
    });

    html += `🟢 = Division leader &nbsp;|&nbsp; 🟡 = Wild card spot`;
    return html;
}

// ── Scores ─────────────────────────────────────────────────
async function getScores() {
    const data = await nhlFetch(`${NHL}/score/now`);
    const games = data.games;

    if (!games || games.length === 0) {
        return `No games on the schedule today — even the NHL takes a breather sometimes. Check back tomorrow, the boys'll be back on the ice soon enough. 🏒`;
    }

    let html = `Here's tonight's slate. ${games.length} game${games.length > 1 ? 's' : ''} on the board — grab your jersey 🎽<br><br>`;

    games.forEach(g => {
        const away = g.awayTeam;
        const home = g.homeTeam;
        const state = g.gameState;
        const isLive = state === 'LIVE' || state === 'CRIT';
        const isFinal = state === 'FINAL' || state === 'OFF';
        const isPre = state === 'FUT' || state === 'PRE';

        let scoreStr = '';
        if (isLive || isFinal) {
            scoreStr = `<span class="highlight">${away.score ?? 0} – ${home.score ?? 0}</span>`;
        }

        const status = isFinal ? '✅ Final' : isLive ? '🔴 Live' : `🕐 ${g.startTimeUTC ? new Date(g.startTimeUTC).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'TBD'}`;

        html += `<div style="margin-bottom:0.75rem; padding:0.75rem; background:var(--bg-input); border:1px solid var(--border); border-radius:10px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span><strong>${away.abbrev}</strong> @ <strong>${home.abbrev}</strong> ${scoreStr}</span>
        <span style="font-size:0.8rem;color:var(--text-muted)">${status}</span>
      </div>
      ${isLive && g.periodDescriptor ? `<div style="font-size:0.78rem;color:var(--accent);margin-top:0.3rem">${g.periodDescriptor.periodType} ${g.periodDescriptor.number} • ${g.clock?.timeRemaining ?? ''}</div>` : ''}
    </div>`;
    });

    return html;
}

// ── Top Scorers ────────────────────────────────────────────
async function getTopScorers() {
    const data = await nhlFetch(`${NHL}/skater-stats-leaders/current?categories=points&limit=10`);
    const players = data.points;

    let html = `The Art Ross race is heating up. Here are the top point-getters in the league right now — these are the guys you do NOT want to leave open in the offensive zone 🎯<br><br>`;
    html += `<table class="stat-table"><thead><tr>
    <th>#</th><th>Player</th><th>Team</th><th>G</th><th>A</th><th>PTS</th>
  </tr></thead><tbody>`;

    players.forEach((p, i) => {
        html += `<tr>
      <td class="rank">${i + 1}</td>
      <td class="team-name">${p.firstName.default} ${p.lastName.default}</td>
      <td>${p.teamAbbrevs}</td>
      <td>${p.goals ?? '—'}</td>
      <td>${p.assists ?? '—'}</td>
      <td class="highlight">${p.value}</td>
    </tr>`;
    });

    html += `</tbody></table><br>Those are some filthy numbers. The Art Ross Trophy goes to the regular season points leader — pure skill, no excuses.`;
    return html;
}

// ── Top Goalies ────────────────────────────────────────────
async function getTopGoalies() {
    const data = await nhlFetch(`${NHL}/goalie-stats-leaders/current?categories=savePctg&limit=10`);
    const goalies = data.savePctg;

    let html = `Between the pipes, these are the guys standing on their heads right now. Vezina Trophy conversation starts here 🥅<br><br>`;
    html += `<table class="stat-table"><thead><tr>
    <th>#</th><th>Goalie</th><th>Team</th><th>SV%</th><th>GAA</th>
  </tr></thead><tbody>`;

    goalies.forEach((g, i) => {
        html += `<tr>
      <td class="rank">${i + 1}</td>
      <td class="team-name">${g.firstName.default} ${g.lastName.default}</td>
      <td>${g.teamAbbrevs}</td>
      <td class="highlight">${g.value?.toFixed(3) ?? '—'}</td>
      <td>${g.goalsAgainstAverage?.toFixed(2) ?? '—'}</td>
    </tr>`;
    });

    html += `</tbody></table><br>SV% = save percentage (higher is better). GAA = goals against average (lower is better). A .920+ SV% is elite — that's a guy who's absolutely robbing people.`;
    return html;
}

// ── Player Search ──────────────────────────────────────────
async function searchPlayer(q) {
    const cleaned = q.replace(/who is|tell me about|stats for|how is|player/g, '').trim();
    if (!cleaned || cleaned.length < 2) {
        return `Who are you looking for? Give me a name — first, last, or both — and I'll pull up their numbers.`;
    }

    const data = await nhlFetch(`https://search.d3.nhle.com/api/v1/search/player?culture=en-us&limit=5&q=${encodeURIComponent(cleaned)}&active=true`);

    if (!data || data.length === 0) {
        return `Couldn't find anyone matching "${cleaned}" on the active roster. Double-check the spelling — even Elliotte Friedman has to confirm names sometimes.`;
    }

    const player = data[0];
    const pid = player.playerId;

    const landing = await nhlFetch(`${NHL}/player/${pid}/landing`);
    const s = landing.featuredStats?.regularSeason?.subSeason;
    const info = landing;

    const pos = info.position;
    const isGoalie = pos === 'G';

    let statsHtml = '';
    if (s) {
        if (isGoalie) {
            statsHtml = `
        <table class="stat-table"><thead><tr><th>GP</th><th>W</th><th>L</th><th>SV%</th><th>GAA</th><th>SO</th></tr></thead>
        <tbody><tr>
          <td>${s.gamesPlayed ?? '—'}</td>
          <td>${s.wins ?? '—'}</td>
          <td>${s.losses ?? '—'}</td>
          <td class="highlight">${s.savePctg?.toFixed(3) ?? '—'}</td>
          <td>${s.goalsAgainstAverage?.toFixed(2) ?? '—'}</td>
          <td>${s.shutouts ?? '—'}</td>
        </tr></tbody></table>`;
        } else {
            statsHtml = `
        <table class="stat-table"><thead><tr><th>GP</th><th>G</th><th>A</th><th>PTS</th><th>+/-</th><th>PIM</th></tr></thead>
        <tbody><tr>
          <td>${s.gamesPlayed ?? '—'}</td>
          <td>${s.goals ?? '—'}</td>
          <td>${s.assists ?? '—'}</td>
          <td class="highlight">${s.points ?? '—'}</td>
          <td>${s.plusMinus ?? '—'}</td>
          <td>${s.pim ?? '—'}</td>
        </tr></tbody></table>`;
        }
    }

    const name = `${info.firstName?.default} ${info.lastName?.default}`;
    const team = info.fullTeamName?.default ?? 'Unknown Team';
    const number = info.sweaterNumber ? `#${info.sweaterNumber}` : '';
    const nationality = info.birthCountry ?? '';
    const age = info.currentAge ? `${info.currentAge} years old` : '';

    return `
    <strong>${name}</strong> ${number} — ${pos} | ${team}<br>
    <span style="color:var(--text-muted);font-size:0.85rem">${age}${nationality ? ` · ${nationality}` : ''}</span><br><br>
    <strong>This season:</strong>${statsHtml}<br>
    ${isGoalie
            ? `Between the pipes, ${info.firstName?.default} is doing the work. SV% and GAA tell the real story — everything else is noise.`
            : `${info.firstName?.default}'s numbers speak for themselves. ${(s?.points ?? 0) > 50 ? "That's a legit top-six presence — maybe top-line." : (s?.points ?? 0) > 20 ? "Solid contributor. The kind of player every team needs." : "Still building — keep an eye on this one."}`
        }`;
}

// ── Rules & Lingo ──────────────────────────────────────────
function explainIcing() {
    return `<strong>Icing</strong> — here's the deal 🚫<br><br>
If a player shoots the puck from their own side of the red center line and it crosses the opposing goal line untouched, that's icing. Play stops, and the faceoff comes back to the defensive zone of the team that iced it.<br><br>
<strong>Why does it matter?</strong> It's basically a rule to stop teams from just chucking the puck down the ice to kill time or relieve pressure. You can't just fire it 200 feet and call it a day.<br><br>
<strong>Exception:</strong> If a team is on the penalty kill (shorthanded), they're allowed to ice the puck — that's one of the few advantages of killing a penalty.<br><br>
<em>Think of it like this: you can't just punt the ball in football to avoid pressure. Same energy.</em>`;
}

function explainOffside() {
    return `<strong>Offside</strong> — the rule that causes more bar arguments than anything else 🚦<br><br>
A player is offside if they enter the offensive zone (cross the blue line) before the puck does. Both skates have to be over the blue line before the puck crosses — one skate on the line counts as still being onside.<br><br>
<strong>Why it exists:</strong> Without offside, you'd have guys just camping in front of the net waiting for a pass. It forces teams to actually carry or pass the puck into the zone together.<br><br>
<strong>Coach's challenge:</strong> Since 2015, coaches can challenge offside calls on goals. If a player was offside on the zone entry that led to the goal — even 30 seconds earlier — the goal gets waved off. Controversial? Absolutely. But them's the rules.<br><br>
<em>Quick tip: watch the linesman's eyes — they're tracking the puck and the skates simultaneously. It's a tough job.</em>`;
}

function explainPenalties() {
    return `<strong>Penalties & the Power Play</strong> — where games are won and lost ⚡<br><br>
When a player commits a foul, they go to the penalty box and their team plays shorthanded. The other team gets a <strong>power play</strong> — a massive advantage.<br><br>
<strong>Common penalties:</strong><br>
• <em>Hooking</em> — using your stick to impede a player<br>
• <em>Tripping</em> — taking a player down with your stick or body<br>
• <em>High-sticking</em> — stick above the shoulders makes contact<br>
• <em>Interference</em> — hitting a player who doesn't have the puck<br>
• <em>Slashing</em> — whacking someone's stick or body<br><br>
<strong>Minor penalty</strong> = 2 minutes. Ends early if the power play team scores.<br>
<strong>Major penalty</strong> = 5 minutes. Does NOT end early on a goal.<br>
<strong>Misconduct</strong> = 10 minutes, but team stays at full strength.<br><br>
A good power play unit converting at 20%+ is elite. The best teams in the league treat the man advantage like a second offense.`;
}

function explainHatTrick() {
    return `<strong>Hat Trick</strong> — one of the purest moments in hockey 🎩<br><br>
Three goals by one player in a single game. When it happens, fans throw their hats on the ice — it's a tradition that goes back decades. The arena staff has to collect them all. Yes, really.<br><br>
<strong>Natural hat trick:</strong> Three consecutive goals by the same player, uninterrupted by anyone else scoring. Way rarer, way more impressive.<br><br>
<strong>Gordie Howe hat trick:</strong> A goal, an assist, AND a fight in the same game. Named after the legend himself. It's the ultimate power move — skill and toughness in one night.<br><br>
<em>Fun fact: the hat-throwing tradition is believed to have started in the 1950s. Some hat companies used to give away free hats to players who scored three goals. The fans just ran with it.</em>`;
}

function explainLingo(q) {
    const terms = {
        'bar down': `<strong>Bar down</strong> 🚨<br>When a shot hits the crossbar (the top post of the net) and goes straight down into the goal. It makes a distinct "ping" sound that every hockey fan lives for. Pure filth. The kind of goal that makes the scorer skate away like they meant to do that — because they did.`,
        'top cheese': `<strong>Top cheese</strong> 🧀<br>A shot that goes up high in the net — top shelf, under the crossbar. "Cheese" = the top of the net. "Top cheese" = the highest, most beautiful part of the goal. If someone says a player "went top cheese," they scored a snipe that the goalie had zero chance on.`,
        'celly': `<strong>Celly</strong> 🎉<br>Short for celebration — what a player does after scoring a goal. From the subtle fist pump to the full-on dive across the ice, the celly is an art form. Some guys have signature cellies. Some keep it cool. Either way, you earned it.`,
        'chirp': `<strong>Chirp</strong> 🗣️<br>Trash talk on the ice. Hockey players are notorious chirpers — they'll say anything to get in an opponent's head. It's part of the culture. The best chirps are creative, quick, and land right after a big play. Getting chirped and not responding? That's a bad look.`,
        'dangle': `<strong>Dangle</strong> 🏒<br>A sick stickhandling move — when a player dekes (fakes) out a defender or goalie with their hands. "He dangled right through the whole defense" means he made everyone look silly. Pure skill, maximum disrespect.`,
        'snipe': `<strong>Snipe</strong> 🎯<br>A perfectly placed, precise shot that beats the goalie clean. No luck involved — just a shooter who knows exactly where they're putting it. A sniper is a player known for their shooting accuracy. Every team needs one.`,
        'biscuit': `<strong>Biscuit</strong> 🏒<br>The puck. Simple as that. "Put the biscuit in the basket" = score a goal. Hockey lingo has a way of making everything sound better than it is.`,
        'barn': `<strong>Barn</strong> 🏟️<br>The arena. "Playing in a barn" means playing in a hockey rink. Some barns are louder than others — a packed barn with a rowdy crowd is one of the best atmospheres in sports.`,
        'twig': `<strong>Twig</strong> 🏒<br>A hockey stick. Old school term from when sticks were actually made of wood. Players are very particular about their twigs — curve, flex, length. It's personal.`,
        'wheel': `<strong>Wheel</strong> 🛞<br>To skate fast. "He can wheel" means a player has serious speed. "Wheeling and dealing" in hockey means a player is flying up the ice and making plays happen.`
    };

    for (const [term, explanation] of Object.entries(terms)) {
        if (q.includes(term)) return explanation;
    }
    return fallback(q);
}

// ── Fallback ───────────────────────────────────────────────
function fallback(q) {
    const responses = [
        `Hmm, not sure I caught that one. Try asking about standings, tonight's scores, top scorers, or a specific player — I'm best when you keep it hockey. 🏒`,
        `That one's a little outside my crease. Ask me about NHL standings, scores, player stats, or hockey rules and I'm all over it.`,
        `I'm a hockey guy — ask me about the game and I'll deliver. Standings, scores, stats, rules, lingo — that's my zone.`,
    ];
    return responses[Math.floor(Math.random() * responses.length)];
}
