// === UTILITIES ===
function draw(x: number, y: number, w: number, h: number, b: number) {
    for (let ox = 0; ox <= w; ox++) {
        for (let oy = 0; oy <= h; oy++) {
            if (x + ox >= 0 && x + ox < 5 && 4 - (y + oy) >= 0 && 4 - (y + oy) < 5)
                led.plotBrightness(x + ox, 4 - (y + oy), b)
        }
    }
}

function touching(x1: number, y1: number, w1: number, h1: number, x2: number, y2: number, w2: number, h2: number) {
    return !(x1 + w1 < x2 || x1 > x2 + w2 || y1 + h1 < y2 || y1 > y2 + h2)
}

// 2x5 font for scores
const digits2x5: number[][][] = [
    [[1, 1], [1, 1], [1, 1], [1, 1], [1, 1]], [[0, 1], [1, 1], [0, 1], [0, 1], [1, 1]], [[1, 1], [0, 1], [1, 1], [1, 0], [1, 1]], [[1, 1], [0, 1], [1, 1], [0, 1], [1, 1]], [[1, 0], [1, 1], [1, 1], [0, 1], [0, 1]],
    [[1, 1], [1, 0], [1, 1], [0, 1], [1, 1]], [[1, 1], [1, 0], [1, 1], [1, 1], [1, 1]], [[1, 1], [0, 1], [0, 1], [0, 1], [0, 1]], [[1, 1], [1, 1], [0, 0], [1, 1], [1, 1]], [[1, 1], [1, 1], [1, 1], [0, 1], [1, 1]]
]

function drawDigit2x5(d: number, x: number, brightness: number) {
    for (let y = 0; y < 5; y++)
        for (let dx = 0; dx < 2; dx++)
            if (digits2x5[d][y][dx]) led.plotBrightness(x + dx, y, brightness)
}

function showTwoDigits(num: number) {
    basic.clearScreen()
    let tens = Math.idiv(num, 10) % 10
    let ones = num % 10
    drawDigit2x5(tens, 0, 180)
    drawDigit2x5(ones, 3, 180)
}

// Top bar for menu/game
function drawTopBar(selected: number, total: number, fill = true) {
    for (let i = 0; i < total; i++)
        led.plotBrightness(i, 0, (fill ? i <= selected : i == selected) ? 255 : 20)
}

// === GLOBALS ===
let activeGame = "menu"
let currentGame = 0
let blink = 0
let score = 0
let lives = 3
let playerX = 2

let cactusX = -3, cactusY = 0, cactusW = 0, cactusH = 0, cactusType = 0, jump = 0, height = 0

let starX = 2, starY = 1
let moleX = 2, moleY = 3, moleScored = false;
let invX = 2, invDir = 1, bullX = 0, bullY = 6

let simon: number[] = []
let guessed = 0
let simonReady = false;

let games = ["dino", "catch", "mole", "invader", "simon"]

// === MENU LOOP ===
control.inBackground(function menuLoop() {
    while (true) {
        if (activeGame == "menu") {
            // simple animated preview
            basic.clearScreen()
            drawTopBar(currentGame, games.length, false)
            if (games[currentGame] == "dino") {
                draw(2, 3, 1, 0, 10) // sun
                draw(0, 0, 0, 1, 50) // player
                draw(3, 0, 1, 1, 100); // cactus
            } else if (games[currentGame] == "catch") {
                draw(1, 2, 0, 1, 10)
                led.plot(3, 1);
                led.plot(1, 3); led.plot(2, 4)
            } else if (games[currentGame] == "mole") {
                draw(0, 0, 1, 3, 10)
                draw(3, 0, 1, 3, 10)
                if (blink == 0) led.plot(moleX, moleY);
                blink++;
                if (blink > 5) {
                    blink = 0;
                    moleX = randint(0, 3);
                    if (moleX >= 2) moleX++;
                    moleY = randint(1, 4);
                }
            } else if (games[currentGame] == "invader") {
                invX += invDir
                if (invX <= 0 || invX >= 4) invDir *= -1
                led.plot(invX, 1); led.plot(playerX, 4)
            } else if (games[currentGame] == "simon") {
                if (blink) switch (randint(0, 2)) {
                    case 0:
                        led.plotBrightness(0, 2, 255);
                        break;
                    case 1:
                        led.plotBrightness(4, 2, 255);
                        break;
                    case 2:
                        led.plotBrightness(2, 1, 255);
                        break;
                };
                blink = blink ? 0 : 1;
            }

            basic.pause(300)
        } else {
            basic.pause(100)
        }
    }
})

