// Shared D3 world map renderer
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

  // Single group that zoom transforms are applied to
  const mapG = svg.append('g').attr('class', 'map-g');

  // D3 zoom
  const zoomBehavior = d3.zoom()
    .scaleExtent([0.5, 12])
    .on('zoom', event => {
      mapG.attr('transform', event.transform);
    });

  svg.call(zoomBehavior).on('dblclick.zoom', null);

  // Zoom buttons
  const zoomWrap = document.createElement('div');
  zoomWrap.className = 'map-zoom-wrap';
  zoomWrap.innerHTML =
    '<button class="map-zoom-btn" id="zoom-in-' + svgId + '">+</button>' +
    '<button class="map-zoom-btn" id="zoom-out-' + svgId + '">−</button>';
  container.appendChild(zoomWrap);

  document.getElementById('zoom-in-' + svgId).addEventListener('click', () => {
    svg.transition().duration(300).call(zoomBehavior.scaleBy, 1.5);
  });
  document.getElementById('zoom-out-' + svgId).addEventListener('click', () => {
    svg.transition().duration(300).call(zoomBehavior.scaleBy, 0.67);
  });

  const worldUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

  let pinsGroup = null;
  let pendingPins = null;
  let pendingLocationKey = locationKey;
  let currentTransform = d3.zoomIdentity;

  zoomBehavior.on('zoom.track', event => { currentTransform = event.transform; });

  d3.json(worldUrl).then(world => {
    const countries = topojson.feature(world, world.objects.countries);

    mapG.append('g').attr('class', 'countries')
      .selectAll('path')
      .data(countries.features)
      .enter()
      .append('path')
      .attr('d', pathGen);

    pinsGroup = mapG.append('g').attr('class', 'pins');

    if (mode === 'view') {
      const initialPins = pendingPins !== null ? pendingPins : pins;
      const initialKey  = pendingPins !== null ? pendingLocationKey : locationKey;
      renderViewPins(svg, pinsGroup, projection, initialPins, container, onPinClick, initialKey, () => currentTransform);
      pendingPins = null;
    } else if (mode === 'select') {
      renderSelectMode(svg, mapG, pinsGroup, projection, onLocationSelected);
    }
  }).catch(err => {
    console.error('Failed to load world map data:', err);
  });

  function updatePins(newPins, newLocKey) {
    const key = newLocKey || locationKey;
    if (!pinsGroup) {
      pendingPins = newPins;
      pendingLocationKey = key;
      return;
    }
    pinsGroup.selectAll('*').remove();
    const popup = document.getElementById('map-popup');
    if (popup) popup.classList.remove('visible');
    renderViewPins(svg, pinsGroup, projection, newPins, container, onPinClick, key, () => currentTransform);
  }

  return { svg, projection, updatePins };
}

function renderViewPins(svg, pinsGroup, projection, pins, container, onPinClick, locationKey, getTransform) {
  const popup = document.getElementById('map-popup');

  pins.forEach((pin, i) => {
    const loc = (locationKey && pin[locationKey]) || pin.madeIn || pin.residesIn;
    if (!loc || loc.lat == null || loc.lng == null) return;

    const [px, py] = projection([loc.lng, loc.lat]);

    const g = pinsGroup.append('g')
      .attr('class', 'map-pin-group')
      .attr('data-idx', i);

    // Small solid circle pin
    g.append('circle')
      .attr('class', 'pin-body')
      .attr('cx', px)
      .attr('cy', py)
      .attr('r', 4);

    g.on('click', function(event) {
      event.stopPropagation();
      pinsGroup.selectAll('.map-pin-group').classed('dimmed', true);
      d3.select(this).classed('dimmed', false);

      if (popup) {
        popup.innerHTML = '';
        const imgSrc = pin.imageUrl || pin.imageData;
        if (imgSrc) {
          const img = document.createElement('img');
          img.src = imgSrc;
          popup.appendChild(img);
        } else {
          popup.textContent = loc.label || 'No image';
          popup.style.padding = '8px';
          popup.style.fontSize = '0.7rem';
        }
        popup.classList.add('visible');

        // Account for zoom transform when positioning popup
        const t = getTransform ? getTransform() : d3.zoomIdentity;
        const svgEl = svg.node();
        const pt = svgEl.createSVGPoint();
        pt.x = t.applyX(px);
        pt.y = t.applyY(py);
        const screenPt = pt.matrixTransform(svgEl.getScreenCTM());
        const rect = container.getBoundingClientRect();
        let left = screenPt.x - rect.left + 14;
        let top  = screenPt.y - rect.top  - 90;
        if (left + 140 > rect.width)  left = screenPt.x - rect.left - 150;
        if (top < 0) top = screenPt.y - rect.top + 20;
        popup.style.left = left + 'px';
        popup.style.top  = top  + 'px';
      }

      if (onPinClick) onPinClick(pin, px, py);
    });
  });

  svg.on('click', () => {
    pinsGroup.selectAll('.map-pin-group').classed('dimmed', false);
    if (popup) popup.classList.remove('visible');
  });
}

function renderSelectMode(svg, mapG, pinsGroup, projection, onLocationSelected) {
  svg.style('cursor', 'crosshair');

  mapG.on('click', function(event) {
    const [mx, my] = d3.pointer(event);
    const coords = projection.invert([mx, my]);
    if (!coords || isNaN(coords[0]) || isNaN(coords[1])) return;

    pinsGroup.selectAll('*').remove();
    pinsGroup.append('circle')
      .attr('class', 'modal-pin')
      .attr('cx', mx)
      .attr('cy', my)
      .attr('r', 4);

    if (onLocationSelected) onLocationSelected(coords[1], coords[0], mx, my);
  });
}
