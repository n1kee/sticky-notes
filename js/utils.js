
function checkRectanglesOverlap(rect1, rect2) {
    // Resize a rectangle.
    [rect1, rect2] = [rect1, rect2].map(rect => {
        const scaleDiff = 1 - (rect.scale || 1);
        const widthChange = scaleDiff * rect.width;
        const heightChange = scaleDiff * rect.height;
        rect.x += widthChange / 2;
        rect.y += heightChange / 2;
        rect.width -= widthChange;
        rect.height -= heightChange;
        return rect;
    });

    const checkHasCross = (segment1, segment2) => {
        const hasCross = (seg1, seg2) => {
            return !!seg1.find(offset => {
                return (- Math.sign(offset - seg2[0])) === Math.sign(offset - seg2[1]);
            })
        };
        return hasCross(segment1, segment2) || hasCross(segment2, segment1);
    };
    const crossOnX = checkHasCross(
        [
            rect1.x,
            rect1.x + rect1.width,
        ], [
            rect2.x,
            rect2.x + rect2.width,
        ]
    );
    const crossOnY = checkHasCross(
        [
            rect1.y,
            rect1.y + rect1.height,
        ], [
            rect2.y,
            rect2.y + rect2.height,
        ]
    );
    return crossOnX && crossOnY;
}
