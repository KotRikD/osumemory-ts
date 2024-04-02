const queryParams = new URLSearchParams(window.location.search);

const BACKUP_SERVER_IP = document.querySelector('#SERVER_IP')?.value;
const BACKUP_SERVER_PORT = document.querySelector('#SERVER_PORT')?.value;


const downloading = [];
const tab = +(queryParams.get('tab') || 0);


const search_bar = document.querySelector('.search-bar');
let timer, isSearching = false;


document.querySelector(`.tabs>.tab-item:nth-child(${+tab + 1})`)?.classList.add('active');


function getSizeOfElement(div) {
  const [oldOpacity, oldPosition] = [
    div.style.opacity,
    div.style.position,
  ];

  div.style.opacity = 0;
  div.style.position = 'fixed';
  document.body.appendChild(div);

  const size = div.getBoundingClientRect();
  const styles = window.getComputedStyle(div);

  size.width = size.width + +(styles.paddingLeft.replace('px', '')) + +(styles.paddingRight.replace('px', '')) + +(styles.marginLeft.replace('px', '')) + +(styles.marginRight.replace('px', ''));
  size.height = size.height + +(styles.paddingTop.replace('px', '')) + +(styles.paddingBottom.replace('px', '')) + +(styles.marginTop.replace('px', '')) + +(styles.marginBottom.replace('px', ''));

  div.style.opacity = oldOpacity;
  div.style.position = oldPosition;

  document.body.removeChild(div);

  return size;
};

function startDownload(element) {
  const children = element.children[0];
  const previousImage = element.children[1];

  const id = element.attributes.l?.value;
  const isDownloading = downloading.includes(id);

  if (isDownloading == false) {
    const childrenSize = children.getBoundingClientRect();
    children.style.width = childrenSize.width;


    const loadingDiv = previousImage || document.createElement('img');
    if (!previousImage) loadingDiv.src = 'https://cdn-icons-png.flaticon.com/128/39/39979.png';
    loadingDiv.style.width = 0;
    loadingDiv.style.opacity = 0;

    element.appendChild(loadingDiv);


    setTimeout(() => {
      element.classList.add('disable');
      children.style.opacity = 0;
      children.style.width = 0;

      setTimeout(() => {
        loadingDiv.style.opacity = 1;
        loadingDiv.style.width = loadingDiv.style.height = childrenSize.height;
      }, 100);
    }, 10);
  };
};

function endDownload(element, id, text) {
  const span = element.children[0];
  const image = element.children[1];

  const isDownloading = downloading.includes(id);

  if (isDownloading == true) {
    const testSpan = document.createElement('span');
    testSpan.innerText = text;
    span.innerText = text;

    const spanSize = getSizeOfElement(testSpan);


    image.style.opacity = 0;
    image.style.width = 0;
    image.style.height = 0;


    setTimeout(() => {
      span.style.opacity = 1;
      span.style.width = spanSize.width;
    }, 100);


    const index = downloading.indexOf(id);
    if (index == -1) return;

    downloading.splice(index, 1);
  };
}

async function downloadCounter(element, id) {
  if (downloading.includes(id)) return;

  downloading.push(id);

  const url = element.attributes.l?.value;
  const name = element.attributes.n?.value;
  const author = element.attributes.a?.value;

  const download = await fetch(`/api/counters/download/${url}?name=${name} by ${author}`);
  const json = await download.json();

  if (json.error != null) {
    displayNotification({
      element: element.parentElement.parentElement.parentElement,
      text: `Error while downloading: ${json.error}`,
      classes: ['red'],
      delay: 3000,
    });

    endDownload(element, id, 'Error');
    element.classList.remove('disable');
    return;
  };

  displayNotification({
    element: element.parentElement.parentElement.parentElement,
    text: `PP Counter downloaded: ${name} by ${author}`,
    classes: ['green'],
    delay: 3000,
  });

  endDownload(element, id, 'Downloaded');
};

