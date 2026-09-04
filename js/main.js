// NeuroTraffic - Ponto de entrada da simulação
// Etapa 7: adiciona regras básicas de trânsito:
//   - carros param antes do cruzamento quando o sinal do seu grupo não está verde;
//   - carros respeitam a fila (não ultrapassam o carro da frente);
//   - isso evita colisões simples entre carros da mesma faixa.

const ROAD_WIDTH = 120;
const MAX_CARS = 12;
const SPAWN_MIN_INTERVAL = 0.8; // segundos
const SPAWN_MAX_INTERVAL = 2.2; // segundos
const CAR_COLORS = ["#e53935", "#1e88e5", "#fdd835", "#8e24aa", "#43a047", "#fb8c00"];
const CAR_LENGTH = 30; // igual à largura do carro (no eixo de movimento)
const MIN_GAP = 8; // distância mínima entre o para-choque de um carro e o do próximo
const STOP_GAP = 6; // distância entre o nariz do carro e a linha de parada

const DIRECTIONS = {
  FROM_WEST: "from-west", // entra pela esquerda, indo para leste
  FROM_EAST: "from-east", // entra pela direita, indo para oeste
  FROM_NORTH: "from-north", // entra por cima, indo para sul
  FROM_SOUTH: "from-south", // entra por baixo, indo para norte
};

// Grupos de semáforo: EW controla as entradas leste/oeste,
// NS controla as entradas norte/sul. Apenas um grupo fica verde por vez.
const LIGHT_GROUPS = {
  EW: "ew",
  NS: "ns",
};

const LIGHT_COLORS = {
  RED: "red",
  YELLOW: "yellow",
  GREEN: "green",
};

// Sequência de fases do semáforo. Cada fase define a cor de cada grupo
// e por quanto tempo (em segundos) essa fase dura.
const LIGHT_PHASES = [
  { duration: 5, ew: LIGHT_COLORS.GREEN, ns: LIGHT_COLORS.RED },
  { duration: 2, ew: LIGHT_COLORS.YELLOW, ns: LIGHT_COLORS.RED },
  { duration: 1, ew: LIGHT_COLORS.RED, ns: LIGHT_COLORS.RED },
  { duration: 5, ew: LIGHT_COLORS.RED, ns: LIGHT_COLORS.GREEN },
  { duration: 2, ew: LIGHT_COLORS.RED, ns: LIGHT_COLORS.YELLOW },
  { duration: 1, ew: LIGHT_COLORS.RED, ns: LIGHT_COLORS.RED },
];

let canvas;
let ctx;
let cars = [];
let lastTimestamp = null;
let spawnTimer = 0;
let nextCarId = 0;

let trafficLights;

document.addEventListener("DOMContentLoaded", () => {
  canvas = document.getElementById("simulationCanvas");
  ctx = canvas.getContext("2d");

  spawnTimer = randomBetween(SPAWN_MIN_INTERVAL, SPAWN_MAX_INTERVAL);
  trafficLights = createTrafficLightSystem();

  console.log("NeuroTraffic: regras básicas de trânsito ativas. Pronto para a Etapa 8.");
  requestAnimationFrame(gameLoop);
});

/**
 * Loop principal da simulação. Calcula o tempo decorrido desde o último
 * quadro (delta time), atualiza o estado da simulação e redesenha a cena.
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
 * Atualiza a simulação a cada quadro: avança os semáforos, move os
 * carros respeitando sinais e fila, remove os que saíram do canvas e
 * controla a geração de novos veículos.
 */
function update(deltaSeconds) {
  updateTrafficLights(deltaSeconds);
  moveCarsWithTrafficRules(deltaSeconds);

  cars = cars.filter((car) => !hasLeftCanvas(car, canvas));

  updateSpawning(deltaSeconds);
}

/**
 * Move todos os carros respeitando duas regras básicas:
 *   1. Não ultrapassar a linha de parada quando o semáforo do seu grupo
 *      não estiver verde (a menos que já tenha entrado no cruzamento).
 *   2. Não ultrapassar o carro imediatamente à frente na mesma faixa
 *      (mesma direção de entrada), evitando colisões.
 *
 * Para isso, cada carro é tratado em um eixo de "progresso" (p), que
 * cresce conforme o carro avança em direção ao seu destino, independente
 * de estar se movendo em x ou em y, ou em sentido positivo ou negativo.
 */
