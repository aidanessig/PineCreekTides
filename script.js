// map for station ids
const stationMap = {
  southport: '8467726',
  norwalk: '8468448',
  portjefferson: '8514560'
};

// update today's tides title with today's date
function updateTodayTidesTitle() {
  const today = new Date();
  const options = { month: 'long', day: 'numeric', year: 'numeric' };
  const todayString = today.toLocaleDateString('en-US', options);

  const titleSpan = document.getElementById('today-tides-title');
  titleSpan.textContent = `Today's Tides (${todayString})`;
}

// call updateTodayTidesTitle immediately
updateTodayTidesTitle();

// helper to format the time (e.g., "2025-04-27 03:24" → "3:24 am")
function formatTime(datetimeString) {
  const [datePart, timePart] = datetimeString.split(' ');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  const localDate = new Date(year, month - 1, day, hour, minute);

  let hours = localDate.getHours();
  const minutes = localDate.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12 || 12;
  return `${hours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

// helper to format dates nicely (e.g., "2025-04-27" → "sun, apr 27")
function formatDateNice(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  const localDate = new Date(year, month - 1, day);
  const options = { weekday: 'short', month: 'short', day: 'numeric' };
  return localDate.toLocaleDateString(undefined, options);
}

// fetch today's tide data
async function fetchTodayTides(selectedLocation) {
  const stationId = stationMap[selectedLocation];
  if (!stationId) return;

  const today = new Date();

  // get est time manually
  const estOffsetMs = today.getTimezoneOffset() * 60 * 1000; // browser local offset
  const estDate = new Date(today.getTime() - estOffsetMs);
  
  // build yyyyMMdd
  const yyyy = estDate.getFullYear();
  const mm = (estDate.getMonth() + 1).toString().padStart(2, '0');
  const dd = estDate.getDate().toString().padStart(2, '0');
  
  const todayString = `${yyyy}${mm}${dd}`;
  
  const url = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=predictions&application=web&format=json&units=english&station=${stationId}&time_zone=lst_ldt&datum=MLLW&interval=hilo&begin_date=${todayString}&end_date=${todayString}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    const tides = data.predictions || [];

    const todayTidesTable = document.querySelector('#today-tides-table tbody');
    todayTidesTable.innerHTML = '';

    tides.forEach(tide => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${tide.type === 'H' ? 'High ⬆️' : 'Low ⬇️'}</td>
        <td>${formatTime(tide.t)}</td>
        <td>${parseFloat(tide.v).toFixed(2)} ft</td>
      `;
      todayTidesTable.appendChild(row);
    });

    if (tides.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = `<td colspan="3">No tide data available for today.</td>`;
      todayTidesTable.appendChild(row);
    }
  } catch (error) {
    console.error('error fetching today tides:', error);
  }
}

// fetch future 30-day tide data
async function fetchFutureTides(selectedLocation) {
  const stationId = stationMap[selectedLocation];
  if (!stationId) return;

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const beginDate = `${year}${month}${day}`;
  
  const endDateObj = new Date(now);
  endDateObj.setDate(now.getDate() + 30);
  const endYear = endDateObj.getFullYear();
  const endMonth = String(endDateObj.getMonth() + 1).padStart(2, '0');
  const endDay = String(endDateObj.getDate()).padStart(2, '0');
  const endDate = `${endYear}${endMonth}${endDay}`;

  const url = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=predictions&application=web&format=json&units=english&station=${stationId}&time_zone=lst_ldt&datum=MLLW&interval=hilo&begin_date=${beginDate}&end_date=${endDate}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    const tides = data.predictions || [];

    const futureTidesTable = document.querySelector('#future-tides-table tbody');
    futureTidesTable.innerHTML = '';

    const tidesByDay = {};
    tides.forEach(tide => {
      const date = tide.t.split(' ')[0];
      if (!tidesByDay[date]) tidesByDay[date] = [];
      tidesByDay[date].push(tide);
    });

    Object.keys(tidesByDay).forEach(date => {
      const dailyTides = tidesByDay[date];
      const row = document.createElement('tr');

      const highs = dailyTides.filter(t => t.type === 'H');
      const lows = dailyTides.filter(t => t.type === 'L');

      row.innerHTML = `
        <td>${formatDateNice(date)}</td>
        <td>${highs[0] ? `${formatTime(highs[0].t)}<br>${parseFloat(highs[0].v).toFixed(2)} ft` : '—'}</td>
        <td>${highs[1] ? `${formatTime(highs[1].t)}<br>${parseFloat(highs[1].v).toFixed(2)} ft` : '—'}</td>
        <td>${lows[0] ? `${formatTime(lows[0].t)}<br>${parseFloat(lows[0].v).toFixed(2)} ft` : '—'}</td>
        <td>${lows[1] ? `${formatTime(lows[1].t)}<br>${parseFloat(lows[1].v).toFixed(2)} ft` : '—'}</td>
      `;
      futureTidesTable.appendChild(row);
    });

    if (Object.keys(tidesByDay).length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = `<td colspan="5">No tide data available for the next 30 days.</td>`;
      futureTidesTable.appendChild(row);
    }
  } catch (error) {
    console.error('error fetching future tides:', error);
  }
}

