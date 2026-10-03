(() => {
  const $ = id => document.getElementById(id);
  const audio = $("audio");
  const state = { list: [], index: -1, shuffle: false, repeat: false, view: ["home"] };
  let user = null, data = null, toastTimer;

  const store = {
    get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  };

  const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
  const gradient = h => `linear-gradient(135deg, hsl(${h} 70% 45%), hsl(${(h + 60) % 360} 70% 25%))`;

  const cover = (item, cls = "") => {
    const h = typeof item === "object" ? item.hue : item;
    const image = typeof item === "object" ? item.cover : null;

    return image
      ? `<div class="cover ${cls}" style="background-image:url('${image}');background-size:cover;background-position:center;"></div>`
      : `<div class="cover ${cls}" style="background:${gradient(h)}"></div>`;
  };

  const fmt = s => isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "0:00";
  const byId = id => TRACKS.find(t => t.id === id);
  const save = () => store.set("streamify:data:" + user, data);
  const allPlaylists = () => [...PLAYLISTS, ...data.playlists];

  async function hash(s) {
    if (!window.crypto?.subtle) return btoa(s);
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
  }

  function toast(msg) {
    const el = $("toast");
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.hidden = true), 2000);
  }

  let mode = "in";

  function setMode(m) {
    mode = m;
    $("auth-name").hidden = m === "in";
    $("auth-submit").textContent = m === "in" ? "Sign in" : "Create account";
    $("auth-err").textContent = "";
    document.querySelectorAll(".tabs button").forEach(b =>
      b.classList.toggle("on", b.dataset.mode === m)
    );
  }

  document.querySelectorAll(".tabs button").forEach(b =>
    (b.onclick = () => setMode(b.dataset.mode))
  );

  $("auth-form").onsubmit = async e => {
    e.preventDefault();

    const email = $("auth-email").value.trim().toLowerCase();
    const pass = $("auth-pass").value;
    const name = $("auth-name").value.trim();

    const users = store.get("streamify:users", {});
    const fail = m => ($("auth-err").textContent = m);

    if (!/^\S+@\S+\.\S+$/.test(email))
      return fail("Enter a valid email address.");

    if (pass.length < 6)
      return fail("Password must be at least 6 characters.");

    if (mode === "up") {
      if (!name) return fail("Enter your name.");
      if (users[email])
        return fail("An account with this email already exists.");

      users[email] = {
        name,
        hash: await hash(pass)
      };

      store.set("streamify:users", users);
    } else if (!users[email] || users[email].hash !== (await hash(pass))) {
      return fail("Incorrect email or password.");
    }

    $("auth-form").reset();
    login(email);
  };

  $("guest").onclick = () => login("guest");

  $("logout").onclick = () => {
    audio.pause();
    audio.removeAttribute("src");
    audio.dataset.id = "";
    state.index = -1;

    $("np-title").textContent = "Nothing playing";
    $("np-artist").textContent = "Pick a track";

    localStorage.removeItem("streamify:session");

    $("auth").hidden = false;
    setMode("in");
  };

  function login(email) {
    const name = email === "guest"
      ? "Guest"
      : store.get("streamify:users", {})[email].name;

    user = email;

    data = store.get("streamify:data:" + email, {
      likes: [],
      playlists: [],
      recent: []
    });

    store.set("streamify:session", email);

    $("auth").hidden = true;
    $("user-name").textContent = name;
    $("user-avatar").textContent = name[0].toUpperCase();

    const h = new Date().getHours();

    $("greeting").textContent =
      `${h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"}${email === "guest" ? "" : ", " + name}`;

    syncLike();
    go("home");
  }

  function resolve([v, id]) {
    if (v === "liked")
      return ["Liked Songs", data.likes.map(byId)];

    if (v === "recent")
      return ["Recently Played", data.recent.map(byId)];

    if (v === "album")
      return [id, TRACKS.filter(t => t.album === id)];

    if (v === "search")
      return [
        "Results",
        TRACKS.filter(t =>
          [t.title, t.artist, t.album]
            .some(s => s.toLowerCase().includes(id))
        )
      ];

    if (v === "pl") {
      const p = allPlaylists().find(p => p.id === id);

      return p
        ? [p.name, p.ids.map(byId)]
        : ["Tracks", TRACKS];
    }

    return ["Tracks", TRACKS];
  }

  function go(v, id, autoplay = false) {
    state.view = [v, id];

    const [title, list] = resolve(state.view);

    $("tracks-title").textContent = title;
    $("extras").hidden = v !== "home";

    renderTracks(list);
    renderLibrary();

    if (autoplay) play(0);
  }

  function renderLibrary() {
    const rows = [
      {
        v: "liked",
        n: "Liked Songs",
        h: 330,
        cover: null,
        d: `${data.likes.length} songs`
      },

      {
        v: "recent",
        n: "Recently Played",
        h: 200,
        cover: null,
        d: `${data.recent.length} songs`
      },

      ...PLAYLISTS.map(p => ({
        v: "pl",
        id: p.id,
        n: p.name,
        h: p.hue,
        cover: p.cover,
        d: "Playlist"
      })),

      ...data.playlists.map(p => ({
        v: "pl",
        id: p.id,
        n: p.name,
        h: p.hue,
        cover: p.cover,
        d: `By you, ${p.ids.length} songs`
      })),
    ];

    $("playlist-list").innerHTML = rows.map(r => {
      const active =
        state.view[0] === r.v &&
        (r.id === undefined || state.view[1] === r.id);

      return `
        <li class="${active ? "active" : ""}"
            data-v="${r.v}"
            data-id="${esc(r.id ?? "")}">
          ${cover({ hue: r.h, cover: r.cover })}
          <div>
            <strong>${esc(r.n)}</strong>
            <small>${esc(r.d)}</small>
          </div>
        </li>
      `;
    }).join("");
  }

  function renderQuick() {
    $("quick").innerHTML = PLAYLISTS.map(p =>
      `<button data-id="${p.id}">
        ${cover(p)}
        ${p.name}
      </button>`
    ).join("");

    const albums = [
      ...new Map(TRACKS.map(t => [t.album, t])).values()
    ];

    $("cards").innerHTML = albums.map(t =>
      `<button class="card" data-album="${t.album}">
        ${cover(t)}
        <strong>${t.album}</strong>
        <span>${t.artist}</span>
      </button>`
    ).join("");
  }

  function renderTracks(list) {
    state.list = list;

    const own =
      state.view[0] === "pl" &&
      data.playlists.some(p => p.id === state.view[1]);

    $("tracks").innerHTML = list.length
      ? list.map((t, i) => `
        <li data-i="${i}" class="${audio.dataset.id == t.id ? "playing" : ""}">
          <span>${i + 1}</span>

          <div class="t-info">
            ${cover(t)}

            <div>
              <div class="t-title">${t.title}</div>
              <small>${t.artist}</small>
            </div>
          </div>

          <button
            class="row-btn ${data.likes.includes(t.id) ? "on" : ""}"
            data-act="like"
            title="Like">
            ${data.likes.includes(t.id) ? "♥" : "♡"}
          </button>

          <button
            class="row-btn"
            data-act="${own ? "rm" : "add"}"
            title="${own ? "Remove from playlist" : "Add to playlist"}">
            ${own ? "−" : "+"}
          </button>
        </li>
      `).join("")
      : `<p class="empty">Nothing here yet. Like a song or add one to a playlist.</p>`;
  }

  function syncLike() {
    const on = data?.likes.includes(+audio.dataset.id);

    $("np-like").classList.toggle("on", !!on);
    $("np-like").textContent = on ? "♥" : "♡";
  }

  function toggleLike(id) {
    const i = data.likes.indexOf(id);

    i < 0
      ? data.likes.unshift(id)
      : data.likes.splice(i, 1);

    save();
    syncLike();
    go(...state.view);

    toast(
      i < 0
        ? "Added to Liked Songs"
        : "Removed from Liked Songs"
    );
  }

  function createPlaylist(firstTrack) {
    const name = (prompt("Playlist name") || "").trim();

    if (!name) return;

    const input = $("playlist-cover-input");

    input.value = "";

    input.onchange = () => {
      const file = input.files[0];

      if (!file) {
        finishPlaylist(name, firstTrack, null);
        return;
      }

      if (!file.type.startsWith("image/")) {
        toast("Please choose an image");
        return;
      }

      const reader = new FileReader();

      reader.onload = () => {
        finishPlaylist(name, firstTrack, reader.result);
      };

      reader.readAsDataURL(file);
    };

    input.click();
  }

  function finishPlaylist(name, firstTrack, coverImage) {
    const p = {
      id: "u" + Date.now(),
      name,
      hue: Math.floor(Math.random() * 360),
      cover: coverImage,
      ids: firstTrack ? [firstTrack] : []
    };

    data.playlists.push(p);

    save();
    renderLibrary();

    toast(`Created "${name}"`);
  }

  function openMenu(e, track) {
    document.querySelector(".menu")?.remove();

    const m = document.createElement("div");

    m.className = "menu";

    m.innerHTML =
      data.playlists.map(p =>
        `<button data-p="${p.id}">${esc(p.name)}</button>`
      ).join("") +
      (data.playlists.length ? "<hr>" : "") +
      `<button data-p="new">New playlist</button>`;

    m.style.left =
      Math.min(e.clientX, innerWidth - 210) + "px";

    m.style.top =
      Math.min(
        e.clientY,
        innerHeight - 40 * (data.playlists.length + 2)
      ) + "px";

    m.onclick = ev => {
      const id = ev.target.dataset.p;

      if (!id) return;

      if (id === "new") {
        createPlaylist(track.id);
      } else {
        const p = data.playlists.find(p => p.id === id);

        if (p.ids.includes(track.id)) {
          toast("Already in this playlist");
        } else {
          p.ids.push(track.id);
          save();
          renderLibrary();
          toast(`Added to ${p.name}`);
        }
      }

      m.remove();
    };

    document.body.appendChild(m);

    setTimeout(() =>
      document.addEventListener(
        "click",
        () => m.remove(),
        { once: true }
      )
    );
  }

  function play(i) {
    const t = state.list[i];

    if (!t) return;

    state.index = i;

    audio.src = t.src;
    audio.dataset.id = t.id;

    audio.play().catch(() => {});

    $("np-title").textContent = t.title;
    $("np-artist").textContent = t.artist;

    if (t.cover) {
      $("np-cover").style.backgroundImage = `url('${t.cover}')`;
      $("np-cover").style.backgroundSize = "cover";
      $("np-cover").style.backgroundPosition = "center";
    } else {
      $("np-cover").style.backgroundImage = gradient(t.hue);
      $("np-cover").style.backgroundSize = "";
      $("np-cover").style.backgroundPosition = "";
    }

    document.title = `${t.title} - Streamify`;

    data.recent = [
      t.id,
      ...data.recent.filter(x => x !== t.id)
    ].slice(0, 20);

    save();
    syncLike();
    renderLibrary();
    renderTracks(state.list);

    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: t.title,
        artist: t.artist,
        album: t.album
      });
    }
  }

  function step(dir) {
    if (!state.list.length) return;

    const i = state.shuffle
      ? Math.floor(Math.random() * state.list.length)
      : state.index + dir;

    play((i + state.list.length) % state.list.length);
  }

  const toggle = () =>
    state.index < 0
      ? play(0)
      : audio.paused
        ? audio.play()
        : audio.pause();

  const prev = () =>
    audio.currentTime > 3
      ? (audio.currentTime = 0)
      : step(-1);

  $("play").onclick = toggle;
  $("next").onclick = () => step(1);
  $("prev").onclick = prev;

  $("shuffle").onclick = e =>
    e.currentTarget.classList.toggle(
      "on",
      (state.shuffle = !state.shuffle)
    );

  $("repeat").onclick = e =>
    e.currentTarget.classList.toggle(
      "on",
      (state.repeat = !state.repeat)
    );

  $("np-like").onclick = () =>
    audio.dataset.id &&
    toggleLike(+audio.dataset.id);

  $("new-pl").onclick = () => createPlaylist();

  $("seek").oninput = e =>
    (audio.currentTime =
      (e.target.value / 100) * audio.duration || 0);

  $("vol").oninput = e => {
    audio.volume = e.target.value;
    audio.muted = false;

    store.set("streamify:vol", audio.volume);

    $("mute").textContent =
      audio.volume ? "🔊" : "🔇";
  };

  $("mute").onclick = () => {
    audio.muted = !audio.muted;
    $("mute").textContent =
      audio.muted ? "🔇" : "🔊";
  };

  audio.onplay = () =>
    ($("play").textContent = "⏸");

  audio.onpause = () =>
    ($("play").textContent = "▶");

  audio.onloadedmetadata = () =>
    ($("dur").textContent = fmt(audio.duration));

  audio.ontimeupdate = () => {
    $("cur").textContent = fmt(audio.currentTime);

    $("seek").value = audio.duration
      ? (audio.currentTime / audio.duration) * 100
      : 0;
  };

  audio.onended = () =>
    (state.repeat
      ? play(state.index)
      : step(1));

  $("tracks").onclick = e => {
    const li = e.target.closest("li[data-i]");

    if (!li) return;

    const i = +li.dataset.i;
    const t = state.list[i];
    const act =
      e.target.closest("[data-act]")?.dataset.act;

    if (act === "like")
      return toggleLike(t.id);

    if (act === "add")
      return openMenu(e, t);

    if (act === "rm") {
      const p =
        data.playlists.find(
          p => p.id === state.view[1]
        );

      p.ids =
        p.ids.filter(x => x !== t.id);

      save();

      return go(...state.view);
    }

    play(i);
  };

  $("playlist-list").onclick = e => {
    const li = e.target.closest("li");

    if (li)
      go(li.dataset.v, li.dataset.id);
  };

  $("quick").onclick = e => {
    const b = e.target.closest("[data-id]");

    if (b)
      go("pl", b.dataset.id, true);
  };

  $("cards").onclick = e => {
    const b = e.target.closest("[data-album]");

    if (b)
      go("album", b.dataset.album, true);
  };

  $("search").oninput = e => {
    const q =
      e.target.value.trim().toLowerCase();

    q
      ? go("search", q)
      : go("home");
  };

  document.querySelectorAll(".nav-item").forEach(b =>
    (b.onclick = () => {
      document.querySelectorAll(".nav-item")
        .forEach(n =>
          n.classList.toggle("active", n === b)
        );

      if (b.dataset.view === "search") {
        $("search").focus();
      } else {
        $("search").value = "";
        go("home");
      }
    })
  );

  document.addEventListener("keydown", e => {
    if (["INPUT", "TEXTAREA"].includes(e.target.tagName))
      return;

    const k = e.key.toLowerCase();

    if (e.code === "Space") {
      e.preventDefault();
      toggle();
    } else if (k === "arrowright") {
      e.shiftKey
        ? step(1)
        : (audio.currentTime += 5);
    } else if (k === "arrowleft") {
      e.shiftKey
        ? prev()
        : (audio.currentTime -= 5);
    } else if (k === "m") {
      $("mute").click();
    } else if (
      k === "l" &&
      audio.dataset.id
    ) {
      toggleLike(+audio.dataset.id);
    }
  });

  if ("mediaSession" in navigator) {
    const ms = navigator.mediaSession;

    ms.setActionHandler("play", toggle);
    ms.setActionHandler("pause", toggle);
    ms.setActionHandler("nexttrack", () => step(1));
    ms.setActionHandler("previoustrack", prev);
  }

  audio.volume = store.get("streamify:vol", 0.7);
  $("vol").value = audio.volume;

  renderQuick();

  const session =
    store.get("streamify:session", null);

  const known =
    session === "guest" ||
    (session &&
      store.get("streamify:users", {})[session]);

  known
    ? login(session)
    : ($("auth").hidden = false);
})();