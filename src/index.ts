
const isMobile = true // /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

enum STATES { standby, game, gameOver }
enum TetriminoTypes { I, J, L, O, S, T, Z }

type Point = { x : number, y : number }
type Tetrimino =
    { x : number
    , y : number
    , type : TetriminoTypes
    , points : Point[]
    }

const canvas = document.getElementById('canvas')! as HTMLCanvasElement
const msgPrompt = document.getElementById('msg-prompt')!
const ctx = canvas.getContext('2d')!
const W = 10
const H = 20
const BASE_TICK = 1000
const PRESSING = { none: 0, left: 1, up: 2, right: 4, down: 8, 'rotate-left': 16, 'rotate-right': 32, swap: 64 } as const
const KeyMap = { a: 'left', w: 'up', d: 'right', s: 'down', q: 'rotate-left', e: 'rotate-right' } as const
const TetriminoShapes : Record<TetriminoTypes, Point[]> = 
    { [TetriminoTypes.I]: [[-1,0],[0,0],[1,0],[2,0]].map(([x,y]) => ({ x, y }))
    , [TetriminoTypes.J]: [[-1,0],[0,0],[1,0],[-1,1]].map(([x,y]) => ({ x, y }))
    , [TetriminoTypes.L]: [[-1,0],[0,0],[1,0],[1,1]].map(([x,y]) => ({ x, y }))
    , [TetriminoTypes.O]: [[0,0],[1,0],[0,1],[1,1]].map(([x,y]) => ({ x, y }))
    , [TetriminoTypes.S]: [[-1,0],[0,0],[0,1],[1,1]].map(([x,y]) => ({ x, y }))
    , [TetriminoTypes.T]: [[-1,0],[0,0],[0,1],[1,0]].map(([x,y]) => ({ x, y }))
    , [TetriminoTypes.Z]: [[0,0],[1,0],[0,1],[-1,1]].map(([x,y]) => ({ x, y }))
    } as const
const TetriminoColors : Record<TetriminoTypes, string> = 
    { [TetriminoTypes.I]: 'red'
    , [TetriminoTypes.J]: 'blue'
    , [TetriminoTypes.L]: 'green'
    , [TetriminoTypes.O]: 'purple'
    , [TetriminoTypes.S]: 'orange'
    , [TetriminoTypes.T]: 'gold'
    , [TetriminoTypes.Z]: 'teal'
    } as const
const newBlockGrid = () => [...Array(H)].map(_ => [...Array(W)]) as (string | null)[][]
const game =
    { state: STATES.standby
    , pressing: PRESSING.none
    , currentBlock: randomBlock()
    , upcomingBlock: randomBlock()
    , lastTick: 0
    , pixelSize: 0
    , blockGrid: newBlockGrid()
    , score: 0
    , totalClearedLines: 0
    }

main: {
    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    const btns = document.getElementById('mobile-btns')!
    btns.style.display = isMobile
        ? 'block'
        : 'none'
        
    if (isMobile)
    {
        const leftBtn = document.getElementById('left-btn')!
        const rightBtn = document.getElementById('right-btn')!
        const upBtn = document.getElementById('up-btn')!
        const downBtn = document.getElementById('down-btn')!
        const rotateBtn = document.getElementById('rotate-btn')!
        const swapBtn = document.getElementById('swap-btn')!
        const btnss = [leftBtn,rightBtn,upBtn,downBtn,rotateBtn,swapBtn]
        positionTheButtons: {
            const W = window.innerWidth
            const w3 = W/6
            const base = w3 * .875
            leftBtn.style.left = `${base | 0}px`
            leftBtn.style.top  = `${base + w3| 0}px`

            rightBtn.style.left = `${base + w3 * 2 | 0}px`
            rightBtn.style.top  = `${base + w3 | 0}px`

            upBtn.style.left = `${base + w3 | 0}px`
            upBtn.style.top  = `${base | 0}px`
            
            downBtn.style.left = `${base + w3 | 0}px`
            downBtn.style.top  = `${base + w3 * 2| 0}px`

            rotateBtn.style.left = `${base + w3 * 3| 0}px`
            rotateBtn.style.top  = `${base + w3 * 2| 0}px`

            swapBtn.style.left = `${base + w3 * 3| 0}px`
            swapBtn.style.top  = `${base | 0}px`

            btnss.forEach(b => b.style.fontSize = `${Math.max(16, base * 0.75 |0)}px`)
        }
        const btnIdMap =
            { le: PRESSING.left
            , ri: PRESSING.right
            , up: PRESSING.up
            , do: PRESSING.down
            , ro: PRESSING["rotate-left"]
            , sw: PRESSING.swap
            }
        
        btns.onmousedown = (e) => {
            console.log('yo')
            const btn = e.target as HTMLElement
            const btnId = btn.id.slice(0,2) as 'le'
            if (!btnIdMap[btnId]) return
            game.pressing |= btnIdMap[btnId]
            controlCurrentBlock()
        } 

        btns.onmouseup = (e) => {
            // console.log('up') 
            // return;
            const btn = e.target as HTMLElement
            const btnId = btn.id.slice(0,2) as 'le'
            console.log('btnid =',btnId)
            if (!btnIdMap[btnId]) return console.log('im here')
            game.pressing &= ~btnIdMap[btnId]
        }
    }
}
function updateDimensions() {
    game.pixelSize = Math.min(window.innerWidth / W, window.innerHeight / H)
    canvas.style.width = `${canvas.width = game.pixelSize * W}px`
    canvas.style.height = `${canvas.height = game.pixelSize * H}px`
    ctx.font = '15px Arial'
    render()
}

