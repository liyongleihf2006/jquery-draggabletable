function draggableTable(table,cb) {
    var colLen = function () {
        var firstRow = table.rows[0];
        var cells = firstRow.cells;
        return [].reduce.call(cells, function (result, current) {
            return result + current.colSpan;
        }, 0);
    }();
    var auxiliary = getAuxiliary();
    var totalWidth = auxiliary.totalWidth;
    //最小宽度
    var minPercentage = 20/totalWidth*100;
    var _cols = generateCols();
    var namespace = getNamespace(table);
    relationCol();

    function relationCol() {
        var tHead = table.tHead;
        var tBodies = table.tBodies;
        var tFoot = table.tFoot;
        _relationCol(tHead);
        [].forEach.call(tBodies, _relationCol);
        _relationCol(tFoot);
        function _relationCol(group) {
            if (!group) { return };
            var rows = group.rows;
            var positions = [];
            for (var i = 0; i < rows.length; i++) {
                var cells = rows[i].cells;
                for (var j = 0; j < cells.length; j++) {
                    var cell = cells[j];
                    var colSpan = cell.colSpan;
                    var rowSpan = cell.rowSpan;
                    cell.cols = [];
                    var beginRow = i;
                    var endRow = beginRow + rowSpan - 1;
                    for (var m = beginRow; m <= endRow; m++) {
                        if (!positions[m]) {
                            positions[m] = [];
                        }
                    }
                    var position = positions[i];
                    var beginCol = j;
                    while (position[beginCol]) {
                        beginCol++;
                    }
                    var endCol = beginCol + colSpan - 1;
                    for (var k = beginCol; k <= endCol; k++) {
                        cell.cols.push(k);
                        for (var l = beginRow; l <= endRow; l++) {
                            positions[l][k] = true;
                        }
                    }
                }
            }
        }
    }
    function generateCols() {
        var cellWidths = auxiliary.cellWidths;
        var colgroup = document.createElement("colgroup");
        var cols = [];
        table.insertBefore(colgroup, table.firstChild);
        for (var i = 0; i < cellWidths.length; i++) {
            var cellWidth = cellWidths[i];
            var col = document.createElement("col");
            col.width = cellWidth * 100 / auxiliary.totalWidth + "%";
            cols.push(col);
            colgroup.appendChild(col);
        }
        return cols;
    }
    function getAuxiliary() {
        var auxiliaryTBody = document.createElement("tbody");
        table.insertBefore(auxiliaryTBody, table.firstChild);
        var tr = document.createElement("tr");
        auxiliaryTBody.appendChild(tr);
        for (var i = 0; i < colLen; i++) {
            var td = document.createElement("td");
            tr.appendChild(td);
        }
        var cells = tr.cells;
        var totalWidth = [].reduce.call(cells, function (result, current) {
            return result + current.getClientRects()[0].width;
        }, 0);
        var cellWidths = [];
        for (var i = 0; i < cells.length; i++) {
            var cell = cells[i];
            cellWidths.push(cell.getClientRects()[0].width);
        }
        table.removeChild(auxiliaryTBody);
        return {
            totalWidth: totalWidth,
            cellWidths: cellWidths
        }
    }
    _draggableTable();
    function _draggableTable() {
        var hotArea = 10;
        var isMouseDown = false;
        var draggableCls = "table-draggable";
        var _this;
        var startX;
        var direction;
        var rows = table.tHead.rows;
        var cells;
        var tableWidth = table.getClientRects()[0].width;
        var currentCell;
        var currentWidth;
        var _colWidths = [];
        var totalWidth;
        $(table).on("mousedown", "th,td", function (e) {
            _this = this;
            direction = getPosition(this, e);
            if (direction === "left" || direction === "right") {
                isMouseDown = true;
                $(this).addClass(draggableCls);
                startX = e.clientX;
                currentCell = this;
                currentWidth = this.getClientRects()[0].width;
                _colWidths.length = 0;
                _cols.forEach(function (_col) {
                    var width = parseFloat(_col.width);
                    _colWidths.push(width);
                });
                totalWidth = table.rows[0].getClientRects()[0].width;
            }
        })
            .on("mousemove", "th,td", function (e) {
                var _direction = getPosition(this, e);
                if (_direction !== "center") {
                    $(this).addClass(draggableCls);
                } else {
                    $(this).removeClass(draggableCls);
                }
            });
        $(document.documentElement).off("mouseup" + namespace).on("mouseup" + namespace, function (e) {
            if (isMouseDown) {
                isMouseDown = false;
                $(this).removeClass(draggableCls);
            }
        }).off("mousemove" + namespace).on("mousemove" + namespace, function (e) {
            if (isMouseDown) {
                $(this).addClass(draggableCls);
                var clientX = e.clientX;
                var offsetX = clientX - startX;
                setPercentage(offsetX);
                cb.call(table);
            }
        })
        /**
        * @return 拖拽的位置
        *  "left" 在单元格左边
        *  "right" 在单元格右边
        *  "center" 在单元格中间
        */
        function getPosition(dom, e) {
            var cols = dom.cols;
            var firstCol = cols[0];
            var lastCol = cols[cols.length - 1];
            if (e.offsetX < hotArea && firstCol) {
                return "left";
            } else if (dom.getClientRects()[0].width - e.offsetX < hotArea && lastCol < colLen - 1) {
                return "right";
            }
            return "center";
        }
        function setPercentage(offsetX) {
            var cols = currentCell.cols;
            var adjacentCols = [];
            if (direction === "left") {
                var percentage = - offsetX * 100 / totalWidth;
                for(var i = 0;i<cols[0];i++){
                    adjacentCols.push(i);
                }
            } else if (direction === "right") {
                var percentage = offsetX * 100 / totalWidth;
                var adjacentCols = cols.slice(cols[cols.length - 1]+1);
                for(var i = cols[cols.length-1]+1;i<colLen;i++){
                    adjacentCols.push(i);
                }
            }
            var proportion = getProportion(cols);
            for (var i = 0; i < cols.length; i++) {
                var col = cols[i];
                var _col = _cols[col];
                _col.width = proportion[i] * percentage + _colWidths[col] + "%";
                if(parseFloat(_col.width)<minPercentage){
                    _col.width = minPercentage+"%";
                }
            }
            var adjacentProportion = getProportion(adjacentCols);
            for (var i = 0; i < adjacentCols.length; i++) {
                var col = adjacentCols[i];
                var _col = _cols[col];
                _col.width = -adjacentProportion[i] * percentage + _colWidths[col] + "%";
                if(parseFloat(_col.width)<minPercentage){
                    _col.width = minPercentage+"%";
                }
            }
        }
        function getProportion(cols) {
            var total = 0;
            var result = [];
            for (var i = 0; i < cols.length; i++) {
                var col = cols[i];
                total += _colWidths[col];
            }
            for (var i = 0; i < cols.length; i++) {
                var col = cols[i];
                var width = _colWidths[col];
                result.push(width / total);
            }
            return result;
        }
    }
    function getNamespace(dom){
        var namespace = [];
        _getNamespace(dom);
        namespace.reverse();
        return "._"+namespace.join(" ");
        function _getNamespace(dom){
            var tagName = dom.tagName;
            var id = dom.id;
            if(id){
                id="#"+id;
            }
            var className = (dom.getAttribute("class")||"").replace(/\s+/g,".");
            if(className){
                className="."+className;
            }
            var index = ":nth-child("+($(dom).index()+1)+")";
            namespace.push(tagName+id+className+index);
            if(dom.parentElement){
                _getNamespace(dom.parentElement);
            }
        }
        
    }
}