function tabSwitch(element) {
  document.querySelector(`.tabs>.tab-item:nth-child(${+tab + 1})`)?.classList.remove('active');

  switch (element.innerText.toLowerCase()) {
    case 'installed':
      tab = 0;
      break;
    case 'pp counters':
      tab = 1;
      break;
  };

  history.pushState(null, null, `/?tab=${tab}`)

  localStorage.setItem('tab', tab);
  element.classList.add('active');
};

function displayNotification({ element, text, classes, delay }) {
  const div = document.createElement('div');
  const size = div.getBoundingClientRect();
  div.classList.add('notification');
  div.classList.add('hidden');
  div.classList.add(...classes);

  var targetRect = element.getBoundingClientRect();
  var bodyRect = document.querySelector('main').getBoundingClientRect();
  var leftOffset = targetRect.left - bodyRect.left;
  var topOffset = targetRect.top - bodyRect.top;
  var rightOffset = bodyRect.right - targetRect.right;
  var bottomOffset = bodyRect.bottom - targetRect.bottom;

  const divSize = getSizeOfElement(div);

  div.style.left = leftOffset;
  div.style.bottom = bottomOffset - divSize.height - 5;

  div.innerText = text;


  document.querySelector('main').appendChild(div);
  setTimeout(() => {
    div.classList.remove('hidden');
  }, 10);

  setTimeout(() => {
    div.classList.add('hidden');

    setTimeout(() => {
      document.querySelector('main').removeChild(div);
    }, 310);
  }, delay);
};

function copyText(element) {
  navigator.clipboard.writeText(element.attributes.nfv.value).then(() => {
    displayNotification({
      element,
      text: `${element.attributes.nft.value} copied`,
      classes: ['green'],
      delay: 700,
    });
  });
}

async function deleteCounter(element) {
  const folderName = element.attributes.n?.value;

  let isDelete = confirm(`Do you want to delete?: ${folderName}`);
  if (isDelete != true) return;


  const download = await fetch(`/api/counters/delete/${folderName}`);
  const json = await download.json();

  if (json.error != null) {
    displayNotification({
      element: element.parentElement.parentElement.parentElement,
      text: `Error while downloading: ${json.error}`,
      classes: ['red'],
      delay: 3000,
    });

    endDownload(element, `delete-${folderName}`, 'Error');
    element.classList.remove('disable');
    return;
  };

  displayNotification({
    element: element.parentElement.parentElement.parentElement,
    text: `PP Counter deleted: ${folderName}`,
    classes: ['green'],
    delay: 3000,
  });

  endDownload(element, `delete-${folderName}`, 'Deleted');

  const results = document.querySelector('.results');
  results.removeChild(element.parentElement.parentElement.parentElement);

  if (results.innerHTML.trim() != '') return;

  results.innerHTML = `<div class="no-results">
  No counters<br /><a href="/?tab=1">Go here to get one 👉</a>
  </div>`;
};

async function openCounter(element) {
  const folderName = element.attributes.n?.value;

  const download = await fetch(`/api/counters/open/${folderName}`);
  const json = await download.json();

  if (json.error != null) {
    displayNotification({
      element: element.parentElement.parentElement.parentElement,
      text: `Error while opening: ${json.error}`,
      classes: ['red'],
      delay: 3000,
    });

    return;
  };

  displayNotification({
    element: element.parentElement.parentElement.parentElement,
    text: `PP Counter Opened: ${folderName}`,
    classes: ['green'],
    delay: 3000,
  });
};

function handleInput() {
  clearTimeout(timer);

  timer = setTimeout(() => {
    startSearch();
  }, 600);
};

function handleKeyDown(event) {
  if (event.keyCode === 13) {
    startSearch();
  };
}

