// Deterministic band colors shared by fixture pages and tests.
// Channels stay within 20..219 so they never collide with the marker colors
// (magenta header, cyan footer, yellow sticky sections) used by fixtures.
window.bandColor = function (i) {
  return 'rgb(' + (((i * 37) % 200) + 20) + ',' + (((i * 61) % 200) + 20) + ',' + (((i * 23) % 200) + 20) + ')';
};
window.renderBands = function (container, count, height, start) {
  start = start || 0;
  for (var i = start; i < start + count; i++) {
    var d = document.createElement('div');
    d.className = 'band';
    d.style.height = height + 'px';
    d.style.background = window.bandColor(i);
    d.textContent = 'Band ' + i;
    container.appendChild(d);
  }
};
