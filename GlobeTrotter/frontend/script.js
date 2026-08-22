const API = "../backend/api.php";
const state = {
  user: null,
  trips: [],
  trip: null,
  page: "dashboard",
  discover: [],
  community: [],
  notifications: 3,
};
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[m],
  );
const money = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2600);
}
async function api(action, opts = {}) {
  try {
    const r = await fetch(`${API}?action=${action}`, {
      method: opts.method || "GET",
      headers: { "Content-Type": "application/json" },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const d = await r.json();
    if (!r.ok || d.error) throw new Error(d.error || "Request failed");
    return d;
  } catch (e) {
    toast(e.message);
    throw e;
  }
}
function setAuth(mode) {
  $$(".auth-tab").forEach((b) =>
    b.classList.toggle("active", b.dataset.auth === mode),
  );
  $("#loginForm").classList.toggle("hidden", mode !== "login");
  $("#signupForm").classList.toggle("hidden", mode !== "signup");
}
async function boot() {
  const d = await api("me").catch(() => null);
  if (d?.user) {
    state.user = d.user;
  }
  showApp();
  loadPublicData().then(() => {
    const view = new URLSearchParams(location.search).get("view");
    if (state.user && view === "create") {
      state.page = "create";
      $("#breadcrumbs").textContent = "Create trip";
      renderCreate();
      bindPage();
    } else if (
      state.user &&
      view === "itinerary" &&
      new URLSearchParams(location.search).get("trip")
    ) {
      openTrip(new URLSearchParams(location.search).get("trip"));
    } else render();
  });
}
function showAuth() {
  $("#authView").classList.remove("hidden");
  $("#appView").classList.add("hidden");
}
function showApp() {
  $("#authView").classList.add("hidden");
  $("#appView").classList.remove("hidden");
  $(".avatar").textContent = (state.user?.name || "GT")
    .split(" ")
    .map((x) => x[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const loginBtn = $("[data-auth-login]"),
    logoutBtn = $("[data-logout]");
  if (loginBtn) loginBtn.classList.toggle("hidden", !!state.user);
  if (logoutBtn) logoutBtn.classList.toggle("hidden", !state.user);
}
async function loadPublicData() {
  const results = await Promise.allSettled([
    api("trips"),
    api("discover"),
    api("community"),
  ]);
  const [tr, ds, cm] = results;
  state.trips = tr.status === "fulfilled" ? tr.value.trips || [] : [];
  state.discover = ds.status === "fulfilled" ? ds.value.items || [] : [];
  state.community = cm.status === "fulfilled" ? cm.value.posts || [] : [];
}
async function loadData() {
  await loadPublicData();
  render();
}
function nav(page) {
  if (
    !state.user &&
    [
      "trips",
      "itinerary",
      "calendar",
      "budget",
      "community",
      "shared",
      "profile",
    ].includes(page)
  ) {
    window.location.href =
      "login.html?redirectTo=" +
      encodeURIComponent("/" + (page === "trips" ? "trips" : page));
    return;
  }
  state.page = page;
  $$(".nav-item").forEach((x) =>
    x.classList.toggle("active", x.dataset.page === page),
  );
  $("#breadcrumbs").textContent = {
    dashboard: "Overview",
    trips: "My trips",
    discover: "Discover",
    "activity-city-search": "Activity/City Search Page",
    itinerary: "Itinerary",
    calendar: "Calendar",
    budget: "Budget",
    community: "Community",
    shared: "Shared trips",
    profile: "Profile & settings",
  }[page];
  $(".sidebar").classList.remove("open");
  render();
}
function render() {
  const c = $("#content");
  const map = {
    dashboard: renderDashboard,
    trips: renderTrips,
    discover: renderDiscover,
    "activity-city-search": renderActivityCitySearch,
    itinerary: renderItinerary,
    calendar: renderCalendar,
    budget: renderBudget,
    community: renderCommunity,
    shared: renderShared,
    profile: renderProfile,
  };
  c.innerHTML = map[state.page]();
  bindPage();
}
function title(ey, h, p, actions = "") {
  return `<div class="page-title"><div><div class="eyebrow-blue">${ey}</div><h1>${h}</h1><p>${p}</p></div><div class="actions">${actions}</div></div>`;
}
function renderDashboard() {
  const trips = state.trips.slice(0, 3);
  return `${title("GOOD MORNING", `Welcome back, ${esc((state.user?.name || "Traveler").split(" ")[0])} ✦`, "Your next adventure is closer than you think.", `<button class="primary" data-plan-new-trip>+ Plan new trip</button>`)}<section class="hero"><div class="hero-content"><div class="eyebrow-blue">YOUR TRAVEL HQ</div><h2>Turn a destination into a journey.</h2><p>Organize cities, experiences, dates and spending in one beautifully simple itinerary. Your plans stay flexible while your trip stays on track.</p><div class="hero-actions"><button class="primary" data-plan-new-trip>Start planning <span>→</span></button><button class="secondary" data-page="discover">Explore destinations</button></div></div></section><div class="stats"><div class="stat card"><div class="icon">✦</div><strong>${state.trips.length}</strong><span>Total trips</span></div><div class="stat card"><div class="icon">◷</div><strong>${state.trips.filter((t) => t.status === "upcoming").length}</strong><span>Upcoming</span></div><div class="stat card"><div class="icon">⌖</div><strong>${state.trips.reduce((a, t) => a + Number(t.stops_count || 0), 0)}</strong><span>Destinations</span></div><div class="stat card"><div class="icon">₹</div><strong>${money(state.trips.reduce((a, t) => a + Number(t.budget || 0), 0)).replace("₹", "₹")}</strong><span>Planned budget</span></div></div><div class="dashboard-grid"><section class="card section-card"><div class="section-head"><h3>Recent journeys</h3><button data-page="trips">View all →</button></div>${trips.length ? trips.map(tripMini).join("") : `<div class="empty"><strong>Your first journey is waiting.</strong>Plan a trip and it will appear here.</div>`}</section><section class="card section-card"><div class="section-head"><h3>Get inspired</h3><button data-page="discover">Discover →</button></div><div class="destination-grid">${state.discover
    .slice(0, 4)
    .map(
      (x, i) =>
        `<div class="destination" style="background-image:url('${x.image}')"><div><b>${esc(x.name)}</b><span>${esc(x.country)}</span></div></div>`,
    )
    .join("")}</div></section></div>`;
}
function tripMini(t) {
  return `<div class="trip-mini"><div class="trip-thumb" style="background-image:url('${t.cover}')"></div><div><b>${esc(t.name)}</b><p>${esc(t.start_date)} — ${esc(t.end_date)} · ${t.stops_count || 0} stops</p></div><span class="arrow">→</span></div>`;
}
function renderTrips() {
  return `${title("YOUR JOURNEYS", "My trips", "Everything you have planned, from weekend escapes to long adventures.", `<button class="primary" data-page="create">+ New trip</button>`)}<div class="toolbar"><div class="search"><span>⌕</span><input id="tripSearch" placeholder="Search trips..."></div><div class="filters"><button class="filter" data-trip-filter="all">All</button><button class="filter" data-trip-filter="upcoming">Upcoming</button><button class="filter" data-trip-filter="past">Past</button></div></div><div class="trip-grid" id="tripGrid">${tripCards(state.trips)}</div>`;
}
function tripCards(arr) {
  return arr.length
    ? arr
        .map(
          (t) =>
            `<article class="trip-card card"><div class="trip-cover" style="background-image:url('${t.cover}')"><span class="trip-badge">${esc(t.status || "planned")}</span></div><div class="trip-body"><h3>${esc(t.name)}</h3><p>${esc(t.start_date)} — ${esc(t.end_date)}</p><div class="trip-meta"><span>⌖ ${t.stops_count || 0} stops</span><span>◒ ${money(t.budget)}</span></div><div class="card-actions"><button class="small-btn primary-mini" data-open-trip="${t.id}">View</button><button class="small-btn" data-edit-trip="${t.id}">Edit</button><button class="small-btn" data-share-trip="${t.id}">${t.is_public ? "Shared" : "Share"}</button><button class="small-btn" data-delete-trip="${t.id}">Delete</button></div></div></article>`,
        )
        .join("")
    : `<div class="card empty" style="grid-column:1/-1"><strong>No trips match your search.</strong>Try another keyword or create a new trip.</div>`;
}
function renderDiscover() {
  return `${title("EXPLORE", "Discover", "Find cities and experiences that fit the way you like to travel.")}<div class="toolbar"><div class="search"><span>⌕</span><input id="discoverSearch" placeholder="Search cities, countries, experiences..."></div><div class="filters"><button class="filter" data-discover="all">All</button><button class="filter" data-discover="budget">Budget friendly</button><button class="filter" data-discover="popular">Popular</button></div></div><div class="discover-grid" id="discoverGrid">${discoverCards(state.discover)}</div>`;
}
function renderCommunity() {
  return `<section class="community-shell"><div class="community-intro"><h1>Community tab</h1><p>Community section where all the users can share their experience and get tips from others. Using the search, group by, filter and sorting option, the user can narrow down the result that he is looking for...</p></div><div class="community-toolbar"><div class="community-search"><span>⌕</span><input id="communitySearch" placeholder="Search posts, places, tips..."></div><select id="communityGroup" class="community-control" aria-label="Group by"><option value="none">Group by</option><option value="destination">Destination</option><option value="category">Category</option><option value="style">Travel style</option></select><select id="communityFilter" class="community-control" aria-label="Filter"><option value="all">Filter</option><option value="experience">Experience</option><option value="tip">Tips</option><option value="food">Food</option><option value="budget">Budget</option><option value="safety">Safety</option></select><select id="communitySort" class="community-control" aria-label="Sort by"><option value="latest">Sort by</option><option value="latest">Latest</option><option value="likes">Most liked</option><option value="comments">Most discussed</option></select></div><div id="communityFeed" class="community-feed">${communityFeed(state.community)}</div></section>`;
}
function communityFeed(posts) {
  if (!posts.length)
    return `<div class="card community-empty"><strong>No community posts found.</strong><span>Try a different search, filter, or sort option.</span></div>`;
  const group = document.querySelector("#communityGroup")?.value || "none";
  if (group === "none") return posts.map(communityPost).join("");
  const groups = posts.reduce((acc, p) => {
    const key = esc(p[group] || "Other");
    (acc[key] ||= []).push(p);
    return acc;
  }, {});
  return Object.entries(groups)
    .map(
      ([key, items]) =>
        `<section class="community-group"><div class="community-group-title"><span>${key}</span><small>${items.length} post${items.length === 1 ? "" : "s"}</small></div>${items.map(communityPost).join("")}</section>`,
    )
    .join("");
}
function communityPost(p) {
  return `<article class="community-post card"><div class="community-post-head"><div class="community-avatar">${esc(p.initials || "GT")}</div><div class="community-author"><b>${esc(p.author || "Traveler")}</b><span>${esc(p.created_at_label || "Recently")} · ${esc(p.destination || "Travel community")}</span></div><span class="community-category">${esc(p.category || "Experience")}</span></div><div class="community-post-body"><h3>${esc(p.title)}</h3><p>${esc(p.content)}</p><div class="community-tags"><span>${esc(p.destination || "Travel")}</span><span>${esc(p.style || "Balanced")}</span></div></div><div class="community-post-foot"><button type="button" data-community-like="${p.id}">♡ ${Number(p.likes || 0)}</button><button type="button" data-community-comments="${p.id}">◌ ${Number(p.comments || 0)} comments</button><span>Shared by ${esc(p.author || "Traveler")}</span></div></article>`;
}

function discoverCards(items) {
  return items
    .map(
      (x) =>
        `<article class="discover-card card"><div class="discover-image" style="background-image:url('${x.image}')"></div><div class="discover-body"><h3>${esc(x.name)}</h3><p>${esc(x.description)}</p><div class="chips"><span class="chip">${esc(x.country)}</span><span class="chip">Cost ${esc(x.cost_index)}</span><span class="chip">${esc(x.type)}</span></div><button class="secondary" style="margin-top:13px;width:100%" data-discover-add="${x.id}">+ Add to trip</button></div></article>`,
    )
    .join("");
}
function getActivityCitySearchItems() {
  const items = [];
  const activityCatalog = [
    {
      id: "a-tokyo-shibuya",
      name: "Shibuya & Harajuku Walk",
      city: "Tokyo",
      type: "Sightseeing",
      description:
        "Explore lively streets, local shops and the creative heart of Tokyo.",
      cost: 1200,
    },
    {
      id: "a-kyoto-fushimi",
      name: "Fushimi Inari Shrine",
      city: "Kyoto",
      type: "Culture",
      description:
        "Walk through the iconic torii gates and explore one of Kyoto’s best-known shrines.",
      cost: 0,
    },
    {
      id: "a-bali-rice",
      name: "Tegallalang Rice Terrace",
      city: "Bali",
      type: "Adventure",
      description:
        "Take in green rice terraces and scenic viewpoints around Ubud.",
      cost: 900,
    },
    {
      id: "a-paris-louvre",
      name: "Louvre Museum Visit",
      city: "Paris",
      type: "Culture",
      description:
        "Spend an afternoon exploring world-famous art and historic galleries.",
      cost: 2500,
    },
    {
      id: "a-alps-train",
      name: "Scenic Alpine Train Ride",
      city: "Swiss Alps",
      type: "Adventure",
      description:
        "Enjoy panoramic mountain scenery on a memorable alpine rail journey.",
      cost: 4500,
    },
    {
      id: "a-istanbul-bosphorus",
      name: "Bosphorus Sunset Cruise",
      city: "Istanbul",
      type: "Relaxation",
      description:
        "See Istanbul’s skyline from the water during a relaxed sunset cruise.",
      cost: 1800,
    },
  ];
  const activityImage = (city) =>
    (state.discover.find((x) => x.name === city) || {}).image || "";
  activityCatalog.forEach((a) =>
    items.push({
      id: a.id,
      kind: "activity",
      name: a.name,
      country: a.city,
      description: a.description,
      type: a.type,
      cost: a.cost,
      costIndex: a.cost ? "From " + money(a.cost) : "Free",
      popular: 0,
      image: activityImage(a.city),
    }),
  );
  state.discover.forEach((x) =>
    items.push({
      id: `city-${x.id}`,
      sourceId: x.id,
      kind: "city",
      name: x.name,
      country: x.country,
      description: x.description,
      type: x.type,
      cost: Number(x.default_cost || 0),
      costIndex: x.cost_index,
      popular: Number(x.popular || 0),
      image: x.image,
    }),
  );
  const seen = new Set();
  (state.trip?.stops || []).forEach((s) =>
    (s.activities || []).forEach((a) => {
      const key = `${s.city}|${a.name}`;
      if (
        seen.has(key) ||
        items.some(
          (x) =>
            x.kind === "activity" &&
            x.name.toLowerCase() === String(a.name).toLowerCase() &&
            x.country.toLowerCase() === String(s.city).toLowerCase(),
        )
      )
        return;
      seen.add(key);
      items.push({
        id: `activity-${s.city}-${a.name}`,
        kind: "activity",
        name: a.name,
        country: s.city,
        description: a.description || `${a.type || "Experience"} in ${s.city}.`,
        type: a.type || "Experience",
        cost: Number(a.cost || 0),
        costIndex: a.cost ? money(a.cost) : "Free",
        popular: 0,
        image:
          (state.discover.find((x) => x.name === s.city) || {}).image || "",
      });
    }),
  );
  return items;
}
function activityCitySearchCards(items) {
  if (!items.length)
    return `<div class="activity-city-empty card"><div class="activity-city-empty-icon">⌕</div><strong>No options found.</strong><p>Try another search term or change the filter and sorting options.</p></div>`;
  return items
    .map(
      (x, i) => `<article class="activity-city-result card">
   <div class="activity-city-result-main">
     <div class="activity-city-index">${i + 1}</div>
     ${x.image ? `<div class="activity-city-thumb" style="background-image:url('${esc(x.image)}')"></div>` : ""}
     <div class="activity-city-copy">
       <div class="activity-city-meta"><span class="activity-city-kind">${x.kind === "city" ? "City" : "Activity"}</span><span>${esc(x.type)}</span></div>
       <h3>${esc(x.name)}</h3>
       <p>${esc(x.description)}</p>
       <div class="activity-city-tags"><span>${esc(x.country)}</span><span>${x.kind === "city" ? `From ${esc(x.costIndex)}` : `${esc(x.costIndex)}`}</span></div>
     </div>
   </div>
   <div class="activity-city-actions">
     <div class="activity-city-cost">${x.cost ? money(x.cost) : "Free"}</div>
     <button class="secondary" data-search-details="${esc(x.id)}">Details</button>
     <button class="primary" data-search-add="${esc(x.id)}">${x.kind === "city" ? "Add city" : "Add activity"}</button>
   </div>
 </article>`,
    )
    .join("");
}
function renderActivityCitySearch() {
  return `<section class="activity-city-shell">
   <div class="activity-city-heading">
     <div><div class="eyebrow-blue">SEARCH & EXPLORE</div><h1>Activity / City Search Page</h1><p>Search cities and activities, then narrow the results with grouping, filters, and sorting.</p></div>
   </div>
   <div class="activity-city-toolbar">
     <div class="activity-city-search"><span>⌕</span><input id="activityCitySearch" placeholder="Search cities, activities, places..."></div>
     <select id="activityCityGroup" class="activity-city-control" aria-label="Group by">
       <option value="none">Group by</option><option value="kind">City / Activity</option><option value="country">Country / City</option><option value="type">Activity type</option>
     </select>
     <select id="activityCityFilter" class="activity-city-control" aria-label="Filter">
       <option value="all">Filter</option><option value="city">Cities only</option><option value="activity">Activities only</option><option value="free">Free</option><option value="budget">Budget friendly</option><option value="popular">Popular</option>
     </select>
     <select id="activityCitySort" class="activity-city-control" aria-label="Sort by">
       <option value="relevance">Sort by</option><option value="relevance">Relevance</option><option value="az">A → Z</option><option value="cost-low">Cost: Low to High</option><option value="cost-high">Cost: High to Low</option>
     </select>
   </div>
   <div class="activity-city-result-label"><span id="activityCityCount"></span><span>Search results</span></div>
   <div id="activityCityResults" class="activity-city-results"></div>
 </section>`;
}
function refreshActivityCitySearch() {
  const search = $("#activityCitySearch"),
    group = $("#activityCityGroup"),
    filter = $("#activityCityFilter"),
    sort = $("#activityCitySort"),
    results = $("#activityCityResults");
  if (!search || !group || !filter || !sort || !results) return;
  const q = search.value.toLowerCase().trim(),
    f = filter.value,
    s = sort.value,
    g = group.value;
  let items = getActivityCitySearchItems();
  items = items.filter(
    (x) =>
      !q ||
      (
        x.name +
        " " +
        x.country +
        " " +
        x.description +
        " " +
        x.type +
        " " +
        x.kind
      )
        .toLowerCase()
        .includes(q),
  );
  if (f === "city") items = items.filter((x) => x.kind === "city");
  else if (f === "activity") items = items.filter((x) => x.kind === "activity");
  else if (f === "free") items = items.filter((x) => x.cost === 0);
  else if (f === "budget")
    items = items.filter((x) => x.cost > 0 && x.cost <= 12000);
  else if (f === "popular") items = items.filter((x) => Number(x.popular) >= 8);
  if (s === "az") items.sort((a, b) => a.name.localeCompare(b.name));
  else if (s === "cost-low") items.sort((a, b) => a.cost - b.cost);
  else if (s === "cost-high") items.sort((a, b) => b.cost - a.cost);
  else if (s === "relevance" && q)
    items.sort((a, b) => {
      const score = (x) =>
        (x.name.toLowerCase() === q ? 100 : 0) +
        (x.name.toLowerCase().startsWith(q) ? 30 : 0) +
        (x.name.toLowerCase().includes(q) ? 15 : 0) +
        Number(x.popular || 0);
      return score(b) - score(a);
    });
  $("#activityCityCount").textContent = `${items.length}`;
  if (g === "none") {
    results.innerHTML = activityCitySearchCards(items);
    return;
  }
  const groups = {};
  items.forEach((x) => {
    const key =
      g === "kind"
        ? x.kind === "city"
          ? "Cities"
          : "Activities"
        : g === "country"
          ? x.country
          : x.type;
    (groups[key] ||= []).push(x);
  });
  results.innerHTML = Object.entries(groups)
    .map(
      ([key, groupItems]) =>
        `<section class="activity-city-group"><div class="activity-city-group-title"><strong>${esc(key)}</strong><span>${groupItems.length} option${groupItems.length === 1 ? "" : "s"}</span></div>${activityCitySearchCards(groupItems)}</section>`,
    )
    .join("");
}
function renderCreate() {
  return `${title("NEW JOURNEY", "Create a new trip", "Start with the basics. You can add cities and activities next.", `<button class="secondary" data-page="trips">Cancel</button>`)}<form id="createTripForm" class="card form-card"><div class="form-grid"><div class="field"><label>TRIP NAME</label><input id="tripName" required placeholder="e.g. Japan in spring"></div><div class="field"><label>TRIP COVER IMAGE URL</label><input id="tripCover" placeholder="Optional image URL"></div><div class="field"><label>START DATE</label><input id="tripStart" type="date" required></div><div class="field"><label>END DATE</label><input id="tripEnd" type="date" required></div><div class="field"><label>PLANNED BUDGET</label><input id="tripBudget" type="number" min="0" placeholder="50000"></div><div class="field"><label>TRAVEL STYLE</label><select id="tripStyle"><option>Balanced</option><option>Budget</option><option>Luxury</option><option>Adventure</option><option>Relaxed</option></select></div><div class="field full"><label>DESCRIPTION</label><textarea id="tripDescription" placeholder="What do you want this journey to feel like?"></textarea></div></div><div class="form-footer"><button type="submit" class="primary">Create trip →</button></div></form>`;
}
function renderItinerary() {
  if (!state.trip)
    return `${title("ITINERARY", "Choose a trip", "Select a trip from My trips to start building your day-by-day plan.")}<div class="trip-grid">${state.trips.map((t) => `<div class="trip-card card"><div class="trip-body"><h3>${esc(t.name)}</h3><p>${esc(t.start_date)} — ${esc(t.end_date)}</p><button class="primary wide" data-open-trip="${t.id}">Open itinerary</button></div></div>`).join("")}</div>`;
  const stops = state.trip.stops || [];
  return `${title("TRIP BUILDER", esc(state.trip.name), "Build a clear, flexible plan — one stop and one experience at a time.", `<button class="secondary" data-page="trips">← My trips</button><button class="primary" data-add-stop>Add stop</button>`)}<div class="itinerary-layout"><aside class="card stop-list"><div class="section-head"><h3>Stops</h3><span class="chip">${stops.length}</span></div>${stops.length ? stops.map((s, i) => `<div class="stop-item ${i === 0 ? "active" : ""}"><b>${i + 1}. ${esc(s.city)}</b><small>${esc(s.start_date)} · ${esc(s.end_date)}</small></div>`).join("") : `<div class="empty"><strong>No stops yet</strong>Add your first city.</div>`}</aside><section class="card day-card"><div class="section-head"><div><h3>${esc(stops[0]?.city || "Your itinerary")}</h3><small style="color:#879aa8">Day-by-day experiences</small></div><button class="secondary" data-add-activity>+ Activity</button></div>${stops.length ? stops.map((s, i) => `<div class="day-row"><div class="day-date"><strong>${i + 1}</strong><span>DAY</span></div><div style="flex:1"><b style="font-size:12px">${esc(s.city)}</b>${(s.activities || []).map((a) => `<div class="activity" style="margin-top:8px"><div><b>${esc(a.name)}</b><small>${esc(a.time || "Flexible")} · ${esc(a.type || "Experience")}</small></div><span class="price">${money(a.cost)}</span></div>`).join("") || `<div class="empty" style="padding:18px"><strong>No activities added</strong>Use + Activity to fill this day.</div>`}</div></div>`).join("") : `<div class="empty"><strong>Your itinerary is blank.</strong>Add a stop to begin.</div>`}</section></div>`;
}
function renderBudget() {
  const t = state.trip || state.trips[0];
  if (!t)
    return `${title("BUDGET", "Trip budget", "Create a trip first to see your budget.")}`;
  const total = Number(t.budget || 0);
  const spent = Number(t.spent || 0);
  const pct = total ? Math.min(100, (spent / total) * 100) : 0;
  const stops = t.stops || [];
  const dayTotal = (s) =>
    (s.activities || []).reduce((sum, a) => sum + Number(a.cost || 0), 0);
  const fmtDate = (d) => {
    if (!d) return "";
    const x = new Date(d + "T00:00:00");
    return x.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };
  const dayMarkup = stops.length
    ? stops
        .map((s, i) => {
          const activities = s.activities || [];
          const rows = activities.length
            ? activities
                .map(
                  (a, j) => `
     <div class="budget-activity-row">
       <div class="budget-activity-main">
         <div class="budget-activity-dot">${j + 1}</div>
         <div>
           <strong>${esc(a.name || "Activity")}</strong>
           <small>${esc(a.time || "Flexible")} · ${esc(a.type || "Physical Activity")}</small>
         </div>
       </div>
       <div class="budget-expense">${money(a.cost || 0)}</div>
     </div>`,
                )
                .join("")
            : `<div class="budget-empty-row"><span>No activities added for this day.</span><b>${money(0)}</b></div>`;
          return `<section class="budget-day-card" data-day-total="${dayTotal(s)}">
     <div class="budget-day-head">
       <div class="budget-day-label"><span>DAY ${i + 1}</span><strong>${esc(s.city || "Day " + (i + 1))}</strong><small>${fmtDate(s.start_date)}${s.end_date && s.end_date !== s.start_date ? " — " + fmtDate(s.end_date) : ""}</small></div>
       <div class="budget-day-total"><small>Day total</small><strong>${money(dayTotal(s))}</strong></div>
     </div>
     <div class="budget-columns"><span>Physical Activity</span><span>Expense</span></div>
     <div class="budget-activity-list">${rows}</div>
   </section>`;
        })
        .join("")
    : `<div class="budget-day-empty"><div class="budget-empty-icon">◒</div><strong>No day-wise itinerary yet</strong><p>Add stops and activities in Itinerary to see the budget broken down by day.</p><button class="secondary" data-page="itinerary">Open itinerary</button></div>`;
  return `${title("MONEY PLAN", "Day-wise trip budget", "Track exactly what you plan to spend on each day of your journey.", `<button class="secondary" data-page="itinerary">Edit itinerary</button>`)}
 <section class="budget-overview-card">
   <div><div class="eyebrow-blue">${esc(t.name)}</div><div class="budget-overview-number">${money(total)}</div><p>Planned budget</p></div>
   <div class="budget-overview-right"><div class="budget-overview-meta"><span>Estimated spend</span><strong>${money(spent)}</strong><span>${Math.round(pct)}% used</span></div><div class="budget-progress"><span style="width:${pct}%"></span></div><small>${money(Math.max(0, total - spent))} remaining</small></div>
 </section>
 <div class="budget-day-toolbar"><div class="budget-search"><span>⌕</span><input id="budgetDaySearch" placeholder="Search activities..."></div><div class="budget-toolbar-actions"><button class="budget-filter active" data-budget-filter="all">All days</button><button class="budget-filter" data-budget-filter="highest">Highest spend</button></div></div>
 <div id="budgetDayList" class="budget-day-list">${dayMarkup}</div>`;
}
function renderCalendar() {
  const t = state.trip || state.trips[0];
  if (!t)
    return `${title("CALENDAR", "Trip calendar", "Open a trip to visualize your journey.")}`;
  const start = new Date(t.start_date),
    days = [];
  for (let i = 0; i < 35; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return `${title("VISUAL PLAN", "Calendar", "See your journey as a clean timeline.", `<button class="secondary" data-page="itinerary">Open itinerary</button>`)}<section class="card calendar"><div class="calendar-head">${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((x) => `<div>${x}</div>`).join("")}</div><div class="calendar-grid">${days
    .map((d, i) => {
      const day = d.getDate();
      const ev =
        i < (t.stops_count || 0) ? t.stops?.[i]?.city || "Travel day" : "";
      return `<div class="cal-day ${i > 20 ? "muted" : ""}"><div class="cal-num">${day}</div>${ev ? `<div class="event">⌖ ${esc(ev)}</div>` : ""}</div>`;
    })
    .join("")}</div></section>`;
}
function renderShared() {
  const pub = state.trips.filter((t) => t.is_public);
  return `${title("COMMUNITY", "Shared trips", "Beautiful read-only trip pages you can send to friends.", `<button class="primary" data-page="trips">Manage trips</button>`)}<div class="card section-card">${pub.length ? pub.map((t) => `<div class="share-card" style="border-bottom:1px solid var(--line)"><div><h3 style="font:800 15px Manrope;margin:0 0 5px">${esc(t.name)}</h3><p style="margin:0;font-size:11px;color:#8195a5">${esc(t.start_date)} — ${esc(t.end_date)}</p></div><div class="share-url">globetrotter.local/share/${esc(t.share_token || t.id)}</div><button class="secondary" data-copy-share="${t.share_token || t.id}">Copy link</button></div>`).join("") : `<div class="empty"><strong>No public trips yet.</strong>Open a trip and turn on sharing to create a public view.</div>`}</div>`;
}
function renderProfile() {
  const u = state.user || {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const planned = state.trips.filter((t) => {
    const d = new Date((t.start_date || "") + "T00:00:00");
    return !Number.isNaN(d.getTime()) && d >= today;
  });
  const previous = state.trips.filter((t) => {
    const d = new Date((t.end_date || "") + "T00:00:00");
    return !Number.isNaN(d.getTime()) && d < today;
  });
  const dateRange = (t) =>
    `${esc(t.start_date || "")} — ${esc(t.end_date || "")}`;
  const profileTripCard = (t, type) => `<article class="profile-trip-card card">
   <div class="profile-trip-cover" style="background-image:url('${esc(t.cover || "")}')">
     <span class="profile-trip-badge ${type === "previous" ? "past" : ""}">${type === "previous" ? "Completed" : "Planned"}</span>
   </div>
   <div class="profile-trip-body">
     <div><h4>${esc(t.name)}</h4><p>⌖ ${t.stops_count || 0} stops · ${dateRange(t)}</p></div>
     <div class="profile-trip-footer"><span>${money(t.budget || 0)} budget</span><button class="small-btn primary-mini" data-open-trip="${t.id}">View</button></div>
   </div>
 </article>`;
  const tripSection = (
    label,
    items,
    type,
    emptyTitle,
    emptyText,
    action,
  ) => `<section class="profile-trips-section">
   <div class="profile-trips-head"><div><div class="eyebrow-blue">${type === "previous" ? "TRAVEL HISTORY" : "UPCOMING JOURNEYS"}</div><h2>${label}</h2><p>${emptyText}</p></div><span class="profile-trip-count">${items.length}</span></div>
   ${items.length ? `<div class="profile-trip-grid">${items.map((t) => profileTripCard(t, type)).join("")}</div>` : `<div class="profile-trip-empty card"><div class="profile-empty-icon">${type === "previous" ? "◷" : "✈"}</div><strong>${emptyTitle}</strong><p>${emptyText}</p>${action ? `<button class="secondary" data-page="${action.page}">${action.label}</button>` : ""}</div>`}
 </section>`;
  return `${title("ACCOUNT", "Profile & settings", "Manage your details and see the trips belonging to your account.")}
 <div class="profile-layout">
   <aside class="card profile-card">
     <div class="big-avatar">${esc(
       (u.name || "Traveler")
         .split(" ")
         .map((x) => x[0])
         .slice(0, 2)
         .join("")
         .toUpperCase(),
     )}</div>
     <h3>${esc(u.name || "Traveler")}</h3><p>${esc(u.email || "")}</p><hr>
     <div class="profile-stat"><span>Total trips</span><b>${state.trips.length}</b></div>
     <div class="profile-stat"><span>Preplanned</span><b>${planned.length}</b></div>
     <div class="profile-stat"><span>Previous</span><b>${previous.length}</b></div>
     <div class="profile-stat"><span>Member since</span><b>2026</b></div>
   </aside>
   <section class="card form-card" style="max-width:none"><form id="profileForm"><div class="form-grid">
     <div class="field"><label>FULL NAME</label><input id="profileName" value="${esc(u.name || "")}"></div>
     <div class="field"><label>EMAIL</label><input value="${esc(u.email || "")}" disabled></div>
     <div class="field"><label>HOME COUNTRY</label><input id="profileCountry" value="${esc(u.country || "India")}" placeholder="India"></div>
     <div class="field"><label>TRAVEL STYLE</label><select id="profileStyle"><option ${u.style === "Balanced" ? "selected" : ""}>Balanced</option><option ${u.style === "Budget" ? "selected" : ""}>Budget</option><option ${u.style === "Luxury" ? "selected" : ""}>Luxury</option><option ${u.style === "Adventure" ? "selected" : ""}>Adventure</option></select></div>
   </div><div class="form-footer"><button class="primary">Save changes</button></div></form></section>
 </div>
 <div class="profile-trip-sections">
   ${tripSection("Preplanned Trips", planned, "planned", "No preplanned trips yet", "Your upcoming trips will appear here when you create them.", { page: "create", label: "+ Plan a trip" })}
   ${tripSection("Previous Trips", previous, "previous", "No previous trips yet", "Trips you have completed will automatically move here after their end date.", null)}
 </div>`;
}
function bindPage() {
  $$("[data-plan-new-trip]").forEach(
    (b) =>
      (b.onclick = () => {
        if (!state.user) {
          window.location.href =
            "login.html?redirectTo=" + encodeURIComponent("/trips/new");
          return;
        }
        window.location.href = "new-trip.html";
      }),
  );
  $$("[data-page]").forEach(
    (b) =>
      (b.onclick = () => {
        const p = b.dataset.page;
        if (p === "create") {
          if (!state.user) {
            window.location.href =
              "login.html?redirectTo=" + encodeURIComponent("/trips/new");
            return;
          }
          window.location.href = "new-trip.html";
          return;
        } else nav(p);
      }),
  );
  const bs = $("#budgetDaySearch");
  if (bs)
    bs.oninput = () => {
      const q = bs.value.toLowerCase().trim();
      $$(".budget-day-card").forEach((day) => {
        let match = false;
        day.querySelectorAll(".budget-activity-row").forEach((row) => {
          const ok = !q || row.textContent.toLowerCase().includes(q);
          row.style.display = ok ? "flex" : "none";
          if (ok) match = true;
        });
        day.style.display = match || !q ? "block" : "none";
      });
    };
  $$("[data-budget-filter]").forEach(
    (b) =>
      (b.onclick = () => {
        const f = b.dataset.budgetFilter;
        $$("[data-budget-filter]").forEach((x) =>
          x.classList.toggle("active", x === b),
        );
        const list = $("#budgetDayList");
        const days = $$(".budget-day-card");
        if (f === "highest") {
          days.sort(
            (a, b) => Number(b.dataset.dayTotal) - Number(a.dataset.dayTotal),
          );
          days.forEach((x) => list.appendChild(x));
        } else {
          days.sort(
            (a, b) =>
              Number(
                a
                  .querySelector(".budget-day-label span")
                  .textContent.replace(/\D/g, ""),
              ) -
              Number(
                b
                  .querySelector(".budget-day-label span")
                  .textContent.replace(/\D/g, ""),
              ),
          );
          days.forEach((x) => list.appendChild(x));
        }
      }),
  );
  const sf = $("#tripSearch");
  if (sf)
    sf.oninput = () => {
      const q = sf.value.toLowerCase();
      $("#tripGrid").innerHTML = tripCards(
        state.trips.filter((t) => (t.name || "").toLowerCase().includes(q)),
      );
    };
  const df = $("#discoverSearch");
  if (df)
    df.oninput = () => {
      const q = df.value.toLowerCase();
      $("#discoverGrid").innerHTML = discoverCards(
        state.discover.filter((x) =>
          (x.name + x.country + x.description).toLowerCase().includes(q),
        ),
      );
    };
  const acs = $("#activityCitySearch"),
    acg = $("#activityCityGroup"),
    acf = $("#activityCityFilter"),
    acsrt = $("#activityCitySort");
  if (acs && acg && acf && acsrt) {
    acs.oninput = refreshActivityCitySearch;
    acg.onchange = refreshActivityCitySearch;
    acf.onchange = refreshActivityCitySearch;
    acsrt.onchange = refreshActivityCitySearch;
    refreshActivityCitySearch();
  }
  $("#createTripForm")?.addEventListener("submit", createTrip);
  $("#profileForm")?.addEventListener("submit", saveProfile);
  $$("[data-open-trip]").forEach(
    (b) => (b.onclick = () => openTrip(b.dataset.openTrip)),
  );
  $$("[data-delete-trip]").forEach(
    (b) => (b.onclick = () => deleteTrip(b.dataset.deleteTrip)),
  );
  $$("[data-share-trip]").forEach(
    (b) => (b.onclick = () => shareTrip(b.dataset.shareTrip)),
  );
  $$("[data-edit-trip]").forEach(
    (b) => (b.onclick = () => editTrip(b.dataset.editTrip)),
  );
  $$("[data-add-stop]").forEach((b) => (b.onclick = addStop));
  $$("[data-add-activity]").forEach((b) => (b.onclick = addActivity));
  $$("[data-discover-add]").forEach(
    (b) => (b.onclick = () => addDiscover(b.dataset.discoverAdd)),
  );
  $$("[data-search-details]").forEach(
    (b) => (b.onclick = () => showActivityCityDetails(b.dataset.searchDetails)),
  );
  $$("[data-search-add]").forEach(
    (b) => (b.onclick = () => addActivityCitySearchItem(b.dataset.searchAdd)),
  );
  $$("[data-copy-share]").forEach(
    (b) =>
      (b.onclick = () => {
        navigator.clipboard?.writeText(
          location.origin + "/share.html?trip=" + b.dataset.copyShare,
        );
        toast("Share link copied");
      }),
  );
  $$("[data-trip-filter]").forEach(
    (b) =>
      (b.onclick = () => {
        const f = b.dataset.tripFilter;
        $("#tripGrid").innerHTML = tripCards(
          f === "all"
            ? state.trips
            : state.trips.filter((t) =>
                f === "upcoming"
                  ? t.status === "upcoming"
                  : t.status === "past",
              ),
        );
      }),
  );
  const cs = $("#communitySearch"),
    cg = $("#communityGroup"),
    cf = $("#communityFilter"),
    co = $("#communitySort");
  if (cs && cg && cf && co) {
    const refreshCommunity = () => {
      let posts = [...state.community],
        q = cs.value.toLowerCase().trim(),
        f = cf.value,
        s = co.value;
      posts = posts.filter(
        (p) =>
          !q ||
          (
            p.title +
            " " +
            p.content +
            " " +
            p.destination +
            " " +
            p.category +
            " " +
            p.style
          )
            .toLowerCase()
            .includes(q),
      );
      if (f !== "all") posts = posts.filter((p) => p.category === f);
      if (s === "likes")
        posts.sort((a, b) => Number(b.likes) - Number(a.likes));
      else if (s === "comments")
        posts.sort((a, b) => Number(b.comments) - Number(a.comments));
      else posts.sort((a, b) => Number(b.id) - Number(a.id));
      $("#communityFeed").innerHTML = communityFeed(posts);
      $$("[data-community-like]").forEach(
        (b) =>
          (b.onclick = () => {
            const p = state.community.find(
              (x) => String(x.id) === String(b.dataset.communityLike),
            );
            if (p) {
              p.likes = Number(p.likes || 0) + 1;
              refreshCommunity();
            }
          }),
      );
    };
    cs.oninput = refreshCommunity;
    cf.onchange = refreshCommunity;
    co.onchange = refreshCommunity;
    cg.onchange = refreshCommunity;
    refreshCommunity();
  }
  $$("[data-community-comments]").forEach(
    (b) =>
      (b.onclick = () =>
        toast("Comments are available in the community discussion view.")),
  );
}
async function createTrip(e) {
  e.preventDefault();
  const d = await api("create_trip", {
    method: "POST",
    body: {
      name: $("#tripName").value,
      start_date: $("#tripStart").value,
      end_date: $("#tripEnd").value,
      budget: $("#tripBudget").value,
      style: $("#tripStyle").value,
      description: $("#tripDescription").value,
      cover: $("#tripCover").value,
    },
  });
  toast("Trip created successfully");
  state.trips.unshift(d.trip);
  openTrip(d.trip.id);
}
async function openTrip(id) {
  const d = await api("trip&id=" + id);
  state.trip = d.trip;
  state.page = "itinerary";
  $("#breadcrumbs").textContent = "Itinerary";
  render();
}
async function shareTrip(id) {
  const t = state.trips.find((x) => x.id == id);
  if (!t) return;
  await api("toggle_share", {
    method: "POST",
    body: { id, is_public: t.is_public ? 0 : 1 },
  });
  t.is_public = t.is_public ? 0 : 1;
  toast(t.is_public ? "Trip is now public" : "Trip sharing turned off");
  render();
}
async function deleteTrip(id) {
  if (!confirm("Delete this trip? This cannot be undone.")) return;
  await api("delete_trip", { method: "POST", body: { id } });
  state.trips = state.trips.filter((t) => String(t.id) !== String(id));
  if (state.trip?.id == id) state.trip = null;
  toast("Trip deleted");
  render();
}
async function editTrip(id) {
  const t = state.trips.find((x) => x.id == id);
  if (!t) return;
  $("#modalCard").innerHTML =
    `<h2>Edit trip</h2><p>Update the core details of your journey.</p><form id="editForm" class="auth-form"><div><label>Trip name</label><input id="editName" value="${esc(t.name)}" required></div><div class="two"><div><label>Start</label><input id="editStart" type="date" value="${t.start_date}"></div><div><label>End</label><input id="editEnd" type="date" value="${t.end_date}"></div></div><div><label>Budget</label><input id="editBudget" type="number" value="${t.budget}"></div><button class="primary wide">Save changes</button></form>`;
  openModal();
  $("#editForm").onsubmit = async (e) => {
    e.preventDefault();
    const d = await api("update_trip", {
      method: "POST",
      body: {
        id,
        name: $("#editName").value,
        start_date: $("#editStart").value,
        end_date: $("#editEnd").value,
        budget: $("#editBudget").value,
      },
    });
    state.trips = state.trips.map((x) =>
      x.id == id ? { ...x, ...d.trip } : x,
    );
    closeModal();
    toast("Trip updated");
    render();
  };
}
async function addStop() {
  if (!state.trip) return;
  $("#modalCard").innerHTML =
    `<h2>Add a stop</h2><p>Choose a city and dates for this part of your journey.</p><form id="stopForm" class="auth-form"><div><label>CITY</label><input id="stopCity" required placeholder="Kyoto"></div><div class="two"><div><label>START</label><input id="stopStart" type="date" required value="${state.trip.start_date}"></div><div><label>END</label><input id="stopEnd" type="date" required value="${state.trip.end_date}"></div></div><button class="primary wide">Add stop</button></form>`;
  openModal();
  $("#stopForm").onsubmit = async (e) => {
    e.preventDefault();
    const d = await api("add_stop", {
      method: "POST",
      body: {
        trip_id: state.trip.id,
        city: $("#stopCity").value,
        start_date: $("#stopStart").value,
        end_date: $("#stopEnd").value,
      },
    });
    state.trip = d.trip;
    closeModal();
    toast("Stop added");
    render();
  };
}
async function addActivity() {
  if (!state.trip) return;
  const cities = (state.trip.stops || [])
    .map((s) => `<option>${esc(s.city)}</option>`)
    .join("");
  $("#modalCard").innerHTML =
    `<h2>Add an activity</h2><p>Add an experience with an estimated time and cost.</p><form id="actForm" class="auth-form"><div><label>STOP</label><select id="actStop">${cities}</select></div><div><label>ACTIVITY</label><input id="actName" required placeholder="Fushimi Inari at sunrise"></div><div class="two"><div><label>TIME</label><input id="actTime" placeholder="08:30 AM"></div><div><label>COST</label><input id="actCost" type="number" value="0"></div></div><div><label>TYPE</label><select id="actType"><option>Sightseeing</option><option>Food</option><option>Adventure</option><option>Culture</option><option>Shopping</option><option>Relaxation</option></select></div><button class="primary wide">Add activity</button></form>`;
  openModal();
  $("#actForm").onsubmit = async (e) => {
    e.preventDefault();
    const d = await api("add_activity", {
      method: "POST",
      body: {
        trip_id: state.trip.id,
        city: $("#actStop").value,
        name: $("#actName").value,
        time: $("#actTime").value,
        cost: $("#actCost").value,
        type: $("#actType").value,
      },
    });
    state.trip = d.trip;
    closeModal();
    toast("Activity added");
    render();
  };
}
function showActivityCityDetails(id) {
  const x = getActivityCitySearchItems().find(
    (item) => String(item.id) === String(id),
  );
  if (!x) {
    toast("Details are not available for this option");
    return;
  }
  $("#modalCard").innerHTML =
    `<div class="activity-city-detail">${x.image ? `<div class="activity-city-detail-image" style="background-image:url('${esc(x.image)}')"></div>` : ""}<div class="activity-city-detail-body"><div class="activity-city-meta"><span class="activity-city-kind">${x.kind === "city" ? "City" : "Activity"}</span><span>${esc(x.type)}</span></div><h2>${esc(x.name)}</h2><p>${esc(x.description)}</p><div class="activity-city-detail-grid"><div><small>Location</small><strong>${esc(x.country)}</strong></div><div><small>Estimated cost</small><strong>${x.cost ? money(x.cost) : "Free"}</strong></div></div><button type="button" class="primary wide" data-detail-add="${esc(x.id)}">${x.kind === "city" ? "Add city to trip" : "Add activity to trip"}</button></div></div>`;
  openModal();
  const addButton = $("#modalCard").querySelector("[data-detail-add]");
  if (addButton)
    addButton.onclick = async () => {
      closeModal();
      await addActivityCitySearchItem(id);
    };
}

function openCreateTripFromSearch() {
  state.page = "create";
  $("#breadcrumbs").textContent = "Create trip";
  renderCreate();
  bindPage();
}

async function ensureSearchTrip() {
  if (state.trip) return state.trip;
  const preferred =
    state.trips.find((t) => t.status === "upcoming") ||
    state.trips.find((t) => t.status === "planned") ||
    state.trips[0];
  if (preferred) {
    const d = await api("trip&id=" + preferred.id);
    state.trip = d.trip;
    return state.trip;
  }
  return null;
}

async function addActivityCitySearchItem(id) {
  const x = getActivityCitySearchItems().find(
    (item) => String(item.id) === String(id),
  );
  if (!x) {
    toast("This option is no longer available");
    return;
  }
  try {
    const trip = await ensureSearchTrip();
    if (!trip) {
      toast("Create a trip first");
      openCreateTripFromSearch();
      return;
    }

    if (x.kind === "city") {
      const existing = (trip.stops || []).some(
        (s) =>
          String(s.city).trim().toLowerCase() ===
          String(x.name).trim().toLowerCase(),
      );
      if (existing) {
        toast(`${x.name} is already in this trip`);
        state.page = "itinerary";
        $("#breadcrumbs").textContent = "Itinerary";
        render();
        return;
      }
      const d = await api("add_stop", {
        method: "POST",
        body: {
          trip_id: trip.id,
          city: x.name,
          start_date: trip.start_date,
          end_date: trip.end_date,
        },
      });
      state.trip = d.trip;
      toast(`${x.name} added to your itinerary`);
      state.page = "itinerary";
      $("#breadcrumbs").textContent = "Itinerary";
      render();
      return;
    }

    const cities = trip.stops || [];
    if (!cities.length) {
      toast("Add a city to the itinerary first");
      state.page = "itinerary";
      $("#breadcrumbs").textContent = "Itinerary";
      render();
      return;
    }
    const city = cities[0].city;
    const d = await api("add_activity", {
      method: "POST",
      body: {
        trip_id: trip.id,
        city,
        name: x.name,
        time: "Flexible",
        cost: x.cost,
        type: x.type,
      },
    });
    state.trip = d.trip;
    toast(`${x.name} added to ${city}`);
    state.page = "itinerary";
    $("#breadcrumbs").textContent = "Itinerary";
    render();
  } catch (e) {
    // api() already shows the server error in a toast; keep the search page intact on failure.
  }
}

async function addDiscover(id) {
  if (!state.trip) {
    toast("Open a trip first");
    return;
  }
  const x = state.discover.find((i) => i.id == id);
  if (!x) return;
  const cities = state.trip.stops || [];
  if (!cities.length) {
    toast("Add a stop first");
    nav("itinerary");
    return;
  }
  await api("add_activity", {
    method: "POST",
    body: {
      trip_id: state.trip.id,
      city: cities[0].city,
      name: x.name,
      time: "Flexible",
      cost: x.default_cost,
      type: x.type,
    },
  });
  const d = await api("trip&id=" + state.trip.id);
  state.trip = d.trip;
  toast(`${x.name} added to ${cities[0].city}`);
}
async function saveProfile(e) {
  e.preventDefault();
  const d = await api("profile", {
    method: "POST",
    body: {
      name: $("#profileName").value,
      country: $("#profileCountry").value,
      style: $("#profileStyle").value,
    },
  });
  state.user = d.user;
  $(".avatar").textContent = state.user.name
    .split(" ")
    .map((x) => x[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  toast("Profile saved");
}
function openModal() {
  $("#modal").classList.remove("hidden");
}
function closeModal() {
  $("#modal").classList.add("hidden");
}
$$(".auth-tab").forEach((b) => (b.onclick = () => setAuth(b.dataset.auth)));
$("[data-toggle-password]")?.addEventListener("click", () => {
  const i = $("#loginPassword");
  i.type = i.type === "password" ? "text" : "password";
});
$("[data-forgot]")?.addEventListener("click", () =>
  toast("Password recovery can be connected later."),
);
$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const d = await api("login", {
    method: "POST",
    body: {
      login: $("#loginIdentifier").value,
      password: $("#loginPassword").value,
      remember: $("#rememberMe").checked,
    },
  });
  state.user = d.user;
  showApp();
  await loadData();
  toast("Welcome back ✦");
});
$("#signupForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if ($("#signupPassword").value !== $("#signupConfirmPassword").value) {
    toast("Passwords do not match.");
    return;
  }
  const d = await api("signup", {
    method: "POST",
    body: {
      name: $("#signupName").value,
      username: $("#signupUsername").value,
      email: $("#signupEmail").value,
      password: $("#signupPassword").value,
      confirm_password: $("#signupConfirmPassword").value,
    },
  });
  state.user = d.user;
  showApp();
  await loadData();
  toast("Account created — welcome to GlobeTrotter ✦");
});
$$(".nav-item").forEach((b) => (b.onclick = () => nav(b.dataset.page)));
$("[data-logout]").onclick = async () => {
  await api("logout", { method: "POST" });
  state.user = null;
  state.trips = [];
  state.trip = null;
  showAuth();
  setAuth("login");
  $("#loginForm").reset();
  $("#signupForm").reset();
  toast("You have been logged out safely.");
};
$("[data-open-sidebar]").onclick = () => $(".sidebar").classList.add("open");
$("[data-close-sidebar]").onclick = () =>
  $(".sidebar").classList.remove("open");
$("[data-close-modal]").onclick = closeModal;
$("#modal").addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-backdrop")) closeModal();
});
$("[data-notifications]").onclick = () => toast("You have 3 travel reminders");
document.addEventListener("click", (e) => {
  const details = e.target.closest("[data-search-details]");
  if (details) {
    e.preventDefault();
    showActivityCityDetails(details.dataset.searchDetails);
    return;
  }
  const add = e.target.closest("[data-search-add]");
  if (add) {
    e.preventDefault();
    addActivityCitySearchItem(add.dataset.searchAdd);
    return;
  }
});
boot();

/* UI polish: keyboard navigation + subtle button feedback */
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    const input = document.querySelector("#tripSearch, #discoverSearch");
    if (input) {
      input.focus();
      input.select();
    } else toast("Open My trips or Discover to search.");
  }
  if (e.key === "Escape" && !document.querySelector("#modal.hidden"))
    closeModal();
});
document.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b || b.disabled) return;
  b.animate([{ transform: "scale(.98)" }, { transform: "scale(1)" }], {
    duration: 150,
    easing: "ease-out",
  });
});