function render() {
    const functions =
        { [STATES.standby]:  standby
        , [STATES.game]:     tetris
        , [STATES.gameOver]: gameOver 
        }
    msgPrompt.innerText = ''
    functions[game.state]()
}




document.onmousedown = () => {
    if (game.state !== STATES.game)
    {
        const stateMap =
            { [STATES.standby] : STATES.game
            , [STATES.gameOver] : STATES.standby
            }
        game.state = stateMap[game.state]
        requestAnimationFrame(render)
        return
    }
}

document.onkeydown = e => {
    if (game.state !== STATES.game)
    {
        const stateMap =
            { [STATES.standby] : STATES.game
            , [STATES.gameOver] : STATES.standby
            }
        game.state = stateMap[game.state]
        requestAnimationFrame(render)
        return
    }
    const key = e.key.toLowerCase() as keyof typeof KeyMap
    if (!KeyMap[key]) return
    game.pressing |= PRESSING[KeyMap[key]]
    controlCurrentBlock()
}

document.onkeyup = e => {
    const key = e.key.toLowerCase() as keyof typeof KeyMap
    if (!KeyMap[key]) return
    game.pressing &= ~PRESSING[KeyMap[key]]
}



function standby() {
    console.log('isMobile =',isMobile)
    msgPrompt.innerText = isMobile
        ? 'TAP TO PLAY'
        : `PRESS ANY KEY TO PLAY
        Keys: W, A, S, D, Q, E`
    ctx.clearRect(0, 0, canvas.width, canvas.height)
}

function tetris() {
    const t = Date.now()
    game.lastTick || (game.lastTick = t)

    tickCurrentBlock(t)
    clearScreen()
    drawBlocks()
    drawScore()
    requestAnimationFrame(render)
}

function gameOver() {
    msgPrompt.innerText = 'GAME OVER'
    game.blockGrid = newBlockGrid()
    game.score = game.totalClearedLines = 0
}

function tickCurrentBlock(t : number) {
    const dt = t - game.lastTick
    const level = game.totalClearedLines / 10 | 0
    const tick = BASE_TICK - level * 50 // Level 20 is the theoretical maximum.
    if (dt >= tick)
    {
        game.lastTick = t
        game.currentBlock.y++
        if (collisionExists())
        {
            game.currentBlock.y--
            nextBlock()
        }
    }
}

function clearScreen() {
    ctx.fillStyle = 'black'
    ctx.beginPath()
    ctx.rect(0, 0, canvas.width, canvas.height)
    ctx.fill()
    ctx.closePath()
    ctx.clearRect(0, 0, W * game.pixelSize, H * game.pixelSize)
}

function drawBlocks() {
    ctx.strokeStyle = 'white'
    drawBlock(game.currentBlock)
    drawUpcomingBlock(game.upcomingBlock)
    for (let r = 0; r < H; r++)
    {
        for (let c = 0; c < W; c++)
        {
            const color = game.blockGrid[r][c]
            if (color)
            {
                ctx.fillStyle = color
                pixel(c, r)
            }
        }
    }

    function drawBlock(b : Tetrimino) {
        ctx.fillStyle = TetriminoColors[b.type]
        b.points.forEach(({ x, y }) => pixel(b.x + x, b.y + y))
    }

    function drawUpcomingBlock(b : Tetrimino) {
        const dx = (W - 2) * game.pixelSize
        const dy = game.pixelSize
        ctx.translate(dx, dy)
        ctx.scale(0.5, 0.5)
        ctx.fillStyle = TetriminoColors[b.type]
        b.points.forEach(({ x, y }) => pixel(x, y))
        ctx.scale(2, 2)
        ctx.translate(-dx, -dy)
    }
}

