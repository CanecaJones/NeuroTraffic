// NeuroTraffic - Ponto de entrada da simulação
// Etapa 5: substitui os carros fixos por geração aleatória de veículos.

const ROAD_WIDTH = 120;
const MAX_CARS = 12;
const SPAWN_MIN_INTERVAL = 0.8; // segundos
const SPAWN_MAX_INTERVAL = 2.2; // segundos
const CAR_COLORS = ["#e53935", "#1e88e5", "#fdd835", "#8e24aa", "#43a047", "#fb8c00"];

const DIRECTIONS = {
  FROM_WEST: "from-west", // entra pela esquerda, indo para leste
  FROM_EAST: "from-east", // entra pela direita, indo para oeste
  FROM_NORTH: "from-north", // entra por cima, indo para sul
  FROM_SOUTH: "from-south", // entra por baixo, indo para norte
};

let canvas;
let ctx;
let cars = [];
let lastTimestamp = null;
let spawnTimer = 0;
let nextCarId = 0;

document.addEventListener("DOMContentLoaded", () => {
  canvas = document.getElementById("simulationCanvas");
  ctx = canvas.getContext("2d");

  spawnTimer = randomBetween(SPAWN_MIN_INTERVAL, SPAWN_MAX_INTERVAL);

  console.log("NeuroTraffic: geração aleatória de veículos ativada. Pronto para a Etapa 6.");
  requestAnimationFrame(gameLoop);
});

/**
 * Loop principal da simulação. Calcula o tempo decorrido desde o último
 * quadro (delta time), atualiza o estado dos carros e redesenha a cena.
 */
function gameLoop(timestamp) {
  if (lastTimestamp === null) {
    lastTimestamp = timestamp;
  }

  const deltaSeconds = (timestamp - lastTimestamp) / 1000;
  lastTimestamp = timestamp;

  update(deltaSeconds);
  render();

  requestAnimationFrame(gameLoop);
}

/**
 * Atualiza a simulação a cada quadro:
 * - move os carros existentes;
 * - remove os carros que saíram completamente do canvas;
 * - controla o timer de geração e cria novos carros aleatoriamente.
 */
function update(deltaSeconds) {
  cars.forEach((car) => {
    car.x += Math.cos(car.direction) * car.speed * deltaSeconds;
    car.y += Math.sin(car.direction) * car.speed * deltaSeconds;
  });

  cars = cars.filter((car) => !hasLeftCanvas(car, canvas));

  updateSpawning(deltaSeconds);
}

/**
 * Controla o timer de geração de veículos. Quando o timer chega a zero,
 * tenta gerar um novo carro (respeitando o limite máximo simultâneo) e
 * sorteia um novo intervalo até a próxima geração.
 */
function updateSpawning(deltaSeconds) {
  spawnTimer -= deltaSeconds;

  if (spawnTimer <= 0) {
    if (cars.length < MAX_CARS) {
      cars.push(createRandomCar(canvas));
    }
    spawnTimer = randomBetween(SPAWN_MIN_INTERVAL, SPAWN_MAX_INTERVAL);
  }
}

/**
 * Verifica se um carro já saiu completamente da área visível do canvas,
 * considerando sua direção de movimento.
 */
function hasLeftCanvas(car, canvas) {
  const margin = 40;

  switch (car.spawnDirection) {
    case DIRECTIONS.FROM_WEST:
      return car.x > canvas.width + margin;
    case DIRECTIONS.FROM_EAST:
      return car.x < -margin;
    case DIRECTIONS.FROM_NORTH:
      return car.y > canvas.height + margin;
    case DIRECTIONS.FROM_SOUTH:
      return car.y < -margin;
    default:
      return false;
  }
}

/**
 * Cria um carro em uma das quatro entradas do cenário, escolhida
 * aleatoriamente, já posicionado na faixa correta e fora da área visível
 * do canvas (para "entrar" na cena de forma natural).
 */
function createRandomCar(canvas) {
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const laneOffset = ROAD_WIDTH / 4;
  const spawnMargin = 40;

  const directionKeys = Object.values(DIRECTIONS);
  const spawnDirection = directionKeys[Math.floor(Math.random() * directionKeys.length)];

  let x, y, angle;

  switch (spawnDirection) {
    case DIRECTIONS.FROM_WEST:
      x = -spawnMargin;
      y = centerY + laneOffset;
      angle = 0;
      break;
    case DIRECTIONS.FROM_EAST:
      x = canvas.width + spawnMargin;
      y = centerY - laneOffset;
      angle = Math.PI;
      break;
    case DIRECTIONS.FROM_NORTH:
      x = centerX + laneOffset;
      y = -spawnMargin;
      angle = Math.PI / 2;
      break;
    case DIRECTIONS.FROM_SOUTH:
      x = centerX - laneOffset;
      y = canvas.height + spawnMargin;
      angle = -Math.PI / 2;
      break;
  }

  return {
    id: `car-${nextCarId++}`,
    x,
    y,
    width: 30,
    height: 16,
    color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
    direction: angle,
    spawnDirection,
    speed: randomBetween(70, 110),
  };
}

