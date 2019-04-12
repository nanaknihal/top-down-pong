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
    document.body.style.cursor="none"
    var par = trial
    var gameWidth=par.gameWidth, gameHeight=par.gameHeight
    var maxBouncesOnHumanSide = par.tutorial ? 21 : Math.floor(par.ballSpeed/1.7)
    var introTextStopTime = 3000
    var questionAsked = false
    var questionAnswered = false
    var bouncesSinceQuestionAsked = 0
    var data = {
      parameters: par,
      collected: {
        humanScore: 0,
        aiScore: 0,
        guess: ''
      }}
    display_element.innerHTML =
    "<div id='gameContainer' style='position: absolute; top: 50%; left: 50%; margin-right:50%; transform: translate(-50%, -50%); height: " + gameHeight + "px; width: " + gameWidth + "px; vertical-align: middle'>" +
    //"<!-background image:--><img src='robomb-pngs/floor.png' height='" + h + "' width='" + w + "' style='position:absolute; margin:auto; z-index:-100'></img>" +
    "<!--main canvas where game happens:-->" +
    "<canvas id='mainCanvas' height='" + gameHeight + "' width = '" + gameWidth + "'></canvas>"
    +
    "<!--overlay canvas that doesn't need to be refreshed constantly:-->" +
    "<canvas id='overlay' style='position:absolute; left: 0; top: 0; z-index:4' height='" + (gameHeight*1.2) + "' width = '" + gameWidth + "'></canvas>"

    var beginTime = Date.now()
    function Ball(x,y, isBackground){
      //x,y is top-left corner of rectangle representing this ball. size is the length of all the sides of this rectangle (it's a square)
      this.x = x
      this.y = y
      this.size = 20
      this.isBackground = isBackground
      //hide it if it's the tutorial's background ball
      this.hidden = par.tutorial ? isBackground : false
      //initialize with random velocity but par.ballSpeed speed
      //velocity can't be entirely random: we don't want it to close to vertical at the beginning; constrain it to +-(angles between pi/4 and -pi/4)
      var random1orNeg1 = Math.random() > 0.5 ? -1 : 1
      var randomAngleInRange = Math.PI/4-Math.random()*Math.PI/2
      this.xVelocity = random1orNeg1 * Math.cos(randomAngleInRange)*par.ballSpeed
      this.yVelocity = random1orNeg1 * Math.sin(randomAngleInRange)*par.ballSpeed

      if(isBackground === true){
        this.color = par.ballColors[1]
      } else{
        this.color = par.ballColors[0]
      }
      this.randomlyShiftDirection = function(){
        //maintain speed but randomly increment velocity
        var randomAngle = Math.random()*2*Math.PI
        this.xVelocity = par.ballSpeed*Math.cos(randomAngle)
        this.yVelocity = par.ballSpeed*Math.sin(randomAngle)
      }
    }

    function Model(difficulty){
      this.bouncesOnHumanSideSoFar = 0
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
          //if it's half the total bounces and the question hasn't been asked, ask it every so often (at every 5th bounce)
          if(this.bouncesOnHumanSideSoFar >= Math.floor(maxBouncesOnHumanSide / 2) && !questionAsked){controller.askQuestion(); questionAsked=true}

          //if it's the tutorial, introduce a new ball at maxBouncesOnHumanSide / 4
          if(this.bouncesOnHumanSideSoFar >= Math.floor(maxBouncesOnHumanSide / 4) && model.backgroundBall.hidden){
            alert("Each real level will have a background ball. You can ignore this as much as you want; your task is only playing with the target.")
            model.backgroundBall.hidden = false
          }
        }

        if((ball.isBackground != true) && wall == "right" || paddle === model.hPaddle){
          model.bouncesOnHumanSideSoFar++
        }
      }
      this.update = function(){
        this.checkForCollisions();
        if(par.randomBackgroundBallMotion){
          if(Math.random() > 0.98){
            this.backgroundBall.randomlyShiftDirection()
          }
        }
        //shift direction every once in a while:
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
        mctx.closePath()

      }
      this.drawUpperText = function(){
        var mctx = this.mainctx
        mctx.beginPath()
        mctx.fillStyle = "white"
        mctx.textAlign = "center"
        mctx.font = "54px Courier New"
        //draw "PONG" for 2 seconds
        if(Date.now() - beginTime < 2000){
          mctx.fillText('PONG', gameWidth/2, 56)
        } else {
          mctx.fillText(data.collected.aiScore+'|'+data.collected.humanScore, gameWidth/2, 56)
        }
        mctx.closePath()
      }
      this.drawBall = function(theBall){
        if(!theBall.hidden){
          var mctx = this.mainctx
          var b = theBall

          mctx.beginPath()
          mctx.fillStyle = b.color
          mctx.rect(b.x, b.y, b.size, b.size)
          mctx.fill()
          //notify the user where target is for first 2 seconds:
          if(Date.now() - beginTime < introTextStopTime && !b.isBackground){
            mctx.fillStyle="white"
            mctx.font = "13px Courier New"
            mctx.fillText("target", b.x-10, b.y-10)
          }
          mctx.closePath()
      }

      }
      this.drawHumanPaddle = function(){
        var mctx = this.mainctx
        var p = model.hPaddle
        mctx.beginPath()
        mctx.fillStyle = "white"//"#"+((1<<24)*Math.random()|0).toString(16) //random color, from ZPiDER's answer at https://stackoverflow.com/questions/1484506/random-color-generator
        mctx.rect(gameWidth-p.width, p.y, p.width, p.length)
        mctx.fill()
        if(Date.now() - beginTime < 2000){
          mctx.font = "13px Courier New"
          mctx.fillText("your paddle", gameWidth-100, p.y+p.length/2)
        }
        mctx.closePath()
      }
      this.drawAIPaddle = function(){
        var mctx = this.mainctx
        var p = model.aiPaddle
        mctx.beginPath()
        mctx.fillStyle = "white"//"#"+((1<<24)*Math.random()|0).toString(16) //random color, from ZPiDER's answer at https://stackoverflow.com/questions/1484506/random-color-generator
        mctx.rect(0, p.y, p.width, p.length)
        mctx.fill()
        mctx.closePath()
      }
      this.update = function(){
        var m = this.mainctx
        m.clearRect(0,0,gameWidth, gameHeight)

        this.drawUpperText()
        this.drawBorders()
        this.drawBall(model.ball)
        this.drawBall(model.backgroundBall)
        this.drawHumanPaddle()
        this.drawAIPaddle()
      }
      //function to ask the user which ball is going faster
      this.askQuestion = function(){
        var overlay = document.getElementById("overlay")
        var octx = overlay.getContext("2d")

        octx.beginPath()
        octx.fillStyle = "white"
        octx.textAlign = "center"
        octx.font = "17px Courier New"

        if(par.tutorial){alert("Now, please press the key corresponding to which ball is moving faster, as soon as you can make a guess, but don't stop playing. HINT: keep your left hand on the 1,2, and 3 keys")}
        octx.fillText("Choose the faster ball:", gameWidth/2, overlay.height*0.22)
        questionHeight = overlay.height*0.85

        var boxToTextDist = 50
        var firstBoxX = gameWidth/4
        var secondBoxX = gameWidth/2
        var thirdBoxX = gameWidth*0.75
        var textOffsetHeight = 15
        octx.beginPath()
        octx.fillStyle = model.ball.color
        octx.rect(firstBoxX, questionHeight, model.ball.size, model.ball.size)
        octx.fill()
        octx.fillText("1", firstBoxX + boxToTextDist, questionHeight + textOffsetHeight)

        octx.beginPath()
        octx.fillStyle = model.backgroundBall.color
        octx.rect(secondBoxX, questionHeight, model.backgroundBall.size, model.backgroundBall.size)
        octx.fill()
        octx.fillText("2", secondBoxX + boxToTextDist, questionHeight+textOffsetHeight)

        octx.beginPath()
        octx.fillStyle = '#797979'
        octx.rect(thirdBoxX, questionHeight, model.backgroundBall.size, model.backgroundBall.size)
        octx.fill()
        octx.fillText("neither 3", thirdBoxX + boxToTextDist + 25, questionHeight+textOffsetHeight)

        octx.closePath()

        //"press a key corresponding to which ball is moving faster: 1=target, 2=background, 3=neither"
        octx.closePath()
      }

      this.removeQuestion = function(){
        //for now, just clear the context since nothing is occupying it other than the question
        var overlay = document.getElementById("overlay")
        var octx = overlay.getContext("2d")
        octx.clearRect(0,0,overlay.width,overlay.height)
      }


    }
    function Controller(){
      if(par.keyboardControl){
        document.addEventListener("keydown", arrowKeyPressed)
      }
      if(par.mouseControl){
        //when the mouse is moved, tell the human paddle to change position
        document.addEventListener("mousemove", mouseMoved)
      }


      //create a custom event to move the paddle. to be consistent, ai and human paddles alike should be moved by events
      //there could be multiple events on a setInterval so the motion is more variable, not just linear
      document.addEventListener("aiMove", aiMoved)


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
          var y = this.paddle.y + ((this.ball.y - (this.paddle.y+this.paddle.length/2))/9)^3
          //0 is upper boundary for paddle position
          if(y < 0){y = 0}
          //gameHeight-paddle.length is lower boundary
          if(y + model.aiPaddle.length > gameHeight){y = gameHeight - model.aiPaddle.length}

          return y
        }


      }

      this.humanWon = function(){
        data.collected.humanScore++
      }

      this.aiWon = function(){
        data.collected.aiScore++
      }

      this.askQuestion = function(){
        document.addEventListener('keydown', controller.registerAnswer)
        view.askQuestion()
        }

      this.registerAnswer = function(event){
        switch(event.key){
          case '1':
            data.collected.guess = '1'
            document.removeEventListener('keydown', controller.registerAnswer)
            questionAnswered = true
            view.removeQuestion()
            break;
          case '2':
            data.collected.guess = '2'
            document.removeEventListener('keydown', controller.registerAnswer)
            questionAnswered = true
            view.removeQuestion()
            break;
          case '3':
            data.collected.guess = '3'
            document.removeEventListener('keydown', controller.registerAnswer)
            questionAnswered = true
            view.removeQuestion()
            break;
        }
      }

    }

    function HumanPaddle(yCoord, width, length){
      this.width = width
      this.length = length*par.humanPaddleSize

      this.y = yCoord

      this.updatePosition = function(newY){
        this.y = newY
      }

      this.movingUp = false
      this.movingDown = false

      this.moveUp = function(){
        this.movingUp = true
          requestAnimationFrame(function(){
            if(model.hPaddle.movingUp == true){

              //only move it to the edge, no further
              var moveIncrement = 10
              if(model.hPaddle.y - moveIncrement < 0){
                model.hPaddle.y = 0
              } else{
                model.hPaddle.y -= moveIncrement
              }

              window.requestAnimationFrame(model.hPaddle.moveUp)
            }
          })

        document.addEventListener("keyup", function(){
          model.hPaddle.movingUp = false
        })
      }
      this.moveDown = function(){
        this.movingDown = true
          requestAnimationFrame(function(){
            if(model.hPaddle.movingDown == true){

              //only move it to the edge, no further
              var moveIncrement = 10
              if(model.hPaddle.y + model.hPaddle.length + moveIncrement > gameHeight){
                model.hPaddle.y = gameHeight-model.hPaddle.length
              } else{
                model.hPaddle.y += moveIncrement
              }
              window.requestAnimationFrame(model.hPaddle.moveDown)
            }
          })

        document.addEventListener("keyup", function(){
          model.hPaddle.movingDown = false
        })
      }

    }

    function AIPaddle(yCoord, width, length){
      this.width = width*par.aiPaddleSize
      this.length = length*par.aiPaddleSize

      this.y = yCoord

      this.updatePosition = function(newY){
        this.y = newY
      }

    }

    /*These 3 functions should be in controller but need to exist when a Controller is initialized, so are separate:*/
    arrowKeyPressed = function(event){
      if(event.key == "ArrowUp" && !model.hPaddle.movingUp){
        model.hPaddle.moveUp()
      } else if(event.key == "ArrowDown" && !model.hPaddle.movingDown){
        model.hPaddle.moveDown()
      }
    }

    mouseMoved = function(event){
      var gameRect = document.getElementById("gameContainer").getBoundingClientRect()
      var mouseYInGameCoord = event.clientY - gameRect.top
      //0 is upper boundary for paddle position
      if(mouseYInGameCoord < 0){mouseYInGameCoord = 0}
      //gameHeight-paddle.length is lower boundary
      if(mouseYInGameCoord + model.hPaddle.length > gameHeight){mouseYInGameCoord = gameHeight - model.hPaddle.length}
      //move the human paddle
      model.hPaddle.updatePosition(mouseYInGameCoord)

    }

    aiMoved = function(event){model.aiPaddle.updatePosition(event.moveToY)}

    /**/

    function updateGame(currentTime){
      //curLevel.curTime = currentTime
      //if(!stopping){
      window.requestAnimationFrame(function(){
          model.update()
          view.update()
          controller.AI.meetBall()
          /*end the game after sufficient player-side bounces - note if efficiency is an issue, the
          following if statement can be moved to Controller as part of a new function controller.handleBounce(),
          which could be called from the wall==right condition in  model.handleCollision().
          This works currently and is organized so there's no need to change it*/
          if(model.bouncesOnHumanSideSoFar  >= maxBouncesOnHumanSide){
            delete(model)
            delete(view)
            delete(controller)
            document.body.style.cursor="default"
            jsPsych.finishTrial(data)

            //this will clear any remnant event listeners:
            document.removeEventListener("keydown", arrowKeyPressed)
            document.removeEventListener("mousemove", mouseMoved)
            document.removeEventListener("aiMove", aiMoved)
          } else{
          window.requestAnimationFrame(updateGame)
        }
      })
      //}
    }

    function showTutorialMessage(){
      alert("Use the cursor to move the paddle. Yours is the right one and you're playing with the 'target' ball. But the 'target' label will go away soon as to not interfere with gameplay")
    }

    function beginGame(){
      /*if(par.tutorial){
        setTimeout(showTutorialMessage, 2300)
      }*/
      updateGame()
    }
    var model = new Model();
    var view = new View();
    var controller = new Controller();
    beginGame();
  }

  return plugin;
})();