// fetch live conditions
async function fetchConditions() {
  const conditionsContent = document.getElementById('conditions-content');

  try {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayString = `${yyyy}${mm}${dd}`;

    const [airTempRes, windRes, waterTempRes, tidesRes] = await Promise.all([
      fetch('https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?station=8467150&product=air_temperature&units=english&time_zone=lst_ldt&format=json&date=latest'),
      fetch('https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?station=8467150&product=wind&units=english&time_zone=lst_ldt&format=json&date=latest'),
      fetch('https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?station=8465705&product=water_temperature&units=english&time_zone=lst_ldt&format=json&date=latest'),
      fetch(`https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=predictions&application=web&format=json&units=english&station=8467726&time_zone=lst_ldt&datum=MLLW&interval=hilo&begin_date=${todayString}&end_date=${todayString}`)
    ]);

    const airTempData = await airTempRes.json();
    const windData = await windRes.json();
    const waterTempData = await waterTempRes.json();
    const tideDataToday = await tidesRes.json();

    const airTemp = airTempData.data?.[0]?.v ?? 'N/A';
    const windSpeed = windData.data?.[0]?.s ?? 'N/A';
    const windGust = windData.data?.[0]?.g ?? 'N/A';
    const windDir = windData.data?.[0]?.dr ?? 'N/A';
    const waterTemp = waterTempData.data?.[0]?.v ?? 'N/A';
    const lastUpdated = windData.data?.[0]?.t ?? airTempData.data?.[0]?.t ?? waterTempData.data?.[0]?.t ?? '';

    let nextTideHtml = `<strong>Next Tide:</strong> N/A`;

    const now = new Date();
    let nextTide = null;

    if (tideDataToday.predictions?.length) {
      for (let tide of tideDataToday.predictions) {
        const tideTime = new Date(tide.t.replace(' ', 'T'));
        if (tideTime > now) {
          nextTide = tide;
          break;
        }
      }
    }

    // if no upcoming tide today, fetch tomorrow
    if (!nextTide) {
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      const yyyyT = tomorrow.getFullYear();
      const mmT = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const ddT = String(tomorrow.getDate()).padStart(2, '0');
      const tomorrowString = `${yyyyT}${mmT}${ddT}`;

      const tidesTomorrowRes = await fetch(`https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=predictions&application=web&format=json&units=english&station=8467726&time_zone=lst_ldt&datum=MLLW&interval=hilo&begin_date=${tomorrowString}&end_date=${tomorrowString}`);
      const tideDataTomorrow = await tidesTomorrowRes.json();

      if (tideDataTomorrow.predictions?.length) {
        nextTide = tideDataTomorrow.predictions[0];
      }
    }

    if (nextTide) {
      const tideTime = new Date(nextTide.t.replace(' ', 'T'));
      const diffMs = tideTime - now;
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      nextTideHtml = `<strong>Next Tide:</strong> ${nextTide.type === 'H' ? 'High' : 'Low'} in ${hours}h ${minutes}m`;
    }

    conditionsContent.innerHTML = `
      <p><strong>Air Temp:</strong> ${airTemp}°F</p>
      <p><strong>Water Temp:</strong> ${waterTemp}°F</p>
      <p><strong>Wind:</strong> ${windSpeed} knots (${windDir})${windGust !== 'N/A' ? `, Gusting ${windGust} knots` : ''}</p>
      <p>${nextTideHtml}</p>
      <p><em>Last Updated:</em> ${lastUpdated}</p>
    `;
  } catch (error) {
    console.error('error fetching conditions:', error);
    conditionsContent.innerHTML = `<p>error loading conditions.</p>`;
  }
}

