// Trophy cabinet: every achievement as a gold medallion (locked ones show progress).
// Uses the same rules Game Center uses, so the cabinet and Game Center always agree.
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const J = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || "") ?? d; } catch (e) { return d; } };
  const STAR = '<svg viewBox="0 0 24 24"><polygon points="12,1.5 15,8.6 22.7,9.3 16.9,14.4 18.6,22 12,18 5.4,22 7.1,14.4 1.3,9.3 9,8.6" fill="currentColor"/></svg>';
  const GLYPH = {
    first_escape: "1", level_25: "25", level_100: "100", level_200: "200", stars_100: STAR, endless_1000: "1K",
    bonus_5: "5", boss_1: "B", daily_first: "D", daily_streak_7: "7",
    lt_first_drawer: "1", lt_drawers_25: "25", lt_drawers_50: "50", lt_golden: "G", lt_hideout_1: "H", lt_hideouts_all: "HH",
    lt_stars_50: STAR, lt_stars_250: STAR, lt_secret_room: "?", lt_mech: "M", lt_maker: "LM", lt_friend: "FR",
  };
  const ART = {first_escape: "medal-01.webp", level_25: "medal-02.webp", level_100: "medal-03.webp", level_200: "medal-04.webp", stars_100: "medal-05.webp", endless_1000: "medal-06.webp", bonus_5: "medal-07.webp", boss_1: "medal-08.webp", daily_first: "medal-09.webp", daily_streak_7: "medal-10.webp", lt_first_drawer: "medal-11.webp", lt_drawers_25: "medal-12.webp", lt_drawers_50: "medal-13.webp", lt_golden: "medal-14.webp", lt_hideout_1: "medal-15.webp", lt_hideouts_all: "medal-16.webp", lt_stars_50: "medal-17.webp", lt_stars_250: "medal-18.webp", lt_secret_room: "medal-19.webp", lt_mech: "medal-20.webp", lt_maker: "medal-21.webp", lt_friend: "medal-22.webp"};
  function adventure() {
    const b = typeof best === "number" ? best : 1, lv = b - 1;
    const F = window.Feature;
    const stars = F ? F.starsTotal() : 0, eb = F ? F.endlessBest() : 0;
    const bonus = J("tenmm-bonus-done", []).length, boss = J("tenmm-boss", []).length, d = J("tenmm-daily", {}) || {};
    return [
      ["first_escape", "First Escape", "Beat level 1", lv, 1],
      ["level_25", "Getting Loose", "Beat level 25", lv, 25],
      ["level_100", "Halfway Out", "Beat level 100", lv, 100],
      ["level_200", "Great Escape", "Reach level 200", b, 200],
      ["stars_100", "Star Power", "Earn 100 level stars", stars, 100],
      ["endless_1000", "Long Haul", "Roll 1000 m in Endless", eb, 1000],
      ["bonus_5", "Sharp Eye", "Win 5 bonus rounds", bonus, 5],
      ["boss_1", "Boss Down", "Beat a boss level", boss, 1],
      ["daily_first", "Daily Driver", "Finish a daily challenge", d.streak ? 1 : 0, 1],
      ["daily_streak_7", "Full Week", "7-day daily streak", d.streak || 0, 7],
    ].map(([id, name, desc, have, need]) => ({ id, name, desc, have: Math.max(0, Math.min(have, need)), need, got: have >= need }));
  }
  function all() {
    const sent = J("tenmm-gc-ach", []) || [];
    const fix = (a) => { if (sent.includes(a.id) && !a.got) { a.got = true; a.have = a.need; } return a; };
    let lt = []; try { lt = window.LostBox && LostBox.achList ? LostBox.achList() : []; } catch (e) {}
    return { adv: adventure().map(fix), lt: lt.map(fix) };
  }
  let root, sel = null;
  function build() {
    if (root) return;
    root = document.createElement("div");
    root.id = "trophy"; root.className = "hidden";
    root.innerHTML = '<div class="tch"><b>TROPHY CABINET</b><small id="tCount"></small><div class="tcount"><i id="tBar"></i></div></div>' +
      '<div class="tplaque" id="tPlaque"></div><div class="tcab" id="tCab"></div><button class="tback" id="tBack">BACK</button>';
    document.body.append(root);
    $("tBack").onclick = close;
  }
  function plaque(a) {
    $("tPlaque").innerHTML = a
      ? "<b>" + a.name.toUpperCase() + (a.got ? " - EARNED" : "") + "</b><span>" + a.desc + (a.got ? "" : " (" + a.have + " / " + a.need + ")") + "</span>"
      : "<b>TAP A MEDAL</b><span>Earn medals in the adventure and the Lost Toolbox</span>";
  }
  function render() {
    const { adv, lt } = all(), list = adv.concat(lt), got = list.filter((a) => a.got).length;
    $("tCount").textContent = got + " OF " + list.length + " EARNED";
    $("tBar").style.width = Math.round((100 * got) / list.length) + "%";
    const cab = $("tCab"); cab.innerHTML = "";
    const section = (title, items) => {
      const h = document.createElement("div"); h.className = "tsec"; h.textContent = title; cab.append(h);
      for (let i = 0; i < items.length; i += 3) {
        const shelf = document.createElement("div"); shelf.className = "tshelf";
        for (const a of items.slice(i, i + 3)) {
          const m = document.createElement("button");
          m.className = "tm" + (a.got ? "" : " lock") + (sel === a.id ? " sel" : "");
          m.innerHTML = '<div class="md' + (ART[a.id] ? " art" : "") + '">' + (a.got ? "" : '<i class="pr" style="--p:' + Math.round((100 * a.have) / a.need) + '%"></i>') + (ART[a.id] ? '<img src="' + ART[a.id] + '" alt="">' : GLYPH[a.id] || "") + "</div><span>" + a.name + "</span>";
          m.onclick = () => { sel = a.id; try { window.buzz && buzz("light"); } catch (e) {} plaque(a); cab.querySelectorAll(".tm.sel").forEach((x) => x.classList.remove("sel")); m.classList.add("sel"); };
          shelf.append(m);
        }
        cab.append(shelf);
      }
    };
    section("THE GREAT ESCAPE", adv);
    if (lt.length) section("THE LOST TOOLBOX", lt);
    plaque(list.find((a) => a.id === sel));
  }
  function open() { build(); sel = null; render(); root.classList.remove("hidden"); try { window.sfx && sfx("grab"); } catch (e) {} }
  function close() { if (root) root.classList.add("hidden"); }
  function hook() { const b = $("hTrophy"); if (b) b.onclick = open; }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", hook); else hook();
  window.Trophies = { open, close, all };
})();
