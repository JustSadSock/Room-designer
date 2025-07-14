// Настройки сцены
const GRID_SIZE = 5;       // 5×5 клеток
const TILE_SIZE = 64;      // размер клетки в пикселях
const OFFSET_X = 100;      // отступ сцены от левого края холста
const OFFSET_Y = 100;      // отступ сцены от верхнего края холста

// Инициализация двух сцен PixiJS
const app1 = new PIXI.Application({
  backgroundColor: 0xdddddd,
  resizeTo: window,
  resolution: window.devicePixelRatio,
  roundPixels: true
});
const app2 = new PIXI.Application({
  backgroundColor: 0xdddddd,
  resizeTo: window,
  resolution: window.devicePixelRatio,
  roundPixels: true
});
document.getElementById('room1').appendChild(app1.view);
document.getElementById('room2').appendChild(app2.view);

// Контейнеры
const gridContainer1 = new PIXI.Container();
const furnitureContainer1 = new PIXI.Container();
app1.stage.addChild(gridContainer1, furnitureContainer1);

const gridContainer2 = new PIXI.Container();
const furnitureContainer2 = new PIXI.Container();
app2.stage.addChild(gridContainer2, furnitureContainer2);

// Состояние комнаты
let roomState = {
  floorColor: 0xffffff,
  wallColor: 0xe8e8e8,
  items: []  // { type, x, y, rotation, color }
};

let roomState2 = {
  floorColor: 0xffffff,
  wallColor: 0xe8e8e8,
  items: []
};

// Определения мебели (пока прямоугольники)
const furnitureDefs = {
  bed:   { w: 2, h: 1, color: 0xff4444 },
  table: { w: 1, h: 1, color: 0x4444ff },
  chair: { w: 1, h: 1, color: 0x22aa22 },
  plant: { w: 1, h: 1, color: 0x228b22 }
};

function getItemSize(item) {
  const def = furnitureDefs[item.type];
  return item.rotation % 180 === 0 ? { w: def.w, h: def.h } : { w: def.h, h: def.w };
}

function clampItem(item) {
  const size = getItemSize(item);
  if (item.x < 0) item.x = 0;
  if (item.y < 0) item.y = 0;
  if (item.x > GRID_SIZE - size.w) item.x = GRID_SIZE - size.w;
  if (item.y > GRID_SIZE - size.h) item.y = GRID_SIZE - size.h;
}

// Рисуем сетку с двумя стенами
function drawGrid(container, state) {
  container.removeChildren();
  const g = new PIXI.Graphics();

  // пол
  g.beginFill(state.floorColor);
  g.drawRect(OFFSET_X, OFFSET_Y, GRID_SIZE * TILE_SIZE, GRID_SIZE * TILE_SIZE);
  g.endFill();

  // стены
  g.beginFill(state.wallColor);
  g.drawRect(OFFSET_X - TILE_SIZE, OFFSET_Y - GRID_SIZE * TILE_SIZE, GRID_SIZE * TILE_SIZE, GRID_SIZE * TILE_SIZE);
  g.endFill();
  g.beginFill(state.wallColor + 0x0f0f0f);
  g.drawRect(OFFSET_X - TILE_SIZE, OFFSET_Y - GRID_SIZE * TILE_SIZE, TILE_SIZE, GRID_SIZE * TILE_SIZE + TILE_SIZE);
  g.endFill();

  // линии сетки на полу
  g.lineStyle(1, 0x888888);
  for (let i = 0; i <= GRID_SIZE; i++) {
    g.moveTo(OFFSET_X + i * TILE_SIZE, OFFSET_Y);
    g.lineTo(OFFSET_X + i * TILE_SIZE, OFFSET_Y + GRID_SIZE * TILE_SIZE);
    g.moveTo(OFFSET_X, OFFSET_Y + i * TILE_SIZE);
    g.lineTo(OFFSET_X + GRID_SIZE * TILE_SIZE, OFFSET_Y + i * TILE_SIZE);
  }
  container.addChild(g);
}

drawGrid(gridContainer1, roomState);
drawGrid(gridContainer2, roomState2);

// Добавить предмет в (0,0)
function addFurniture(type) {
  const def = furnitureDefs[type];
  if (!def) return;
  const item = { type, x:0, y:0, rotation: 0, color: def.color };
  roomState.items.push(item);
  drawFurniture(furnitureContainer1, roomState);
}

// Отрисовать всю мебель
let dragging = null;
let lastClick = 0;
let selectedItem = null;

function createSprite(item) {
  const size = getItemSize(item);
  const g = new PIXI.Graphics();
  g.beginFill(item.color);
  g.drawRect(0, 0, size.w * TILE_SIZE, size.h * TILE_SIZE);
  g.endFill();
  g.x = OFFSET_X + item.x * TILE_SIZE;
  g.y = OFFSET_Y + (GRID_SIZE - size.h - item.y) * TILE_SIZE;
  g.interactive = true;
  g.buttonMode = true;
  g.item = item;
  g
    .on('pointerdown', onPointerDown)
    .on('pointerup', onPointerUp)
    .on('pointerupoutside', onPointerUp)
    .on('pointermove', onPointerMove);
  return g;
}