// fetch nws report
function fetchNwsReport() {
  const realUrl = 'https://tgftp.nws.noaa.gov/data/raw/fz/fzus51.kokx.cwf.okx.txt';

  const proxyUrls = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(realUrl)}`,
    `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(realUrl)}`
  ];

  function tryFetch(urlIndex) {
    if (urlIndex >= proxyUrls.length) {
      nwsText.textContent = 'error loading nws report.';
      console.error('all proxy attempts failed');
      return;
    }

    fetch(proxyUrls[urlIndex])
      .then(response => {
        if (!response.ok) throw new Error('network response not ok');
        return response.text();
      })
      .then(text => {
        const zoneStart = text.indexOf('ANZ335');
        const nextZoneStart = text.indexOf('ANZ', zoneStart + 6);
        const relevantText = (zoneStart !== -1 && nextZoneStart !== -1)
          ? text.substring(zoneStart, nextZoneStart).trim()
          : 'nws report unavailable.';
        nwsText.textContent = relevantText;
      })
      .catch(err => {
        console.error(`proxy ${urlIndex + 1} failed, trying next if available`, err);
        tryFetch(urlIndex + 1);
      });
  }

  tryFetch(0);
}

// open/close modals with page scroll lock
function openModal(modal) {
  modal.style.display = 'block';
  document.body.classList.add('modal-open');
}

function closeModal(modal) {
  modal.style.display = 'none';
  document.body.classList.remove('modal-open');
}

// main modal elements
const openNwsBtn = document.getElementById('open-nws-btn');
const closeNwsBtn = document.getElementById('close-nws-btn');
const nwsModal = document.getElementById('nws-modal');
const nwsText = document.getElementById('nws-text');

const openInfoBtn = document.getElementById('open-info-btn');
const closeInfoBtn = document.getElementById('close-info-btn');
const infoModal = document.getElementById('info-modal');

const openTidesInfoBtn = document.getElementById('open-tides-info-btn');
const closeTidesInfoBtn = document.getElementById('close-tides-info-btn');
const tidesInfoModal = document.getElementById('tides-info-modal');

const openFutureInfoBtn = document.getElementById('open-future-info-btn');
const closeFutureInfoBtn = document.getElementById('close-future-info-btn');
const futureInfoModal = document.getElementById('future-info-modal');

// modal event listeners
openNwsBtn.addEventListener('click', () => {
  fetchNwsReport();
  openModal(nwsModal);
});
closeNwsBtn.addEventListener('click', () => closeModal(nwsModal));
openInfoBtn.addEventListener('click', () => openModal(infoModal));
closeInfoBtn.addEventListener('click', () => closeModal(infoModal));
openTidesInfoBtn.addEventListener('click', () => openModal(tidesInfoModal));
closeTidesInfoBtn.addEventListener('click', () => closeModal(tidesInfoModal));
openFutureInfoBtn.addEventListener('click', () => openModal(futureInfoModal));
closeFutureInfoBtn.addEventListener('click', () => closeModal(futureInfoModal));

window.addEventListener('click', (event) => {
  if (event.target.classList.contains('modal')) {
    closeModal(event.target);
  }
});

// today's tides toggle
const todayLocationButtons = document.querySelectorAll('.today-location-btn');
todayLocationButtons.forEach(button => {
  button.addEventListener('click', () => {
    todayLocationButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');

    const selectedLocation = button.getAttribute('data-location');
    fetchTodayTides(selectedLocation);
  });
});

// future 30-day tides toggle
const futureLocationButtons = document.querySelectorAll('.future-location-btn');
futureLocationButtons.forEach(button => {
  button.addEventListener('click', () => {
    futureLocationButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');

    const selectedFutureLocation = button.getAttribute('data-future-location');
    fetchFutureTides(selectedFutureLocation);
  });
});


async function fetchForecast() {
  const forecastContent = document.getElementById('forecast-conditions-content');

  try {
    const response = await fetch('https://api.weather.gov/gridpoints/OKX/55,57/forecast/hourly');
    const data = await response.json();
    const periods = data.properties.periods;

    // get 2, 4, 6, 8 hours from now
    const selectedHours = [2, 4, 6, 8];
    const selectedPeriods = selectedHours.map(hour => periods[hour]);

    let tableHtml = `
      <table>
        <thead>
          <tr>
            <th>Hour</th>
            <th>Temp</th>
            <th>Forecast</th>
            <th>Wind</th>
          </tr>
        </thead>
        <tbody>
    `;

    selectedPeriods.forEach((period, idx) => {
      if (period) {
        tableHtml += `
          <tr>
            <td>+${selectedHours[idx]}h</td>
            <td>${period.temperature}°${period.temperatureUnit}</td>
            <td>
              <img src="${period.icon}" alt="${period.shortForecast}" style="height:24px; vertical-align:middle;">
              <span>${period.shortForecast}</span>
            </td>
            <td>${period.windSpeed} ${period.windDirection}</td>
          </tr>
        `;
      }
    });

    tableHtml += `
        </tbody>
      </table>
    `;

    forecastContent.innerHTML = tableHtml;
  } catch (error) {
    console.error('error fetching forecast:', error);
    forecastContent.innerHTML = `<p>error loading short forecast.</p>`;
  }
}


// initial fetches
fetchTodayTides('southport');
fetchFutureTides('southport');
fetchConditions();
fetchForecast();