async function startSearch(search) {
  if (isSearching == true) return;
  search_bar.classList.add('disable');
  isSearching = true;

  try {
    const request = await fetch(`/api/counters/search/${search_bar.value}?tab=${tab}`);
    const response = await request.text();

    document.querySelector('.results').innerHTML = response;
  } catch (error) {
    console.error(error);
  };

  search_bar.classList.remove('disable');
  isSearching = false;
};

async function saveSettings(element) {
  if (downloading.includes('save-settings')) return;
  downloading.push('save-settings');

  let redirect = false;

  const DEBUG_LOG = document.querySelector('#DEBUG_LOG');
  const CALCULATE_PP = document.querySelector('#CALCULATE_PP');
  const ENABLE_KEY_OVERLAY = document.querySelector('#ENABLE_KEY_OVERLAY');
  const ENABLE_GOSU_OVERLAY = document.querySelector('#ENABLE_GOSU_OVERLAY');
  const POLL_RATE = document.querySelector('#POLL_RATE');
  const PRECISE_DATA_POLL_RATE = document.querySelector('#PRECISE_DATA_POLL_RATE');
  const SERVER_IP = document.querySelector('#SERVER_IP');
  const SERVER_PORT = document.querySelector('#SERVER_PORT');
  const STATIC_FOLDER_PATH = document.querySelector('#STATIC_FOLDER_PATH');

  if (BACKUP_SERVER_IP != SERVER_IP.value || BACKUP_SERVER_PORT != SERVER_PORT.value)
    redirect = true;


  const download = await fetch(`/api/settingsSave`, {
    method: 'POST',
    body: JSON.stringify({
      DEBUG_LOG: DEBUG_LOG.checked,
      CALCULATE_PP: CALCULATE_PP.checked,
      ENABLE_KEY_OVERLAY: ENABLE_KEY_OVERLAY.checked,
      ENABLE_GOSU_OVERLAY: ENABLE_GOSU_OVERLAY.checked,
      POLL_RATE: POLL_RATE.value,
      PRECISE_DATA_POLL_RATE: PRECISE_DATA_POLL_RATE.value,
      SERVER_IP: SERVER_IP.value,
      SERVER_PORT: SERVER_PORT.value,
      STATIC_FOLDER_PATH: STATIC_FOLDER_PATH.value,
    }),
  });
  const json = await download.json();
  if (json.error != null) {
    displayNotification({
      element: element.parentElement.parentElement.parentElement,
      text: `Error while opening: ${json.error}`,
      classes: ['red'],
      delay: 3000,
    });

    setTimeout(() => {
      endDownload(element, 'save-settings', 'Save settings');
      element.classList.remove('disable');
    }, 300);
    return;
  };

  displayNotification({
    element: element.parentElement.parentElement.parentElement,
    text: `Config has been saved`,
    classes: ['green'],
    delay: 3000,
  });

  if (redirect == true) {
    const ip = SERVER_IP.value == '0.0.0.0' ? 'localhost' : SERVER_IP.value;

    setTimeout(() => {
      window.location.href = `http://${ip}:${SERVER_PORT.value}${window.location.pathname}${window.location.search}`
    }, 300);

    element.classList.remove('disable');
    return;
  };

  setTimeout(() => {
    endDownload(element, 'save-settings', 'Saved');
    element.classList.remove('disable');
  }, 300);
};


search_bar.addEventListener('input', handleInput);
search_bar.addEventListener('keydown', handleInput);


window.addEventListener('click', (event) => {
  const t = event.target;
  // if (t.classList.value.includes('tab-item')) return tabSwitch(t);
  if (t?.classList.value.includes('dl-button')) {
    const id = t.attributes.l?.value;

    startDownload(t);
    downloadCounter(t, id);
    return
  };
  if (t?.classList.value.includes('delete-button')) return deleteCounter(t);
  if (t?.classList.value.includes('open-button')) return openCounter(t);
  if (t?.classList.value.includes('save-button')) {
    startDownload(t);
    return saveSettings(t);
  };
  if (t?.attributes.nf) return copyText(t);
});