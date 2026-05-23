// Shared D3 world map renderer
// mode: 'view' (shows clickable pins with popups) | 'select' (click to place pin)
function initWorldMap(svgId, options) {
  const {
    mode = 'view',
    pins = [],
    locationKey = 'madeIn',
    onPinClick,
    onLocationSelected,
  } = options;

  const svgEl = document.getElementById(svgId);
  if (!svgEl) return;

  const container = svgEl.parentElement;
  const W = container.offsetWidth;
  const H = container.offsetHeight;

  const svg = d3.select('#' + svgId)
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  const projection = d3.geoNaturalEarth1()
    .scale(W / 6.3)
    .translate([W / 2, H / 2]);

  const pathGen = d3.geoPath().projection(projection);

  const worldUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

  d3.json(worldUrl).then(world => {
    const countries = topojson.feature(world, world.objects.countries);

    svg.append('g').attr('class', 'countries')
      .selectAll('path')
      .data(countries.features)
      .enter()
      .append('path')
      .attr('d', pathGen);

    const pinsGroup = svg.append('g').attr('class', 'pins');

    if (mode === 'view') {
      renderViewPins(svg, pinsGroup, projection, pins, container, onPinClick, options.locationKey);
    } else if (mode === 'select') {
      renderSelectMode(svg, pinsGroup, projection, onLocationSelected);
    }
  }).catch(err => {
    console.error('Failed to load world map data:', err);
  });

  return { svg, projection };
}

function pinPath(x, y, scale) {
  scale = scale || 1;
  const s = scale;
  return `M${x},${y + 14 * s} C${x - 5 * s},${y + 6 * s} ${x - 10 * s},${y - 2 * s} ${x - 10 * s},${y - 8 * s} A${10 * s},${10 * s} 0 1 1 ${x + 10 * s},${y - 8 * s} C${x + 10 * s},${y - 2 * s} ${x + 5 * s},${y + 6 * s} ${x},${y + 14 * s} Z`;
}

function renderViewPins(svg, pinsGroup, projection, pins, container, onPinClick, locationKey) {
  const popup = document.getElementById('map-popup');

  pins.forEach((pin, i) => {
    const loc = (locationKey && pin[locationKey]) || pin.madeIn || pin.residesIn;
    if (!loc || loc.lat == null || loc.lng == null) return;

    const [px, py] = projection([loc.lng, loc.lat]);

    const g = pinsGroup.append('g')
      .attr('class', 'map-pin-group')
      .attr('data-idx', i);

    g.append('path')
      .attr('class', 'pin-body')
      .attr('d', pinPath(px, py, 0.9));

    g.append('circle')
      .attr('class', 'pin-hole')
      .attr('cx', px)
      .attr('cy', py - 8)
      .attr('r', 3.5);

    g.on('click', function(event) {
      event.stopPropagation();
      const allPins = pinsGroup.selectAll('.map-pin-group');
      allPins.classed('dimmed', true);
      d3.select(this).classed('dimmed', false);

      if (popup) {
        popup.innerHTML = '';
        if (pin.imageData) {
          const img = document.createElement('img');
          img.src = pin.imageData;
          popup.appendChild(img);
        } else {
          popup.textContent = loc.label || 'No image';
          popup.style.padding = '8px';
          popup.style.fontSize = '0.7rem';
        }
        popup.classList.add('visible');

        const svgEl = svg.node();
        const pt = svgEl.createSVGPoint();
        pt.x = px; pt.y = py;
        const screenPt = pt.matrixTransform(svgEl.getScreenCTM());
        const containerRect = container.getBoundingClientRect();
        let left = screenPt.x - containerRect.left + 14;
        let top = screenPt.y - containerRect.top - 90;
        if (left + 140 > containerRect.width) left = screenPt.x - containerRect.left - 150;
        if (top < 0) top = screenPt.y - containerRect.top + 20;
        popup.style.left = left + 'px';
        popup.style.top = top + 'px';
      }

      if (onPinClick) onPinClick(pin, px, py);
    });
  });

  svg.on('click', () => {
    pinsGroup.selectAll('.map-pin-group').classed('dimmed', false);
    if (popup) popup.classList.remove('visible');
  });
}

function renderSelectMode(svg, pinsGroup, projection, onLocationSelected) {
  let selectedPin = null;

  svg.style('cursor', 'crosshair');

  svg.on('click', function(event) {
    const [mx, my] = d3.pointer(event);
    const coords = projection.invert([mx, my]);
    if (!coords || isNaN(coords[0]) || isNaN(coords[1])) return;

    const lng = coords[0];
    const lat = coords[1];

    pinsGroup.selectAll('*').remove();

    const g = pinsGroup.append('g').attr('class', 'selected-pin');
    g.append('path')
      .attr('class', 'modal-pin')
      .attr('d', pinPath(mx, my, 0.9));
    g.append('circle')
      .attr('class', 'modal-pin-hole')
      .attr('cx', mx)
      .attr('cy', my - 8)
      .attr('r', 3.5);

    if (onLocationSelected) onLocationSelected(lat, lng, mx, my);
  });
}
