function mapping1(x, y) {
    if (x === 0 && y === 0) return [0, 0]; // Special case
    const r = Math.hypot(x, y);
    const a = 2 / r;

    var motorL, motorR;

    if(x >= 0 && y <= 0) {
	    motorL = -r;
	    motorR = -r + (a * x*x);
    }
    if(x <= 0 && y <= 0) {
	    motorL = -r + (a * x*x);
        motorR = -r;
    }
    if(x >= 0 && y >= 0) {
        motorL = r - (a * x*x);
        motorR = r;
    }
    if(x <= 0 && y >= 0) {
        motorL = r;
    	motorR = r - (a * x*x);
    }
    return [motorL, motorR];
}