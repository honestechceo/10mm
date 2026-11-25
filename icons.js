// Drawn icons in the game's cartoon style (thick dark outline, bright fill), used instead of emoji
// so buttons look the same on every phone. GICON.name(size) returns an inline SVG string.
(() => {
  const O = 'stroke="#0b1118" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"';
  const svg = (body, s) => '<svg class="gico" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" aria-hidden="true">' + body + "</svg>";
  const P = {
    close: '<path d="M6 6l12 12M18 6L6 18" ' + O.replace("2.6", "5.5") + ' fill="none"/><path d="M6 6l12 12M18 6L6 18" stroke="#fff" stroke-width="2.6" stroke-linecap="round" fill="none"/>',
    undo: '<path d="M9 5L3.5 10 9 15" ' + O.replace("2.6", "5.5") + ' fill="none"/><path d="M4 10h9a6 6 0 010 12h-3" ' + O.replace("2.6", "5.5") + ' fill="none"/><path d="M9 5L3.5 10 9 15M4 10h9a6 6 0 010 12h-3" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
    zoom: '<circle cx="10" cy="10" r="6.5" fill="#8fe3ff" ' + O + '/><circle cx="8" cy="8" r="2" fill="#fff" opacity=".8"/><path d="M15 15l6 6" ' + O.replace("2.6", "6") + '/><path d="M15 15l6 6" stroke="#ffd23f" stroke-width="3" stroke-linecap="round"/>',
    gear: '<path d="M12 1.8l2 .3.6 2.6 1.6.9 2.5-.9 1.4 1.4-.9 2.5.9 1.6 2.6.6.3 2-.3 2-2.6.6-.9 1.6.9 2.5-1.4 1.4-2.5-.9-1.6.9-.6 2.6-2 .3-2-.3-.6-2.6-1.6-.9-2.5.9-1.4-1.4.9-2.5-.9-1.6-2.6-.6-.3-2 .3-2 2.6-.6.9-1.6-.9-2.5 1.4-1.4 2.5.9 1.6-.9.6-2.6z" fill="#c9d3dd" ' + O + '/><circle cx="12" cy="12" r="3.6" fill="#26364a" ' + O + "/>",
    pencil: '<path d="M4 20l1.2-4.6L16 4.6a2 2 0 012.8 0l.6.6a2 2 0 010 2.8L8.6 18.8z" fill="#ffd23f" ' + O + '/><path d="M14.2 6.4l3.4 3.4" ' + O + '/><path d="M4 20l1.2-4.6 3.4 3.4z" fill="#f3c6a0" ' + O + "/>",
    play: '<path d="M7 4.5v15l12-7.5z" fill="#fff" ' + O + "/>",
    erase: '<path d="M8 5h12v14H8l-5-7z" fill="#ff8a7a" ' + O + '/><path d="M11 9l5 6M16 9l-5 6" stroke="#0b1118" stroke-width="2.4" stroke-linecap="round"/>',
    radio: '<rect x="2.5" y="8" width="19" height="13" rx="3" fill="#ff5a46" ' + O + '/><circle cx="8.5" cy="14.5" r="3.2" fill="#26364a" ' + O + '/><path d="M14 12.5h5M14 16.5h5" stroke="#0b1118" stroke-width="2.2" stroke-linecap="round"/><path d="M6 8L17 3" ' + O + "/>",
    music: '<path d="M9 18V5.5l10-2.5v12.5" fill="none" ' + O + '/><circle cx="6.5" cy="18" r="3" fill="#ffd23f" ' + O + '/><circle cx="16.5" cy="15.5" r="3" fill="#ffd23f" ' + O + "/>",
    phones: '<path d="M4 15v-3a8 8 0 0116 0v3" fill="none" ' + O.replace("2.6", "5") + '/><path d="M4 15v-3a8 8 0 0116 0v3" fill="none" stroke="#c9d3dd" stroke-width="2.2"/><rect x="2.5" y="13" width="5" height="8" rx="2" fill="#8fe3ff" ' + O + '/><rect x="16.5" y="13" width="5" height="8" rx="2" fill="#8fe3ff" ' + O + "/>",
    off: '<circle cx="12" cy="12" r="8.5" fill="#26364a" ' + O + '/><path d="M6.5 17.5l11-11" stroke="#ff8a7a" stroke-width="3" stroke-linecap="round"/>',
    hand: '<path d="M8 13V5.5a1.5 1.5 0 013 0V11V4a1.5 1.5 0 013 0v7V5a1.5 1.5 0 013 0v8.5a7 7 0 01-7 7h-.5a6 6 0 01-5-2.7L3 14a1.5 1.5 0 012.3-1.9L8 15z" fill="#ffd23f" ' + O + "/>",
  };
  window.GICON = {};
  for (const k in P) window.GICON[k] = (s) => svg(P[k], s || 22);
  // home screen radio button
  document.addEventListener("DOMContentLoaded", () => { const i = document.querySelector("#hRadio i"); if (i) i.innerHTML = window.GICON.radio(26); });
})();
