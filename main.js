// Настройки сцены
const GRID_SIZE = 5;       // 5×5 клеток
const TILE_SIZE = 64;      // размер клетки в пикселях
const OFFSET_X = 100;      // отступ сцены от левого края холста
const OFFSET_Y = 100;      // отступ сцены от верхнего края холста

// Инициализация PixiJS
const app = new PIXI.Application({
  backgroundColor: 0xdddddd,
  resizeTo: window,
  resolution: window.devicePixelRatio,
  roundPixels: true
});
document.getElementById('game-container').appendChild(app.view);

// Контейнеры
const gridContainer = new PIXI.Container();
const furnitureContainer = new PIXI.Container();
app.stage.addChild(gridContainer, furnitureContainer);

// Состояние комнаты
let roomState = {
  floorColor: 0xffffff,
  items: []  // { type, x, y, rotation, color }
};

// Определения мебели (пока прямоугольники)
const furnitureDefs = {
  bed:   { w: 2, h: 1, color: 0xff4444 },
  table: { w: 1, h: 1, color: 0x4444ff }
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
function drawGrid() {
  gridContainer.removeChildren();
  const g = new PIXI.Graphics();

  // пол
  g.beginFill(roomState.floorColor);
  g.drawRect(OFFSET_X, OFFSET_Y, GRID_SIZE * TILE_SIZE, GRID_SIZE * TILE_SIZE);
  g.endFill();

  // стены
  g.beginFill(0xe8e8e8);
  g.drawRect(OFFSET_X - TILE_SIZE, OFFSET_Y - GRID_SIZE * TILE_SIZE, GRID_SIZE * TILE_SIZE, GRID_SIZE * TILE_SIZE);
  g.endFill();
  g.beginFill(0xf5f5f5);
  g.drawRect(OFFSET_X - TILE_SIZE, OFFSET_Y - GRID_SIZE * TILE_SIZE, TILE_SIZE, GRID_SIZE * TILE_SIZE + TILE_SIZE);
  g.endFill();

  // линии сетки на полу
  g.lineStyle(1, 0x888888);
  for (let i = 0; i <= GRID_SIZE; i++) {
    // вертикальные
    g.moveTo(OFFSET_X + i * TILE_SIZE, OFFSET_Y);
    g.lineTo(OFFSET_X + i * TILE_SIZE, OFFSET_Y + GRID_SIZE * TILE_SIZE);
    // горизонтальные
    g.moveTo(OFFSET_X, OFFSET_Y + i * TILE_SIZE);
    g.lineTo(OFFSET_X + GRID_SIZE * TILE_SIZE, OFFSET_Y + i * TILE_SIZE);
  }
  gridContainer.addChild(g);
}
drawGrid();

// Добавить предмет в (0,0)
function addFurniture(type) {
  const def = furnitureDefs[type];
  if (!def) return;
  const item = { type, x:0, y:0, rotation: 0, color: def.color };
  roomState.items.push(item);
  drawFurniture();
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
    drawFurniture();
    lastClick = 0;
    return;
  }
  lastClick = now;
  selectedItem = this.item;
  dragging = { data: e.data, item: this.item, offset: e.data.getLocalPosition(this) };
}

function onPointerMove(e) {
  if (!dragging) return;
  const pos = dragging.data.getLocalPosition(furnitureContainer);
  const size = getItemSize(dragging.item);
  dragging.item.x = Math.round((pos.x - dragging.offset.x - OFFSET_X) / TILE_SIZE);
  dragging.item.y = Math.round((OFFSET_Y + GRID_SIZE * TILE_SIZE - pos.y - dragging.offset.y - size.h * TILE_SIZE) / TILE_SIZE);
  clampItem(dragging.item);
  drawFurniture();
}

function onPointerUp() {
  dragging = null;
}

function drawFurniture() {
  furnitureContainer.removeChildren();
  roomState.items.forEach(item => {
    furnitureContainer.addChild(createSprite(item));
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
    drawFurniture();
    document.getElementById('seed-output').value = seed;
  } catch (e) {
    alert('Некорректный сид');
  }
}

// UI-события
document.getElementById('add-bed').onclick    = () => { addFurniture('bed'); };
document.getElementById('add-table').onclick  = () => { addFurniture('table'); };
document.getElementById('generate-seed').onclick = () => {
  document.getElementById('seed-output').value = generateSeed();
};
document.getElementById('load-seed').onclick = () => {
  const seed = document.getElementById('seed-input').value;
  loadSeed(seed);
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
    drawFurniture();
  }
};
