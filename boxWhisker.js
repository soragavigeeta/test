const MEAN_WHISKER = 1;

let WIDTH = 1000;
let HEIGHT = 400;
let BAR_PADDING = 10;


let DATA_VALUE = 20;
let BAR_WIDTH = WIDTH / DATA_VALUE - BAR_PADDING;
let boxPlotData = [];
let SVG;
let AXIS_G = null;
let AXIS_TOP_G = null;
let X_SCALE;
let Y_SCALE;
let WIDTH_SCALE;
let AXIS_LEFT;
let AXIS_TOP;
let CHECKED = false;
let SELECTED = false;
let dShape;


let groupCounts = {};
let globalCounts = [];


let MARGIN = { top: 20, right: 0, bottom: 20, left: 10 };


WIDTH = WIDTH - MARGIN.left - MARGIN.right;
HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom;


let TOTAL_WIDTH = WIDTH + MARGIN.left + MARGIN.right;
let TOTAL_HEIGHT = HEIGHT + MARGIN.top + MARGIN.bottom;

//Define div for tool tip
let TOOLTIP = d3.select('body')
    .append('div')
    .attr('class', 'tooltip')
    .style('opacity', 0);


/*let update = (value) => {
    for (let index = 0; index < horizontalLineConfigs.length; index++) {
        let lineConfig = horizontalLineConfigs[index];
        if (index === MEAN_WHISKER) {
            if(circle !== undefined){
                g.selectAll('circle').remove();
            }
            circle = g.selectAll('.circles')
                .data(boxPlotData)
                .enter()
                .append('circle')
                .attr('cx', lineConfig.x1)
                .attr('cy', lineConfig.y2)
                .attr('r', 2)
                .attr('fill', '#4d0000')
                .attr('opacity', value)
                .on('mouseover', () => {
                    customShowMeanVal(0.9)
                })
                .on('mousemove', (data) => {
                    if (d3.select('#mean').property('checked')) {
                        TOOLTIP.html("<strong>Mean:</strong><span style='color:#b2d651'>" + data.quartile[1] + "</span>")
                            .style('left', (d3.event.pageX) + 'px')
                            //.style('top', (d3.event.pageY - 50) + 'px');
                            .style('top', (d3.event.pageY - 30) + 'px');
                    } else {
                        customShowMeanVal(0);
                    }
                })
                .on('mouseout', () => {
                    customShowMeanVal(0);
                })
        }
    }

};*/

let update = () => {
    if(dShape){
        g.selectAll('path').exit().remove();
    }
    let midVal = WIDTH_SCALE(BAR_WIDTH/2);
    let diamond = d3.symbol().size(20).type(d3.symbolDiamond);
    dShape = g.selectAll('.path').data(boxPlotData)
        .enter()
        .append('path')
        .attr('transform', function(data) {
            return 'translate(' + (X_SCALE(data.key) + midVal) + ',' +  Y_SCALE(data.quartile[3])  + ')';
        })
        .attr('d', function() {
            return diamond();
        })
        .attr('fill', '#4e70f9')
        .on('mouseover', () => {
            customShowMeanVal(0.9)
        })
        .on('mousemove', (data) => {
            if (d3.select('#mean').property('checked')) {
                TOOLTIP.html("<strong>Mean: </strong><span style='color:#b2d651'>" + data.quartile[3] + "</span>")
                    .style('left', (d3.event.pageX) + 'px')
                    .style('top', (d3.event.pageY - 30) + 'px');
            } else {
                customShowMeanVal(0);
            }
        })
        .on('mouseout', () => {
            customShowMeanVal(0);
        });

};




let generateDataVal = () => {
    // Generate five 100 count, normal distributions with random means
    return new Promise((resolve, reject) => {
        let meanGenerator = d3.randomUniform(10);
        if(meanGenerator === null){
            reject()
        }
        for (let i = 0; i < DATA_VALUE; i++) {
            let randomMean = meanGenerator();
            let generator = d3.randomNormal(randomMean);
            let key = i.toString();
            groupCounts[key] = [];
            for (let j = 0; j < 100; j++) {
                let entry = generator();
                groupCounts[key].push(entry);
                globalCounts.push(entry);
            }
        }
        resolve();
    });
};

let sortGrpCounts = () => {
    return new Promise((resolve) => {
        // Sort group counts so quantile methods work
        for (let key in groupCounts) {
            let groupCount = groupCounts[key];
            groupCounts[key] = groupCount.sort(sortNumber);
        }
        resolve();
    })
};