function moveCarsWithTrafficRules(deltaSeconds) {
  const carsByDirection = groupCarsByDirection(cars);

  Object.keys(carsByDirection).forEach((direction) => {
    const group = carsByDirection[direction];

    // Ordena do carro mais avançado (mais próximo do destino) para o mais atrasado,
    // para que cada carro só possa ser limitado pelo carro processado antes dele.
    group.sort((a, b) => getProgress(b) - getProgress(a));

    let previousCarProgress = null;

    group.forEach((car) => {
      const currentProgress = getProgress(car);
      const desiredProgress = currentProgress + car.speed * deltaSeconds;

      let allowedProgress = desiredProgress;

      // Regra 1: respeitar o carro da frente (mesma direção).
      if (previousCarProgress !== null) {
        const maxProgressBehindCarAhead = previousCarProgress - CAR_LENGTH - MIN_GAP;
        allowedProgress = Math.min(allowedProgress, maxProgressBehindCarAhead);
      }

      // Regra 2: respeitar o semáforo, exceto se o carro já entrou no cruzamento.
      const stopLimit = getStopLimit(car, currentProgress);
      if (stopLimit !== null) {
        allowedProgress = Math.min(allowedProgress, stopLimit);
      }

      // O carro nunca anda para trás.
      const newProgress = Math.max(currentProgress, allowedProgress);

      setProgress(car, newProgress);
      previousCarProgress = newProgress;
    });
  });
}

/**
 * Agrupa os carros por direção de entrada (spawnDirection).
 */
function groupCarsByDirection(cars) {
  const groups = {};
  cars.forEach((car) => {
    if (!groups[car.spawnDirection]) {
      groups[car.spawnDirection] = [];
    }
    groups[car.spawnDirection].push(car);
  });
  return groups;
}

/**
 * Retorna o "progresso" do carro ao longo de seu caminho: um valor que
 * sempre aumenta conforme o carro se aproxima do seu destino, seja qual
 * for o eixo (x ou y) e o sentido real do movimento.
 */
function getProgress(car) {
  switch (car.spawnDirection) {
    case DIRECTIONS.FROM_WEST:
      return car.x;
    case DIRECTIONS.FROM_EAST:
      return -car.x;
    case DIRECTIONS.FROM_NORTH:
      return car.y;
    case DIRECTIONS.FROM_SOUTH:
      return -car.y;
  }
}

/**
 * Aplica um valor de progresso de volta à posição real (x ou y) do carro,
 * de acordo com sua direção de entrada.
 */
function setProgress(car, progress) {
  switch (car.spawnDirection) {
    case DIRECTIONS.FROM_WEST:
      car.x = progress;
      break;
    case DIRECTIONS.FROM_EAST:
      car.x = -progress;
      break;
    case DIRECTIONS.FROM_NORTH:
      car.y = progress;
      break;
    case DIRECTIONS.FROM_SOUTH:
      car.y = -progress;
      break;
  }
}

/**
 * Calcula o limite de progresso imposto pelo semáforo para este carro.
 * Retorna null se o semáforo não impuser nenhum limite no momento
 * (sinal verde, ou o carro já passou da linha de parada e está
 * comprometido a cruzar o cruzamento).
 */
function getStopLimit(car, currentProgress) {
  const group = getLightGroupForDirection(car.spawnDirection);
  const color = getGroupColor(group);

  if (color === LIGHT_COLORS.GREEN) {
    return null;
  }

  const nearEdgeProgress = getNearEdgeProgress(car.spawnDirection, canvas);
  const halfCarLength = CAR_LENGTH / 2;
  const noseProgress = currentProgress + halfCarLength;

  // Se o carro já alcançou a borda do cruzamento, deixamos ele terminar
  // de atravessar em vez de pará-lo no meio da via.
  if (noseProgress >= nearEdgeProgress) {
    return null;
  }

  return nearEdgeProgress - STOP_GAP - halfCarLength;
}

/**
 * Retorna a que grupo de semáforo (EW ou NS) pertence uma direção de entrada.
 */
function getLightGroupForDirection(spawnDirection) {
  return spawnDirection === DIRECTIONS.FROM_WEST || spawnDirection === DIRECTIONS.FROM_EAST
    ? LIGHT_GROUPS.EW
    : LIGHT_GROUPS.NS;
}

/**
 * Retorna, em unidades de "progresso", a posição da borda do cruzamento
 * mais próxima da origem de cada direção — ou seja, o ponto a partir do
 * qual o carro está prestes a entrar na área do cruzamento.
 */