function onPointerDown(e) {
  const now = Date.now();
  if (now - lastClick < 300) {
    selectedItem = this.item;
    selectedItem.rotation = (selectedItem.rotation + 90) % 360;
    clampItem(selectedItem);
    drawFurniture(furnitureContainer1, roomState);
    lastClick = 0;
    return;
  }
  lastClick = now;
  selectedItem = this.item;
  dragging = { data: e.data, item: this.item, offset: e.data.getLocalPosition(this) };
}

function onPointerMove(e) {
  if (!dragging) return;
  const pos = dragging.data.getLocalPosition(furnitureContainer1);
  const size = getItemSize(dragging.item);
  dragging.item.x = Math.round((pos.x - dragging.offset.x - OFFSET_X) / TILE_SIZE);
  dragging.item.y = Math.round((OFFSET_Y + GRID_SIZE * TILE_SIZE - pos.y - dragging.offset.y - size.h * TILE_SIZE) / TILE_SIZE);
  clampItem(dragging.item);
  drawFurniture(furnitureContainer1, roomState);
}

function onPointerUp() {
  dragging = null;
}

function drawFurniture(container, state) {
  container.removeChildren();
  state.items.forEach(item => {
    container.addChild(createSprite(item));
  });
}

// Генерация сида
function generateSeed() {
  const str = JSON.stringify(roomState);
  return LZString.compressToEncodedURIComponent(str);
}

// Загрузка из сида
function loadSeed(seed) {
  try {
    const json = LZString.decompressFromEncodedURIComponent(seed.trim());
    roomState = JSON.parse(json);
    drawGrid(gridContainer1, roomState);
    drawFurniture(furnitureContainer1, roomState);
    document.getElementById('seed-output').value = seed;
  } catch (e) {
    alert('Некорректный сид');
  }
}

function loadSeed2(seed) {
  try {
    const json = LZString.decompressFromEncodedURIComponent(seed.trim());
    roomState2 = JSON.parse(json);
    document.getElementById('room2').style.display = 'flex';
    drawGrid(gridContainer2, roomState2);
    drawFurniture(furnitureContainer2, roomState2);
  } catch (e) {
    alert('Некорректный сид');
  }
}

function compareRooms(a, b) {
  let matches = 0;
  let total = Math.max(a.items.length, b.items.length) || 1;
  a.items.forEach(itemA => {
    const found = b.items.find(itemB => itemB.type === itemA.type && itemB.x === itemA.x && itemB.y === itemA.y && itemB.rotation === itemA.rotation && itemB.color === itemA.color);
    if (found) matches++;
  });
  if (a.floorColor === b.floorColor) matches++;
  if (a.wallColor === b.wallColor) matches++;
  total += 2;
  return Math.round((matches / total) * 100);
}

// UI-события
document.getElementById('add-item').onclick = () => {
  const type = document.getElementById('item-select').value;
  addFurniture(type);
};
document.getElementById('generate-seed').onclick = () => {
  document.getElementById('seed-output').value = generateSeed();
};
document.getElementById('load-seed').onclick = () => {
  const seed = document.getElementById('seed-input').value;
  loadSeed(seed);
};
document.getElementById('load-seed-2').onclick = () => {
  const seed = document.getElementById('seed-input-2').value;
  loadSeed2(seed);
};
document.getElementById('copy-seed').onclick = async () => {
  const seed = document.getElementById('seed-output').value;
  try {
    await navigator.clipboard.writeText(seed);
  } catch (e) {
    /* clipboard access failed */
  }
};
document.getElementById('rotate-item').onclick = () => {
  if (selectedItem) {
    selectedItem.rotation = (selectedItem.rotation + 90) % 360;
    clampItem(selectedItem);
    drawFurniture(furnitureContainer1, roomState);
  }
};
document.getElementById('delete-item').onclick = () => {
  if (selectedItem) {
    const idx = roomState.items.indexOf(selectedItem);
    if (idx !== -1) {
      roomState.items.splice(idx, 1);
      selectedItem = null;
      drawFurniture(furnitureContainer1, roomState);
    }
  }
};
document.getElementById('floor-color').oninput = e => {
  roomState.floorColor = parseInt(e.target.value.replace('#','0x'));
  drawGrid(gridContainer1, roomState);
  drawFurniture(furnitureContainer1, roomState);
};
document.getElementById('wall-color').oninput = e => {
  roomState.wallColor = parseInt(e.target.value.replace('#','0x'));
  drawGrid(gridContainer1, roomState);
  drawFurniture(furnitureContainer1, roomState);
};

document.getElementById('compare-seeds').onclick = () => {
  const seed1 = generateSeed();
  const seed2 = document.getElementById('seed-input-2').value.trim();
  if (!seed2) return;
  const json1 = JSON.parse(LZString.decompressFromEncodedURIComponent(seed1));
  const json2 = JSON.parse(LZString.decompressFromEncodedURIComponent(seed2));
  const score = compareRooms(json1, json2);
  document.getElementById('compare-output').textContent = 'Совпадение: ' + score + '%';
};

window.addEventListener('keydown', e => {
  if (e.key === 'Delete') {
    if (selectedItem) {
      const idx = roomState.items.indexOf(selectedItem);
      if (idx !== -1) {
        roomState.items.splice(idx, 1);
        selectedItem = null;
        drawFurniture(furnitureContainer1, roomState);
      }
    }
  }
});