let COLOR_SCALE = d3.scaleOrdinal(d3.schemeCategory20)
    .domain(Object.keys(groupCounts));

let getBoxPlotData = (SELECTED) => {
    // Prepare the data for the box plots
    return new Promise((resolve) => {
        console.log('BoxPlotDataInvoked');
        var localMin, localMax;

        for (let [key, groupCount] of Object.entries(groupCounts)) {
            let record = {};
            let trimmed_groupCount = groupCount;
            //Calculate the whiskers based on check and un check of whisker box
            //Consider lower as 10% and higher as 90% if box is checked
            if(SELECTED){
                let percentage = (trimmed_groupCount.length * 10)/100;
                trimmed_groupCount.splice(0,percentage);
                trimmed_groupCount.splice(-percentage);
                console.log('Trimmed Length: ' +trimmed_groupCount.length);
                localMin = d3.min(trimmed_groupCount);
                localMax = d3.max(trimmed_groupCount);
            }else{
                localMin = d3.min(groupCount);
                localMax = d3.max(groupCount);
            }


            record.key = key;
            record.counts = groupCount;
            record.quartile = boxQuartiles(groupCount);
            record.whiskers = [localMin, localMax];
            record.color = COLOR_SCALE(key);
            boxPlotData.push(record);
            setXScale();
            setYScale();
            setWidthScale();
            setAxisLeft();
            setAxisTop();
        }
        resolve();
    })
};


let setXScale = () => {
    X_SCALE = d3.scalePoint()
        .domain(Object.keys(groupCounts))
        .rangeRound([0, WIDTH])
        .padding([0.5]);
};



let setYScale = () => {
    let min = d3.min(globalCounts);
    let max = d3.max(globalCounts);
    Y_SCALE = d3.scaleLinear()
        .domain([min, max])
        .range([0, HEIGHT]);
};



let setWidthScale = () => {
    WIDTH_SCALE = d3.scaleLinear()
        .domain([0, WIDTH / DATA_VALUE])
        .rangeRound([0, 30]);
};


// Setup the SVG and group we will draw the box plot in
SVG = d3.select('body').append('svg')
    .attr('width', TOTAL_WIDTH)
    .attr('height', TOTAL_HEIGHT)
    .append('g')
    .attr('transform', 'translate(' + MARGIN.left + ',' + MARGIN.top + ')');

d3.select('#mean').on('change', () => {
    CHECKED = !CHECKED;
    update(CHECKED ? 1 : 0);
});

d3.select('#percentile').on('change', () => {
   SELECTED = !SELECTED;
    getBoxPlotData(SELECTED ? 1 : 0).then(()=>{

    });
});

// Move the left axis over 25 pixels, and the top axis over 35 pixels
AXIS_G = SVG.append('g').attr('transform', 'translate(25,0)');
AXIS_TOP_G = SVG.append('g').attr('transform', 'translate(35,0)');

// Setup the group the box plot elements will render in
let g = SVG.append('g')
    .attr('transform', 'translate(5,5)');

//Draw functions  
let drawVerticalLines = () => {
    return new Promise((resolve) => {
        // Draw the box plot vertical lines
        resolve(g.selectAll('.verticalLines')
            .data(boxPlotData)
            .enter()
            .append('line')
            .attr('x1', (data) => {
                return X_SCALE(data.key) + WIDTH_SCALE(BAR_WIDTH) / 2;
            })
            .attr('y1', (data) => {
                var whisker = data.whiskers[0];
                return Y_SCALE(whisker);
            })
            .attr('x2', (data) => {
                return X_SCALE(data.key) + WIDTH_SCALE(BAR_WIDTH) / 2;
            })
            .attr('y2', (data) => {
                var whisker = data.whiskers[1];
                return Y_SCALE(whisker);
            })
            .attr('stroke', '#000')
            .attr('stroke-width', 1)
            .attr('fill', 'none'));
    })
};

