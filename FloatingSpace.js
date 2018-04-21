﻿/*
The Floating Space is the place where floating elements like balls, live and are rendered.
This space has its own physics which helps with the animation of these objects and also preventing them to overlap.
*/

let balls;                          // This is the array of balls being displayed

function newFloatingSpace() {

    let thisObject = {
        physicsLoop: physicsLoop,
        isInside: isInside,
        isInsideBall: isInsideBall,
        balls: [],   // <-- TODO: Check if this is really needed here. 
        initialize: initialize
    };

    return thisObject;

    function initialize() {

        balls = []; // We initialize this in order to start the calculations in a clean way.
    
    }

    function physicsLoop() {

        /* This function makes all the calculations to apply phisycs on all objects in this space. */

        for (let i = 0; i < balls.length; i++) {

            let ball = balls[i];

            /* Change position based on speed */

            ball.currentPosition.x = ball.currentPosition.x + ball.currentSpeed.x;
            ball.currentPosition.y = ball.currentPosition.y + ball.currentSpeed.y;

            /* Apply some friction to desacelerate */

            ball.currentSpeed.x = ball.currentSpeed.x * ball.friction;  // Desaceleration factor.
            ball.currentSpeed.y = ball.currentSpeed.y * ball.friction;  // Desaceleration factor.

            // Gives a minimun speed towards their taget.

            if (ball.currentPosition.x < ball.targetPosition.x) {
                ball.currentSpeed.x = ball.currentSpeed.x + .005;
            } else {
                ball.currentSpeed.x = ball.currentSpeed.x - .005;
            }

            if (ball.currentPosition.y < ball.targetPosition.y) {
                ball.currentSpeed.y = ball.currentSpeed.y + .005;
            } else {
                ball.currentSpeed.y = ball.currentSpeed.y - .005;
            }

            // The radius also have a target.

            if (ball.currentRadius < ball.targetRadius) {
                ball.currentRadius = ball.currentRadius + .5;
            } else {
                ball.currentRadius = ball.currentRadius - .5;
            }

            /* Collision Control */

            for (let k = i + 1; k < balls.length; k++) {

                if (colliding(balls[i], balls[k])) {

                    resolveCollision(balls[k], balls[i]);

                }
            }

            /* Calculate repulsion force produced by all other balls */

            repulsionForce(i);

            gravityForce(ball);

        }

        /* Finally we draw all the balls. */

        for (let i = 0; i < balls.length; i++) {
            let ball = balls[i];
            ball.drawBackground();
        }

        for (let i = 0; i < balls.length; i++) {
            let ball = balls[balls.length - i - 1];
            //let ball = balls[i];
            ball.drawForeground();
        }
    }

    /******************************************/
    /*                                        */
    /*        Physics Engine Follows          */
    /*                                        */
    /******************************************/

    function gravityForce(ball) {

        /* We simulate a kind of gravity towards the target point of each ball. This force will make the ball to keep pushing to reach that point. */

        const coulomb = .00001;
        const minForce = 0.01;

        var d = Math.sqrt(Math.pow(ball.targetPosition.x - ball.currentPosition.x, 2) + Math.pow(ball.targetPosition.y - ball.currentPosition.y, 2));  // ... we calculate the distance ...

        var force = coulomb * d * d / ball.currentMass;  // In this case the mass of the ball affects the gravity force that it receives, that gives priority to target position to bigger balls. 

        if (force < minForce) { // We need this attraction force to overcome the friction we imposed to the system.
            force = minForce;
        }

        var pos1 = {
            x: ball.currentPosition.x,
            y: ball.currentPosition.y
        };

        var pos2 = {
            x: ball.targetPosition.x,
            y: ball.targetPosition.y
        };

        var posDiff = {             // Next we need the vector resulting from the 2 positions.
            x: pos2.x - pos1.x,
            y: pos2.y - pos1.y
        };

        var unitVector = {          // To find the unit vector, we divide each component by the magnitude of the vector.
            x: posDiff.x / d,
            y: posDiff.y / d
        };

        var forceVector = {
            x: unitVector.x * force,
            y: unitVector.y * force
        };

        /* We add the force vector to the speed vector */

        ball.currentSpeed.x = ball.currentSpeed.x + forceVector.x;
        ball.currentSpeed.y = ball.currentSpeed.y + forceVector.y;

    }

    function repulsionForce(currentBall) {

        /* We generate a repulsion force between balls, that prevents them to be collisioning so often. */

        const coulomb = 2;

        var ball1 = balls[currentBall];

        for (var i = 0; i < balls.length; i++) {  // The force to be applied is considering all other balls...

            if (i !== currentBall) {  // ... except for the current one. 

                var ball2 = balls[i];   // So, for each ball...

                var d = Math.sqrt(Math.pow(ball2.currentPosition.x - ball1.currentPosition.x, 2) + Math.pow(ball2.currentPosition.y - ball1.currentPosition.y, 2));  // ... we calculate the distance ...

                var force = coulomb * ball2.currentMass / (d * d);  // ... and with it the repulsion force.

                /* We need to put a hard limit to this force, in order to to eject very little balls to the infinite and beyond. */

                if (force > 1) {
                    force = 1;
                }

                var pos1 = {
                    x: ball1.currentPosition.x,
                    y: ball1.currentPosition.y
                };

                var pos2 = {
                    x: ball2.currentPosition.x,
                    y: ball2.currentPosition.y
                };

                var posDiff = {             // Next we need the vector resulting from the 2 positions.
                    x: pos2.x - pos1.x,
                    y: pos2.y - pos1.y
                };

                var unitVector = {          // To find the unit vector, we divide each component by the magnitude of the vector.
                    x: posDiff.x / d,
                    y: posDiff.y / d
                };

                var forceVector = {
                    x: unitVector.x * force,
                    y: unitVector.y * force
                };

                /* We substract the force vector to the speed vector of the current ball */

                ball1.currentSpeed.x = ball1.currentSpeed.x - forceVector.x;
                ball1.currentSpeed.y = ball1.currentSpeed.y - forceVector.y;

            }

        }

    }

    function colliding(ball1, ball2) {
        /* This function detects weather 2 balls collide with each other. */

        var r1 = ball1.currentRadius;
        var r2 = ball2.currentRadius;

        var distance = Math.sqrt(Math.pow(ball2.currentPosition.x - ball1.currentPosition.x, 2) + Math.pow(ball2.currentPosition.y - ball1.currentPosition.y, 2));

        if (distance > (r1 + r2)) {
            // No solutions, the circles are too far apart.  
            return false;
        }
        else if (distance <= r1 + r2) {
            // One circle contains the other.
            return true;
        }
        else if ((distance === 0) && (r1 === r2)) {
            // the circles coincide.
            return true;
        }
        else return true;
    }

    function isInside(x, y) {

        /* This function detects weather the point x,y is inside any of the balls. */

        for (var i = 0; i < balls.length; i++) {
            var ball = balls[i];
            var distance = Math.sqrt(Math.pow(ball.currentPosition.x - x, 2) + Math.pow(ball.currentPosition.y - y, 2));

            if (distance < ball.currentRadius) {
                return i;
            }
        }
        return -1;

    }

    function isInsideBall(ballIndex, x, y) {

        /* This function detects weather the point x,y is inside one particular balls. */


        var ball = balls[ballIndex];
        var distance = Math.sqrt(Math.pow(ball.currentPosition.x - x, 2) + Math.pow(ball.currentPosition.y - y, 2));

        if (distance < ball.currentRadius) {
            return true;
        }

        return false;

    }

    function distance(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }

    function resolveCollision(ball1, ball2) {

        /* This function changes speed and position of balls that are in collision */

        var collisionision_angle = Math.atan2((ball2.currentPosition.y - ball1.currentPosition.y), (ball2.currentPosition.x - ball1.currentPosition.x));

        var speed1 = Math.sqrt(ball1.currentSpeed.x * ball1.currentSpeed.x + ball1.currentSpeed.y * ball1.currentSpeed.y);  // Magnitude of Speed Vector for ball 1
        var speed2 = Math.sqrt(ball2.currentSpeed.x * ball2.currentSpeed.x + ball2.currentSpeed.y * ball2.currentSpeed.y);  // Magnitude of Speed Vector for ball 2

        var direction_1 = Math.atan2(ball1.currentSpeed.y, ball1.currentSpeed.x);
        var direction_2 = Math.atan2(ball2.currentSpeed.y, ball2.currentSpeed.x);

        var new_xspeed_1 = speed1 * Math.cos(direction_1 - collisionision_angle);
        var new_yspeed_1 = speed1 * Math.sin(direction_1 - collisionision_angle);
        var new_xspeed_2 = speed2 * Math.cos(direction_2 - collisionision_angle);
        var new_yspeed_2 = speed2 * Math.sin(direction_2 - collisionision_angle);

        var final_xspeed_1 = ((ball1.currentMass - ball2.currentMass) * new_xspeed_1 + (ball2.currentMass + ball2.currentMass) * new_xspeed_2) / (ball1.currentMass + ball2.currentMass);
        var final_xspeed_2 = ((ball1.currentMass + ball1.currentMass) * new_xspeed_1 + (ball2.currentMass - ball1.currentMass) * new_xspeed_2) / (ball1.currentMass + ball2.currentMass);
        var final_yspeed_1 = new_yspeed_1;
        var final_yspeed_2 = new_yspeed_2;

        var cosAngle = Math.cos(collisionision_angle);
        var sinAngle = Math.sin(collisionision_angle);

        ball1.currentSpeed.x = cosAngle * final_xspeed_1 - sinAngle * final_yspeed_1;
        ball1.currentSpeed.y = sinAngle * final_xspeed_1 + cosAngle * final_yspeed_1;

        ball2.currentSpeed.x = cosAngle * final_xspeed_2 - sinAngle * final_yspeed_2;
        ball2.currentSpeed.y = sinAngle * final_xspeed_2 + cosAngle * final_yspeed_2;

        var pos1 = {
            x: ball1.currentPosition.x,
            y: ball1.currentPosition.y
        };

        var pos2 = {
            x: ball2.currentPosition.x,
            y: ball2.currentPosition.y
        };

        // get the mtd
        var posDiff = {
            x: pos1.x - pos2.x,
            y: pos1.y - pos2.y
        };

        var d = Math.sqrt(Math.pow(ball2.currentPosition.x - ball1.currentPosition.x, 2) + Math.pow(ball2.currentPosition.y - ball1.currentPosition.y, 2));

        // minimum translation distance to push balls apart after intersecting
        var scalar = (((ball1.currentRadius + ball2.currentRadius) - d) / d);

        var minTD = {
            x: posDiff.x * scalar,
            y: posDiff.y * scalar
        };

        // resolve intersection --
        // computing inverse mass quantities
        var im1 = 1 / ball1.currentMass;
        var im2 = 1 / ball2.currentMass;

        // push-pull them apart based off their mass

        pos1.x = pos1.x + minTD.x * (im1 / (im1 + im2));
        pos1.y = pos1.y + minTD.y * (im1 / (im1 + im2));
        pos2.x = pos2.x - minTD.x * (im2 / (im1 + im2));
        pos2.y = pos2.y - minTD.y * (im2 / (im1 + im2));

        ball1.currentPosition = pos1;
        ball2.currentPosition = pos2;
    }
}