/**
 * Retorna um número aleatório entre min e max (inclusive min, exclusive max).
 */
function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Redesenha a cena inteira: fundo, ruas, cruzamento e todos os carros
 * em suas posições atuais.
 */
function render() {
  drawScene(ctx, canvas);
  cars.forEach((car) => drawCar(ctx, car));
}

/**
 * Desenha um único carro no canvas, como um retângulo com cantos
 * arredondados e uma pequena faixa indicando a frente do veículo.
 */
function drawCar(ctx, car) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.direction);

  // Corpo do carro
  ctx.fillStyle = car.color;
  drawRoundedRect(ctx, -car.width / 2, -car.height / 2, car.width, car.height, 4);
  ctx.fill();

  // Indicador da frente do carro (farol)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(car.width / 2 - 4, -car.height / 2 + 2, 3, car.height - 4);

  ctx.restore();
}

/**
 * Desenha um retângulo com cantos arredondados no caminho atual do
 * contexto (não preenche nem contorna sozinho).
 */
function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Desenha a cena completa: fundo, ruas (horizontal e vertical) e o
 * cruzamento entre elas, incluindo faixas de pista tracejadas.
 */
function drawScene(ctx, canvas) {
  const width = canvas.width;
  const height = canvas.height;

  const roadWidth = ROAD_WIDTH;
  const centerX = width / 2;
  const centerY = height / 2;

  // Fundo (grama / área externa às ruas)
  ctx.fillStyle = "#2f5d34";
  ctx.fillRect(0, 0, width, height);

  // Rua horizontal
  ctx.fillStyle = "#3a3a3a";
  ctx.fillRect(0, centerY - roadWidth / 2, width, roadWidth);

  // Rua vertical
  ctx.fillRect(centerX - roadWidth / 2, 0, roadWidth, height);

  drawLaneDividers(ctx, width, height, roadWidth, centerX, centerY);
  drawCrosswalks(ctx, roadWidth, centerX, centerY);
}

/**
 * Desenha as linhas tracejadas centrais das ruas, interrompendo o
 * desenho na área do cruzamento.
 */
function drawLaneDividers(ctx, width, height, roadWidth, centerX, centerY) {
  ctx.strokeStyle = "#f4f4f4";
  ctx.lineWidth = 3;
  ctx.setLineDash([20, 15]);

  const halfRoad = roadWidth / 2;

  // Linha tracejada horizontal (interrompida no cruzamento)
  ctx.beginPath();
  ctx.moveTo(0, centerY);
  ctx.lineTo(centerX - halfRoad, centerY);
  ctx.moveTo(centerX + halfRoad, centerY);
  ctx.lineTo(width, centerY);
  ctx.stroke();

  // Linha tracejada vertical (interrompida no cruzamento)
  ctx.beginPath();
  ctx.moveTo(centerX, 0);
  ctx.lineTo(centerX, centerY - halfRoad);
  ctx.moveTo(centerX, centerY + halfRoad);
  ctx.lineTo(centerX, height);
  ctx.stroke();

  ctx.setLineDash([]); // reseta o padrão de traço para outros desenhos
}

/**
 * Desenha faixas de pedestres (crosswalks) nas quatro entradas do
 * cruzamento, apenas como referência visual do limite da interseção.
 */
function drawCrosswalks(ctx, roadWidth, centerX, centerY) {
  const halfRoad = roadWidth / 2;
  const stripeCount = 6;
  const stripeThickness = 8;
  const stripeGap = roadWidth / stripeCount;

  ctx.fillStyle = "#f4f4f4";

  // Crosswalk superior (borda de cima do cruzamento)
  for (let i = 0; i < stripeCount; i++) {
    ctx.fillRect(
      centerX - halfRoad + i * stripeGap + (stripeGap - stripeThickness) / 2,
      centerY - halfRoad - 20,
      stripeThickness,
      15
    );
  }

  // Crosswalk inferior
  for (let i = 0; i < stripeCount; i++) {
    ctx.fillRect(
      centerX - halfRoad + i * stripeGap + (stripeGap - stripeThickness) / 2,
      centerY + halfRoad + 5,
      stripeThickness,
      15
    );
  }

  // Crosswalk esquerdo
  for (let i = 0; i < stripeCount; i++) {
    ctx.fillRect(
      centerX - halfRoad - 20,
      centerY - halfRoad + i * stripeGap + (stripeGap - stripeThickness) / 2,
      15,
      stripeThickness
    );
  }

  // Crosswalk direito
  for (let i = 0; i < stripeCount; i++) {
    ctx.fillRect(
      centerX + halfRoad + 5,
      centerY - halfRoad + i * stripeGap + (stripeGap - stripeThickness) / 2,
      15,
      stripeThickness
    );
  }
}