let drawRects = () => {
    let promise = [];
    // Draw the boxes of the box plot, filled in white and on top of vertical lines
    new Promise((resolve, reject) => {
        let p1 = promise.push(g.selectAll('.rect')
            .data(boxPlotData)
            .enter()
            .append('rect')
            .attr('width', () => {
                return WIDTH_SCALE(BAR_WIDTH);
            })
            .attr('height', (data) => {
                let quartiles = data.quartile;
                let height = Y_SCALE(quartiles[1]) - Y_SCALE(quartiles[0]);
                return height;
            })
            .attr('x', (data) => {
                return X_SCALE(data.key);
            })
            .attr('y', (data) => {
                return Y_SCALE(data.quartile[0]);
            })
            .attr('fill', (data) => {
                data.color = "#58AC9A";
                let shadedColor = lightenDarkenColor(data.color,50);
                return shadedColor;
            })
            .attr('stroke', '#000')
            .attr('stroke-width', 1));

        let p2 = promise.push(g.selectAll('.rect1')
            .data(boxPlotData)
            .enter()
            .append('rect')
            .attr('width', () => {
                return WIDTH_SCALE(BAR_WIDTH);
            })
            .attr('height', (data) => {
                let quartiles = data.quartile;
                let height = Y_SCALE(quartiles[2]) - Y_SCALE(quartiles[0]);
                return height;
            })
            .attr('x', (data) => {
                return X_SCALE(data.key);
            })
            .attr('y', (data) => {
                return Y_SCALE(data.quartile[1]);
            })
            .attr('fill', (data) => {
                data.color = "#58AC9A";
                return data.color;
            })
            .attr('stroke', '#000')
            .attr('stroke-width', 1));

        Promise.all([p1,p2]);
    });
};

let lightenDarkenColor =  (col, amt) => {
    let usePound = false;
    if (col[0] == "#") {
        col = col.slice(1);
        usePound = true;
    }
    let num = parseInt(col, 16);
    let r = (num >> 16) + amt;
    if (r > 255) {
        r = 255;
    } else if (r < 0) {
        r = 0;
    }
    let b = ((num >> 8) & 0x00FF) + amt;
    if (b > 255) {
        b = 255;
    } else if (b < 0) {
        b = 0;
    }
    let g = (num & 0x0000FF) + amt;
    if (g > 255) {
        g = 255;
    } else if (g < 0) {
        g = 0;
    }
    return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16);
};


// Now render all the horizontal lines at once - the whiskers and the median
let horizontalLineConfigs = [
    // Top whisker
    {
        x1: (data) => { return X_SCALE(data.key) },
        y1: (data) => { return Y_SCALE(data.whiskers[0]) },
        x2: (data) => { return X_SCALE(data.key) + WIDTH_SCALE(BAR_WIDTH) },
        y2: (data) => { return Y_SCALE(data.whiskers[0]) }
    },
    // Median line
    {
        x1: (data) => { return X_SCALE(data.key)},
        y1: (data) => { return Y_SCALE(data.quartile[1]) },
        x2: (data) => { return X_SCALE(data.key) + WIDTH_SCALE(BAR_WIDTH) },
        y2: (data) => { return Y_SCALE(data.quartile[1]) },
    },
    // Bottom whisker
    {
        x1: (data) => { return X_SCALE(data.key) },
        y1: (data) => { return Y_SCALE(data.whiskers[1]) },
        x2: (data) => { return X_SCALE(data.key) + WIDTH_SCALE(BAR_WIDTH) },
        y2: (data) => { return Y_SCALE(data.whiskers[1]) }
    }
];



let drawHorizontalLines = () => {
    return new Promise((resolve) => {
        for (let i = 0; i < horizontalLineConfigs.length; i++) {
            let lineConfig = horizontalLineConfigs[i];
            resolve(g.selectAll('.whiskers')
                .data(boxPlotData)
                .enter()
                .append('line')
                .attr('x1', lineConfig.x1)
                .attr('y1', lineConfig.y1)
                .attr('x2', lineConfig.x2)
                .attr('y2', lineConfig.y2)
                .attr('stroke', '#000')
                .attr('stroke-width', 1)
                .attr('fill', 'none'));
        }
    });
};

let setAxisLeft = () => {
    AXIS_LEFT = d3.axisLeft(Y_SCALE);
    AXIS_G.append('g')
        .call(AXIS_LEFT);
};

let setAxisTop = () => {
    AXIS_TOP = d3.axisTop(X_SCALE);
    AXIS_TOP_G.append('g')
        .call(AXIS_TOP);
};


let customShowMeanVal = (opacity) => {
    TOOLTIP.transition()
        .duration(200)
        .style('opacity', opacity)
};

let boxQuartiles = (d) => {
    return [
        d3.quantile(d, .25),
        d3.quantile(d, .5),
        d3.quantile(d, .75),
        d3.mean(d)
    ];
};


// Perform a numeric sort on an array
let sortNumber = (a, b) => {
    return a - b;
};

let promise = generateDataVal().then(() => {
    return sortGrpCounts();
}).then(() => {
    return getBoxPlotData();
}).then(() => {
    return drawVerticalLines();
}).then(() => {
    return drawRects();
}).then(() => {
    return drawHorizontalLines();
});