// === GAME OVER ===
function gameOver() {
    music._playDefaultBackground(music.builtInPlayableMelody(Melodies.PowerDown), music.PlaybackMode.InBackground);
    for (let i = 100; i > 0; i -= 2) {
        draw(0, 0, 4, 4, i);
        pause(10);
    }
    if (score < 100) showTwoDigits(score)
    else while (!input.buttonIsPressed(Button.AB)) basic.showNumber(score);
    while (!input.buttonIsPressed(Button.AB)) pause(100);
    while (input.buttonIsPressed(Button.AB)) pause(20);
    score = 0;
    lives = 3;
    activeGame = "menu"
    simon = [];
    guessed = 0;
    bullY = 6;
    cactusX = -3;
}

// === GAME LOOPS ===
// DINO
control.inBackground(function dinoLoop() {
    while (true) {
        if (activeGame == "dino") {
            basic.clearScreen()
            // jump logic
            if (height > 0 || jump > 0) { height += jump; jump -= 0.1 }
            else if (height < 0) height = 0
            else if (input.buttonIsPressed(Button.A)) jump = 1

            cactusX -= 0.25
            if (cactusX < -10) {
                cactusX = randint(8, 18)
                cactusType = randint(0, 4)
                cactusY = 0
                if (cactusType <= 1) { cactusW = 1; cactusH = 1 }
                else if (cactusType == 2) { cactusW = 0; cactusH = 1 }
                else if (cactusType == 3) { cactusW = 0; cactusH = 2 }
                else if (cactusType == 4) { cactusW = 2; cactusH = 0; cactusY = 2 }
            }

            if (touching(0, height, 0, 1, cactusX, cactusY, cactusW, cactusH)) gameOver()

            draw(2, 3, 1, 1, 10) // sun
            draw(0, height, 0, 1, 50) // player
            if (cactusX > 4) draw(4, cactusY, 0, cactusH, Math.map(cactusX, 4, 8, 50, 0))
            draw(cactusX, cactusY, cactusW, cactusH, 256)

            if (cactusX == 0) {
                score++;
                soundScore();
            }
            basic.pause(20)
        } else basic.pause(100)
    }
})

// CATCH THE STAR
control.inBackground(function catchLoop() {
    while (true) {
        if (activeGame == "catch") {
            basic.clearScreen()
            drawTopBar(lives - 1, 3)
            starY++
            if (starY > 4) {
                if (starX == playerX) score++; else lives--
                starX = randint(0, 4)
                starY = 1
            }
            // if (input.buttonIsPressed(Button.A) && playerX > 0) playerX--
            // if (input.buttonIsPressed(Button.B) && playerX < 4) playerX++
            led.plot(starX, starY)
            led.plot(playerX, 4)
            basic.pause(200)
            if (lives <= 0) gameOver()
        } else basic.pause(100)
    }
})

// WHACK-A-MOLE
control.inBackground(function moleLoop() {
    blink = 5;
    moleScored = true;
    while (true) {
        if (activeGame == "mole") {
            basic.clearScreen()
            draw(0, 0, 1, 3, 10)
            draw(3, 0, 1, 3, 10)
            drawTopBar(lives - 1, 3)
            if (blink < 2) led.plot(moleX, moleY)
            else if (!moleScored) { lives--; moleScored = true; soundDamage() }
            blink++;
            if (blink > 10) {
                blink = 0;
                moleX = randint(0, 3);
                if (moleX >= 2) moleX++;
                moleY = randint(1, 4);
                moleScored = false;
            }
            if (lives <= 0) gameOver()
            basic.pause(300)
        } else basic.pause(100)
    }
})

// SPACE INVADER
control.inBackground(function invaderLoop() {
    while (true) {
        if (activeGame == "invader") {
            basic.clearScreen()
            drawTopBar(lives - 1, 3)
            invX += invDir
            if (invX <= 0 || invX >= 4) invDir *= -1
            bullY++;
            if (bullY > randint(6, 12) && invX == playerX) {
                bullY = 1;
                bullX = invX;
            }
            led.plot(invX, 1)
            led.plot(playerX, 4)
            if (bullY <= 4) led.plotBrightness(bullX, bullY, 20);
            if (bullY == 4 && playerX == bullX) { lives--; soundDamage(); }
            basic.pause(300)
            if (lives <= 0) gameOver()
        } else basic.pause(100)
    }
})