function drawScore() {
    const level = game.totalClearedLines / 10 | 0
    const L = Math.max(0, 255 - level * 10)
    ctx.fillStyle = 'white'
    ctx.fillText(`Score: ${game.score}`, 5, 20)
    ctx.fillStyle = `rgb(255,${L},${L})`
    ctx.fillText(`Level ${level}`, 5, 40)
}

function collisionExists() {
    const xs = game.currentBlock.points.map(({ x }) => x)
    const ys = game.currentBlock.points.map(({ y }) => y)
    const { x, y } = game.currentBlock
    const minX = Math.min(...xs) + x
    const maxX = Math.max(...xs) + x
    const maxY = Math.max(...ys) + y
    
    if (minX < 0 || maxX >= W || maxY >= H)
    {
        return true
    }
    return game.currentBlock.points.some(p => {
        const row = game.blockGrid[y + p.y]
        return row && row[x + p.x] != null
    })
}

function nextBlock() {
    const { x, y, type } = game.currentBlock
    const minY = Math.min(...game.currentBlock.points.map(({ y }) => y)) + y
    if (minY < 0)
    {
        game.state = STATES.gameOver
        requestAnimationFrame(render)
        return
    }
    const color = TetriminoColors[type]
    game.currentBlock.points.forEach(p =>
        game.blockGrid[y + p.y] &&
        (game.blockGrid[y + p.y][x + p.x] = color))
    game.currentBlock = game.upcomingBlock
    game.upcomingBlock = randomBlock()
    clearCompletedLines()
}

function controlCurrentBlock() {
    const block = game.currentBlock
    const oldX = block.x
    const oldY = block.y
    const oldPoints = block.points

    game.pressing & PRESSING["rotate-left"] && rotateCurrentBlock(true)
    game.pressing & PRESSING["rotate-right"] && rotateCurrentBlock(false)
    game.pressing & PRESSING.left && block.x--
    game.pressing & PRESSING.right && block.x++
    game.pressing & PRESSING.down && block.y++

    if (game.pressing & PRESSING.swap)
    {
        const newPoints = game.upcomingBlock.points
        const newType = game.upcomingBlock.type
        const oldPoints = block.points
        const oldType = block.type
        block.points = newPoints
        block.type = newType
        game.upcomingBlock.type = oldType
        game.upcomingBlock.points = oldPoints
        return
    }

    if (game.pressing & PRESSING.up)
    {
        while (!collisionExists())
        {
            block.y++
        }
        block.y--
    }
    
    if (collisionExists())
    {
        block.x = oldX
        block.y = oldY
        block.points = oldPoints
    }
}

function rotateCurrentBlock(clockwise : boolean) {
    const b = game.currentBlock
    const transform = (x : number, y : number) => clockwise
        ? { x: y, y: -x }
        : { x: -y, y: x }
    const newPoints = b.points.map(({ x, y }) => transform(x, y))
    b.points = newPoints
}

function randomBlock() : Tetrimino {
    const types = Object.keys(TetriminoShapes) as unknown as TetriminoTypes[]
    const type = types[Math.random() * types.length | 0]
    return (
        { x: W / 2 | 0
        , y: -2
        , type
        , points: TetriminoShapes[type]
        })
}

function clearCompletedLines() {
    const lines = new Set<number>()
    for (let r = 0; r < H; r++)
    {
        if (game.blockGrid[r].every(x => x))
        {
            lines.add(r)
        }
    }
    if (!lines.size) return

    const lastLevel = game.totalClearedLines / 10 | 0

    game.totalClearedLines += lines.size
    game.blockGrid = [...Array(lines.size)].map(_ => [...Array(W)])
        .concat(game.blockGrid.filter((_,r) => !lines.has(r)))

    const getScore = (n : number) => [0, 40, 100, 300, 1200].map(x => x * (n + 1))
    const level = game.totalClearedLines / 10 | 0

    if (level > lastLevel)
    {
        const bg = document.getElementById('bg')!
        bg.style.filter = 
            `contrast(35%) blur(2px) brightness(40%) hue-rotate(${360 * Math.random() | 0}deg)`
        bg.style.backgroundPosition = 
            `${Math.random() * 100 | 0}% ${Math.random() * 100 | 0}%`
    }

    game.score += getScore(level)[lines.size] // lines.size * W * 2 // Each tile is worth two points
}

function pixel(x : number, y : number) {
    const s = game.pixelSize
    ctx.beginPath()
    ctx.rect(x * s, y * s, s, s)
    ctx.fill()
    ctx.stroke()
    ctx.closePath()
}

export {}