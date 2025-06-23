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

// Рисуем сетку
function drawGrid() {
  gridContainer.removeChildren();
  const g = new PIXI.Graphics();
  g.lineStyle(1, 0x888888);
  for (let i=0; i<=GRID_SIZE; i++) {
    // вертикальные линии
    g.moveTo(OFFSET_X + i*TILE_SIZE, OFFSET_Y);
    g.lineTo(OFFSET_X + i*TILE_SIZE, OFFSET_Y + GRID_SIZE*TILE_SIZE);
    // горизонтальные
    g.moveTo(OFFSET_X, OFFSET_Y + i*TILE_SIZE);
    g.lineTo(OFFSET_X + GRID_SIZE*TILE_SIZE, OFFSET_Y + i*TILE_SIZE);
  }
  app.stage.addChild(g);
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
function drawFurniture() {
  furnitureContainer.removeChildren();
  roomState.items.forEach(item => {
    const def = furnitureDefs[item.type];
    const g = new PIXI.Graphics();
    g.beginFill(item.color);
    g.drawRect(0, 0, def.w * TILE_SIZE, def.h * TILE_SIZE);
    g.endFill();
    // позиция и поворот (в квадратах)
    g.x = OFFSET_X + item.x * TILE_SIZE;
    g.y = OFFSET_Y + (GRID_SIZE - def.h - item.y) * TILE_SIZE;
    g.rotation = item.rotation * Math.PI/180;
    furnitureContainer.addChild(g);
  });
}

// Генерация Base64-сида
function generateSeed() {
  const str = JSON.stringify(roomState);
  return btoa(str);
}

// Загрузка из сида
function loadSeed(seed) {
  try {
    const json = atob(seed.trim());
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
