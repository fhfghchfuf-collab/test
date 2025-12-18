const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const finalScoreEl = document.getElementById('final-score');
const highScoreEl = document.getElementById('high-score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// Game Constants
const GRID_SIZE = 20; // Size of one grid cell in pixels
const TILE_COUNT = 20; // 20x20 Grid
const CANVAS_SIZE = GRID_SIZE * TILE_COUNT; // 400x400

canvas.width = CANVAS_SIZE;
canvas.height = CANVAS_SIZE;

// Game State
let gameInterval;
let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;
highScoreEl.textContent = highScore;
let isGameRunning = false;
let lastRenderTime = 0;
const SNAKE_SPEED = 8; // Moves per second

class Snake {
    constructor() {
        this.body = [{ x: 10, y: 10 }];
        this.direction = { x: 0, y: 0 };
        this.newDirection = { x: 0, y: 0 };
        this.growAmount = 0;
    }

    update() {
        this.direction = this.newDirection;

        // If not moving, don't update
        if (this.direction.x === 0 && this.direction.y === 0) return;

        const head = { ...this.body[0] };
        head.x += this.direction.x;
        head.y += this.direction.y;

        // Check Wall Collision
        if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
            gameOver();
            return;
        }

        // Check Self Collision
        if (this.onSnake(head, { ignoreHead: true })) {
            gameOver();
            return;
        }

        this.body.unshift(head);

        // Handle Growth
        if (this.growAmount > 0) {
            this.growAmount--;
        } else {
            this.body.pop();
        }
    }

    draw() {
        this.body.forEach((segment, index) => {
            // Color Gradient based on index
            // Green head, fading to Blue tail
            const hue = 140 + (index * 2) % 60; // 140 is green-ish
            ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
            ctx.shadowBlur = 10;
            ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;

            // Draw slightly smaller than grid for "gap" effect
            ctx.fillRect(
                segment.x * GRID_SIZE + 1,
                segment.y * GRID_SIZE + 1,
                GRID_SIZE - 2,
                GRID_SIZE - 2
            );

            // Reset Shadow for performance/other draws
            ctx.shadowBlur = 0;

            // Draw Eyes on Head
            if (index === 0) {
                ctx.fillStyle = 'black';
                const eyeOffset = GRID_SIZE / 4;
                const eyeSize = GRID_SIZE / 5;
                // Simple logic to position eyes based on direction could go here, 
                // but center is fine for abstract style
                ctx.fillRect(segment.x * GRID_SIZE + eyeOffset, segment.y * GRID_SIZE + eyeOffset, eyeSize, eyeSize);
                ctx.fillRect(segment.x * GRID_SIZE + GRID_SIZE - eyeOffset - eyeSize, segment.y * GRID_SIZE + eyeOffset, eyeSize, eyeSize);
            }
        });
    }

    expand() {
        this.growAmount += 1;
    }

    onSnake(position, { ignoreHead = false } = {}) {
        return this.body.some((segment, index) => {
            if (ignoreHead && index === 0) return false;
            return segment.x === position.x && segment.y === position.y;
        });
    }
}

class Food {
    constructor(snake) {
        this.snake = snake;
        this.position = this.getRandomPosition();
    }

    getRandomPosition() {
        let newPos;
        while (newPos == null || this.snake.onSnake(newPos)) {
            newPos = {
                x: Math.floor(Math.random() * TILE_COUNT),
                y: Math.floor(Math.random() * TILE_COUNT)
            };
        }
        return newPos;
    }

    draw() {
        ctx.fillStyle = '#ff0055'; // Neon Red
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ff0055';

        const x = this.position.x * GRID_SIZE;
        const y = this.position.y * GRID_SIZE;
        const size = GRID_SIZE - 4;

        // Draw rounded rect or circle? Let's do a diamond for retro feel
        ctx.beginPath();
        ctx.moveTo(x + GRID_SIZE / 2, y + 2);
        ctx.lineTo(x + GRID_SIZE - 2, y + GRID_SIZE / 2);
        ctx.lineTo(x + GRID_SIZE / 2, y + GRID_SIZE - 2);
        ctx.lineTo(x + 2, y + GRID_SIZE / 2);
        ctx.fill();

        ctx.shadowBlur = 0;
    }

    update() {
        if (this.snake.onSnake(this.position)) {
            this.snake.expand();
            score += 10;
            updateScore();
            this.position = this.getRandomPosition();
        }
    }
}

let snake;
let food;

function updateScore() {
    scoreEl.textContent = score;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('snakeHighScore', highScore);
        highScoreEl.textContent = highScore;
    }
}

function gameOver() {
    isGameRunning = false;
    finalScoreEl.textContent = score;
    gameOverScreen.classList.remove('hidden');
}

function startGame() {
    snake = new Snake();
    food = new Food(snake);
    score = 0;
    updateScore();
    isGameRunning = true;
    snake.newDirection = { x: 1, y: 0 }; // Start moving right

    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');

    window.requestAnimationFrame(gameLoop);
}

function gameLoop(currentTime) {
    if (!isGameRunning) return;

    window.requestAnimationFrame(gameLoop);

    const secondsSinceLastRender = (currentTime - lastRenderTime) / 1000;
    if (secondsSinceLastRender < 1 / SNAKE_SPEED) return;

    lastRenderTime = currentTime;

    update();
    draw();
}

function update() {
    snake.update();
    food.update();
}

function draw() {
    // Clear Screen
    ctx.fillStyle = '#111'; // Match grid color slightly
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Standard Clear

    // Custom Background draw if needed (handled by CSS mostly, but transparency matters)

    food.draw();
    snake.draw();
}

// Input Handling
window.addEventListener('keydown', e => {
    if (!isGameRunning) {
        if ((e.key.includes('Arrow') || e.key.toLowerCase() === 'w' || e.key.toLowerCase() === 'd') && startScreen.classList.contains('hidden') === false) {
            // Optional: Start on keypress if valid
            startGame();
        }
        return;
    }

    // Prevent scrolling
    if (e.key.includes('Arrow')) e.preventDefault();

    switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            if (snake.direction.y !== 0) break;
            snake.newDirection = { x: 0, y: -1 };
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            if (snake.direction.y !== 0) break;
            snake.newDirection = { x: 0, y: 1 };
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            if (snake.direction.x !== 0) break;
            snake.newDirection = { x: -1, y: 0 };
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            if (snake.direction.x !== 0) break;
            snake.newDirection = { x: 1, y: 0 };
            break;
    }
});

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