// SIMON
control.inBackground(function invaderLoop() {
    simon = [];
    while (true) {
        if (activeGame == "simon") {
            if (guessed == simon.length) {
                simonReady = false;
                simon.push(randint(0, 2));
                if (guessed > 0) {
                    score += guessed;
                    soundScore();
                    pause(500);
                }
                guessed = 0;
                flashSimonSequence();
                simonReady = true;
            };
            pause(200);
        } else basic.pause(100)
    }
})

function flashSimonSequence() {
    for (let step of simon) {
        basic.clearScreen()
        switch (step) {
            case 0:
                music.play(music.stringPlayable("B", 500), music.PlaybackMode.UntilDone)
                led.plotBrightness(0, 2, 255);
                break;
            case 1:
                music.play(music.stringPlayable("D", 500), music.PlaybackMode.UntilDone)
                led.plotBrightness(4, 2, 255);
                break;
            case 2:
                music.play(music.stringPlayable("F", 500), music.PlaybackMode.UntilDone)
                led.plotBrightness(2, 0, 255);
                break;
        };
        basic.pause(500)
        basic.clearScreen()
        basic.pause(200)
    }
}

function simonInput(button: number) {
    if (!simonReady) return;
    if (button == simon[guessed]) {
        switch (button) {
            case 0:
                music.play(music.stringPlayable("B", 500), music.PlaybackMode.UntilDone)
                led.plotBrightness(0, 2, 255);
                break;
            case 1:
                music.play(music.stringPlayable("D", 500), music.PlaybackMode.UntilDone)
                led.plotBrightness(4, 2, 255);
                break;
            case 2:
                music.play(music.stringPlayable("F", 500), music.PlaybackMode.UntilDone)
                led.plotBrightness(2, 0, 255);
                break;
        };
        simonReady = false;
        basic.pause(500)
        basic.clearScreen()
        guessed++
        simonReady = true;
    } else { soundDamage(); gameOver() }
}

// === INPUT HANDLING FOR MENU ===
input.onButtonPressed(Button.A, function () {
    if (activeGame == "menu") currentGame = (currentGame + games.length - 1) % games.length
    else if (activeGame == "catch" && playerX > 0) playerX--
    else if (activeGame == "invader" && playerX > 0) playerX--
    else if (activeGame == "mole" && moleX < 2) { score++; moleScored = true; blink = 5; soundScore() }
    else if (activeGame == "simon") simonInput(0);
})
input.onButtonPressed(Button.B, function () {
    if (activeGame == "menu") currentGame = (currentGame + 1) % games.length
    else if (activeGame == "catch" && playerX < 4) playerX++
    else if (activeGame == "invader" && playerX < 4) playerX++
    else if (activeGame == "mole" && moleX > 2) { score++; moleScored = true; blink = 5; soundScore() }
    else if (activeGame == "simon") simonInput(1);
})
input.onButtonPressed(Button.AB, function () {
    if (activeGame == "menu") {
        activeGame = games[currentGame]
        score = 0; lives = 3; playerX = 2
    } else if (activeGame == "invader") {
        draw(playerX, 1, 0, 2, 20);
        if (invX == playerX) { score++; invX = randint(1, 3); soundScore() }
    }
    // else if (activeGame == "fishing" && fishX == playerX) { score++; soundScore(); }
})

input.onLogoEvent(TouchButtonEvent.Touched, function () {
    if (activeGame == "simon") return simonInput(2);
    if (activeGame == "menu") return;
    music._playDefaultBackground(music.builtInPlayableMelody(Melodies.PowerDown), music.PlaybackMode.InBackground);
    basic.clearScreen();
    activeGame = "menu";
    pause(100);
    score = 0;
    lives = 3;
})

function soundScore() {
    music._playDefaultBackground(music.builtInPlayableMelody(Melodies.BaDing), music.PlaybackMode.InBackground);
}

function soundDamage() {
    music._playDefaultBackground(music.builtInPlayableMelody(Melodies.JumpDown), music.PlaybackMode.InBackground);
}