function getNearEdgeProgress(spawnDirection, canvas) {
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const halfRoad = ROAD_WIDTH / 2;

  switch (spawnDirection) {
    case DIRECTIONS.FROM_WEST:
      return centerX - halfRoad;
    case DIRECTIONS.FROM_EAST:
      return -(centerX + halfRoad);
    case DIRECTIONS.FROM_NORTH:
      return centerY - halfRoad;
    case DIRECTIONS.FROM_SOUTH:
      return -(centerY + halfRoad);
  }
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
 * Cria o sistema de semáforos, começando na primeira fase definida em
 * LIGHT_PHASES.
 */
function createTrafficLightSystem() {
  return {
    phaseIndex: 0,
    timeInPhase: 0,
  };
}

/**
 * Avança o tempo do semáforo e troca de fase quando o tempo da fase
 * atual se esgota, avançando ciclicamente por LIGHT_PHASES.
 */
function updateTrafficLights(deltaSeconds) {
  trafficLights.timeInPhase += deltaSeconds;

  const currentPhase = LIGHT_PHASES[trafficLights.phaseIndex];

  if (trafficLights.timeInPhase >= currentPhase.duration) {
    trafficLights.timeInPhase = 0;
    trafficLights.phaseIndex = (trafficLights.phaseIndex + 1) % LIGHT_PHASES.length;
  }
}

/**
 * Retorna a cor atual (red/yellow/green) de um grupo de semáforo
 * ("ew" ou "ns"), consultando a fase atual do ciclo.
 */
function getGroupColor(group) {
  const currentPhase = LIGHT_PHASES[trafficLights.phaseIndex];
  return group === LIGHT_GROUPS.EW ? currentPhase.ew : currentPhase.ns;
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
    width: CAR_LENGTH,
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
 * Redesenha a cena inteira: fundo, ruas, cruzamento, semáforos e todos
 * os carros em suas posições atuais.
 */
function render() {
  drawScene(ctx, canvas);
  drawTrafficLights(ctx, canvas);
  cars.forEach((car) => drawCar(ctx, car));
}

/**
 * Desenha os quatro semáforos do cruzamento, um em cada canto, exibindo
 * a cor atual do grupo correspondente (EW nos cantos superior-direito e
 * inferior-esquerdo; NS nos cantos superior-esquerdo e inferior-direito).
 */
function drawTrafficLights(ctx, canvas) {
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const halfRoad = ROAD_WIDTH / 2;
  const offset = 35;

  const ewColor = getGroupColor(LIGHT_GROUPS.EW);
  const nsColor = getGroupColor(LIGHT_GROUPS.NS);

  drawTrafficLightBox(ctx, centerX - halfRoad - offset, centerY - halfRoad - offset, nsColor); // topo-esquerda
  drawTrafficLightBox(ctx, centerX + halfRoad + offset, centerY - halfRoad - offset, ewColor); // topo-direita
  drawTrafficLightBox(ctx, centerX - halfRoad - offset, centerY + halfRoad + offset, ewColor); // baixo-esquerda
  drawTrafficLightBox(ctx, centerX + halfRoad + offset, centerY + halfRoad + offset, nsColor); // baixo-direita
}

/**
 * Desenha uma caixa de semáforo (fundo escuro + três círculos: vermelho,
 * amarelo e verde), destacando com brilho total a cor ativa e deixando
 * as demais escurecidas.
 */
function drawTrafficLightBox(ctx, x, y, activeColor) {
  const boxWidth = 20;
  const boxHeight = 52;
  const radius = 5;

  ctx.save();
  ctx.translate(x - boxWidth / 2, y - boxHeight / 2);

  // Corpo da caixa do semáforo
  ctx.fillStyle = "#1a1a1a";
  drawRoundedRect(ctx, 0, 0, boxWidth, boxHeight, radius);
  ctx.fill();

  const lightRadius = 6;
  const centerXOffset = boxWidth / 2;

  drawSignalLight(ctx, centerXOffset, 12, lightRadius, "#ff4444", activeColor === LIGHT_COLORS.RED);
  drawSignalLight(ctx, centerXOffset, 26, lightRadius, "#ffeb3b", activeColor === LIGHT_COLORS.YELLOW);
  drawSignalLight(ctx, centerXOffset, 40, lightRadius, "#4caf50", activeColor === LIGHT_COLORS.GREEN);

  ctx.restore();
}

/**
 * Desenha um único círculo de sinal (farolete) do semáforo. Quando
 * "isActive" é verdadeiro, a cor é exibida em brilho total; caso
 * contrário, é desenhada escurecida para simular a lâmpada apagada.
 */
function drawSignalLight(ctx, x, y, radius, color, isActive) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = isActive ? color : "#3a3a3a";
  ctx.fill();

  if (isActive) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(x, y, radius + 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
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