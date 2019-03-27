jsPsych.plugins["pong"] = (function() {
  var plugin = {};

  plugin.info = {
    name: 'pong',
    parameters: {
      //humanPaddleSize:
      /*levelNumber: {
        type:jsPsych.plugins.parameterType.INT
      },
      */
    }
  }

  plugin.trial = function(display_element, trial) {
    var par = trial
    //var w=par.gameWidth, h=par.gameHeight;
    display_element.innerHTML =
    "<div id='gameContainer' style='position: absolute; top: 50%; left: 50%; margin-right:50%; transform: translate(-50%, -50%); height: " + gameHeight + "px; width: " + gameWidth + "px; vertical-align: middle'>" +
    //"<!-background image:--><img src='robomb-pngs/floor.png' height='" + h + "' width='" + w + "' style='position:absolute; margin:auto; z-index:-100'></img>" +
    "<!--main canvas where game happens:-->" +
    "<canvas id='mainCanvas' height='" + gameHeight + "' width = '" + gameWidth + "'></canvas>"
    +
    "<!--overlay canvas that doesn't need to be refreshed constantly:-->" +
    "<canvas id='overlay' style='position:absolute; left: 0; top: 0; z-index:4' height='" + gameHeight + "' width = '" + gameWidth + "'></canvas>"

    function Ball(x,y, isBackground){
      //x,y is top-left corner of rectangle representing this ball. size is the length of all the sides of this rectangle (it's a square)
      this.x = x
      this.y = y
      this.size = 20
      this.isBackground = isBackground

      //initialize with random velocity but par.ballSpeed speed
      //velocity can't be entirely random: we don't want it to close to vertical at the beginning; constrain it to +-(angles between pi/4 and -pi/4)
      var random1orNeg1 = Math.random() > 0.5 ? -1 : 1
      var randomAngleInRange = Math.PI/4-Math.random()*Math.PI/2
      this.xVelocity = random1orNeg1 * Math.cos(randomAngleInRange)*par.ballSpeed
      this.yVelocity = random1orNeg1 * Math.sin(randomAngleInRange)*par.ballSpeed

      if(isBackground === true){
        this.color = "grey"
      } else{
        this.color = "white";
      }
      this.randomlyShiftDirection = function(){
        //maintain speed but randomly increment velocity
        var randomAngle = Math.random()*2*Math.PI
        this.xVelocity = par.ballSpeed*Math.cos(randomAngle)
        this.yVelocity = par.ballSpeed*Math.sin(randomAngle)
      }
    }

    function Model(difficulty){
      //human paddle
      this.hPaddle = new HumanPaddle(gameHeight/2, 10, 100)
      //ai paddle
      this.aiPaddle = new AIPaddle(gameHeight/2, 10, 100)
      this.ball = new Ball(gameWidth/2, gameHeight/2)
      this.backgroundBall = new Ball(gameWidth/2, gameHeight/2, true)
      this.checkForCollisions = function(){
        var balls = [this.ball, this.backgroundBall]
        for(var i=0; i<balls.length;i++){
          var b = balls[i]
        //if it collides with AI paddle
        if(b.isBackground != true && b.x <= this.aiPaddle.width && b.y + b.size >= this.aiPaddle.y && b.y <= this.aiPaddle.y+this.aiPaddle.length){
          b.x = this.aiPaddle.width
          this.handleCollision(b, this.aiPaddle)
          //if it collides with left wall
        } else if(b.x <= 0){
          b.x = 0//reset it to 0 in case it went past so it doesn't collide weirdly
          this.handleCollision(b, null, "left")
          //if it collides with human paddle
        } else if(b.isBackground != true && b.x+b.size >= gameWidth-this.hPaddle.width && b.y +b.size >= this.hPaddle.y && b.y <= this.hPaddle.y+this.hPaddle.length){
          b.x = gameWidth-this.hPaddle.width-b.size
          this.handleCollision(b, this.hPaddle)
          //with right wall
        } else if(b.x+b.size >= gameWidth){
          b.x = gameWidth-b.size
          this.handleCollision(b, null, "right")
          //top wall
        } else if(b.y <=0){
          b.y=0
          this.handleCollision(b, null, "top")
          //bottom
        } else if(b.y + b.size >= gameHeight){
          b.y=gameHeight-b.size
          this.handleCollision(b, null, "bottom")
        }
      }

      }
      this.handleCollision = function(ball, paddle, wall){
        if(wall == "top" || wall == "bottom"){
          ball.yVelocity *=-1
        } else if(paddle != null){
          ball.xVelocity *=-1
        } else if(wall == "left"){
          ball.xVelocity*=-1
          if(ball.isBackground != true){
            controller.humanWon();
          }
        } else if(wall == "right"){
          ball.xVelocity *=-1
          if(ball.isBackground != true){
            controller.aiWon();
          }
        }
      }
      this.update = function(){
        this.checkForCollisions();
        //shift direction every once in a while:
        if(Math.random() > 0.98){
        this.backgroundBall.randomlyShiftDirection()
      }
        var balls = [this.ball, this.backgroundBall]
        for(var i=0; i<balls.length;i++){
          var b = balls[i]
          b.x+=b.xVelocity;
          b.y+=b.yVelocity;
        }
      }

    }

    function View(){
      this.mainctx = document.getElementById("mainCanvas").getContext("2d");
      this.drawBorders = function(){
        var mctx = this.mainctx
        //draw borders
        mctx.beginPath()
        mctx.fillStyle = "white"
        mctx.rect(0,0, 1, gameHeight)
        mctx.rect(0,0, gameWidth, 1)
        mctx.rect(0, gameHeight-1, gameWidth, 1)
        mctx.rect(gameWidth-1, 1, 1, gameHeight)
        mctx.fill()
        mctx.textAlign = "center"
        mctx.font = "54px Courier New"
        mctx.fillText('PONG', gameWidth/2, 56)
        mctx.closePath()

      }
      this.drawBall = function(theBall){
        var mctx = this.mainctx
        var b = theBall

        mctx.beginPath()
        mctx.fillStyle = b.color
        mctx.rect(b.x, b.y, b.size, b.size)
        mctx.fill()
        mctx.closePath()
        console.log(b)
      }
      this.drawHumanPaddle = function(){
        var mctx = this.mainctx
        var p = model.hPaddle
        mctx.beginPath()
        mctx.fillStyle = "#"+((1<<24)*Math.random()|0).toString(16) //random color, from ZPiDER's answer at https://stackoverflow.com/questions/1484506/random-color-generator
        mctx.rect(gameWidth-p.width, p.y, p.width, p.length)
        mctx.fill()
        mctx.closePath()
      }
      this.drawAIPaddle = function(){
        var mctx = this.mainctx
        var p = model.aiPaddle
        mctx.beginPath()
        mctx.fillStyle = "#"+((1<<24)*Math.random()|0).toString(16) //random color, from ZPiDER's answer at https://stackoverflow.com/questions/1484506/random-color-generator
        mctx.rect(0, p.y, p.width, p.length)
        mctx.fill()
        mctx.closePath()
      }
      this.update = function(){
        var m = this.mainctx
        m.clearRect(0,0,gameWidth, gameHeight)
        this.drawBorders()
        this.drawBall(model.ball)
        this.drawBall(model.backgroundBall)
        this.drawHumanPaddle()
        this.drawAIPaddle()
      }


    }
    function Controller(){
      //when the mouse is moved, tell the human paddle to change position
      document.addEventListener("mousemove", function(event){
        var gameRect = document.getElementById("gameContainer").getBoundingClientRect()
        var mouseYInGameCoord = event.clientY - gameRect.top
        //0 is upper boundary for paddle position
        if(mouseYInGameCoord < 0){mouseYInGameCoord = 0}
        //gameHeight-paddle.length is lower boundary
        if(mouseYInGameCoord + model.hPaddle.length > gameHeight){mouseYInGameCoord = gameHeight - model.hPaddle.length}
        //move the human paddle
        model.hPaddle.updatePosition(mouseYInGameCoord)

      })

      //create a custom event to move the paddle. to be consistent, ai and human paddles alike should be moved by events
      //there could be multiple events on a setInterval so the motion is more variable, not just linear
      document.addEventListener("aiMove", function(event){model.aiPaddle.updatePosition(event.moveToY)}, false)

      this.AI = {
        paddle: model.aiPaddle,
        ball:model.ball,
        //function to determine where the AI should move to (the point where the ball is set to intersect the left wall)
        getIntersection: function(){
          var ballWallDistance = this.ball.x //aipaddle is on left (x=0)
          //intersection of ball and left wall will be a point in a triangle from the ball, to the point where it intersects the left wall, to the point (ball.x, 0)
          //the ratio of the left side of triangle to the bottom side of triangle = the ratio of ball.yVelocity to ball.xVelocity
          var leftToBottomRatio = this.ball.yVelocity/this.ball.xVelocity
          var leftSideLength = ballWallDistance*leftToBottomRatio
          var intersectionYCoord = this.ball.y+leftSideLength
          return intersectionYCoord
        },
        meetBall: /*given the ball's position and velocity (included in the ball object), move the paddle so it will eventually hit the ball:*/function(ball){
            var moveEvent = new Event("aiMove")
            var nextY = controller.AI.calculateNextY();
            moveEvent.moveToY = nextY
            document.dispatchEvent(moveEvent)
        },

        nextYToMoveTo: model.aiPaddle.y,
        calculateNextY: function(){
          //make paddle movement smooth; gradually move to intersection point (and maybe make mistakes?)
          var y = this.paddle.y + (this.ball.y - this.paddle.y)^4
          //0 is upper boundary for paddle position
          if(y < 0){y = 0}
          //gameHeight-paddle.length is lower boundary
          if(y + model.aiPaddle.length > gameHeight){y = gameHeight - model.aiPaddle.length}

          return y
        }


      }

      this.humanWon = function(){
        alert("You beat this AI...but can you beat the robot apocolypse?")
      }

      this.aiWon = function(){
        alert("You suck")
      }
    }

    function HumanPaddle(yCoord, width, length){
      this.width = width*par.humanPaddleSize
      this.length = length*par.humanPaddleSize

      this.y = yCoord

      this.updatePosition = function(newY){
        this.y = newY
      }

    }

    function AIPaddle(yCoord, width, length){
      this.width = width*par.aiPaddleSize
      this.length = length*par.aiPaddleSize

      this.y = yCoord

      this.updatePosition = function(newY){
        this.y = newY
        //alert('s')
      }

    }

    function updateGame(currentTime){
      //curLevel.curTime = currentTime
      //if(!stopping){
      window.requestAnimationFrame(function(){
          model.update()
          view.update()
          controller.AI.meetBall()
          window.requestAnimationFrame(updateGame)
      })
      //}
    }

    function beginGame(){
      updateGame()
    }
    var model = new Model();
    var view = new View();
    var controller = new Controller();
    beginGame();
  }

  return plugin;
})();
