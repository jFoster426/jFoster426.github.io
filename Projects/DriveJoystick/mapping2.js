function mapping2(x, y) {
    var rr = Math.min(x*x + y*y, 1);
    var c;
    var L, R;
    if (rr === 0.0) {
        c = 0;
    } else {
        c = rr / (Math.abs(x) + Math.abs(y));
    }
    L = c*y - c*x;
    R = c*y + c*x;
    return [L, R];
}