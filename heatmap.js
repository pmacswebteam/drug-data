const $heatmap_container = $('#heatmap');
const heatmap_directory = $heatmap_container.data('heatmapDir');
const heatmap_file = heatmap_directory + 'main.csv';

d3.csv(heatmap_file).then(function(data) {

    data.forEach(function(d) {
        
        d = toFloats(d);

        // organize the information about the drug into one property 
        //to make it easier to segregate from the data on the cells
        d.info = {
            'pathway_sort' : [d['sort number']],
            'cmpd' : [d.cmpd_name, d.cmpd_number],
            'primary_target' : [d['Primary Target']],
            'pathway' : [d.Pathway],
        };
        
        // delete the original info from the row so that 
        //we can control it's display separately
        delete d.cmpd_number;
        delete d.cmpd_name;
        delete d['sort number'];
        delete d['Primary Target'];
        delete d.Pathway;
    });
    
    var table = d3.select("#heatmap").append("table");
    
    var header = table.append("thead").append("tr");
    var tableHeaders = Object.keys(data[0]);
    var sortTypes = [];
    
    for (var i = 0; i < tableHeaders.length; i++) {
        // remove the 'info' key from the table headers since 
        // we will add from it what we want to show manually
        if (tableHeaders[i] == 'info') {
            tableHeaders.splice(i, 1);
        } else {
            sortTypes.push('float');
        }
    }
    
    // add in table headers do display drug info
    // "yes" for Pathway Sort is for marking it as the default sort column
    tableHeaders.unshift(["Pathway Sort", "yes"], "Pathway", "Target", "Compound Name");
    sortTypes.unshift('int', 'string', 'string', 'string');
    
    header
        .selectAll("th")
        .data(tableHeaders)
        .enter()
        .append("th")
        .attr("class", "rotate")
        .attr("data-sort-onload", function (d) {
            if (Array.isArray(d)) {
                return d[1];
            }
        })
        .append("div")
        .append("span")
        .text(function (d) {
            if (Array.isArray(d)) {
                return d[0];
            } else {
                return d;
            }
        });
        
    var tBody = table.append("tbody");
    
    var rows = tBody.selectAll("tr")
        .data(data)
        .enter()
        .append("tr")
        .attr("class", function(d) {
            return d.info.row_class;
        })
        
    var color = d3.scaleLinear()
            .domain([0, 25])
            .range(["#12bab8","#e63f3b"])
            .interpolate(d3.interpolateHcl);
        
    var cells = rows
        .selectAll("td")
        .data(function (d) {
            return getRowValues(d);
        })
        .enter()
        .append("td")
        .attr("data-sort-value", function(d) {
            //console.log(d);
            if (d[1]) {
                return d[1];
            }
        })
        .attr("data-cell_line", function (d) {
            if (d[3]) {
                return d[3];
            }
        })
        .attr("data-cmpd", function (d) {
            if (d[4]) {
                return d[4];
            }
        })
        .attr("data-cmpd_number", function (d) {
            if (d[2]) {
                return d[2];
            }
        })
        .attr("data-ic50", function (d) {
            if (d[0] && !isNaN(d[0])) {
                return d[0];
            }
        })
        .on("click", function () {
            showGraph(this);
        })
        .attr("class", function (d) {
            // add a class so that the colored cells can be styled 
            //differently than the rest of the table
            if (d.length > 1) {
                return "heatmap__cell--" + typeof d[0];
            }
        })
        .style("background-color", function (d, i) {
            if (d.length > 1) {
                return color(d[0]);
            }
        })
        .append("span")
        .text(function (d) {
            if (Array.isArray(d)) {
                return d[0];
            } else {
                return d;
            }
            
        });
        
    // add data-sort to the table headers and use the stupid table plugin to enable sorting
    d3.select("#heatmap")
        .selectAll("th")
        .data(sortTypes)
        .attr("data-sort", function (d) {
            return d;
        });
    $("table").stupidtable();
    
    $('#heatmap-search').hideseek();
    
    $('#heatmap .fa-spinner').hide();


});

function getRowValues(d) {
    var values = [d.info.pathway_sort, d.info.pathway, d.info.primary_target, d.info.cmpd];
    return values.concat(getObjValuesAsArray_compounds(d));
}

// put the values of an an object into an array as long as the values are not objects themselves
// excludes the 'info' property of the row objects
function getObjValuesAsArray_compounds (o) {
    var arr = [];
    Object.keys(o).forEach(function(k) {
        if (typeof o[k] !== 'object') {
            // create an array for each cell
            // value, sort value, cell line, compound name
            var cell = [o[k], null, o.info.cmpd[1], k, o.info.cmpd[0]];
            arr.push(cell);
        } 
    });
    return arr;
}

function getObjValuesAsArray (o) {
    var arr = [];
    Object.keys(o).forEach(function(k) {
        arr.push(o[k]);
    });
    return arr;
}

/* convert all of the properties of an object
 * to a number unless they will be NaN (not a number)
 * so that they can be sorted properly in the table
 */
function toFloats(o) {
    Object.keys(o).forEach(function (k) {
        var s = o[k];
        if (isNaN(+o[k])) {
            o[k] = s;
        } else {
            o[k] = +o[k];
        }
    });
    return o;
}

function showGraph (cell) {
    //remove previously created graph
    d3.select('#dose-graph').selectAll("*").remove();
    if (cell.dataset.cell_line && cell.dataset.cmpd_number && cell.dataset.ic50) {
        drawGraph (cell.dataset.cell_line.trim(), cell.dataset.cmpd_number.trim(), cell.dataset.ic50.trim());
        $('#dose-graph-wrapper').modal();
    }
}

// line chart example: https://bl.ocks.org/gordlea/27370d1eea8464b04538e6d8ced39e89
// rounding information: https://github.com/d3/d3-format#precisionRound

function drawGraph (cell_line, compound_number, ic50/*, HillSlope*/) {
    
    const margin = {top: 75, right: 50, bottom: 50, left: 50}
            , width = 500 - margin.left - margin.right // Use the window's width
            , height = 550 - margin.top - margin.bottom; // Use the window's height

    const xScale = d3.scaleLinear()
        .domain([-3, 2]) // input
        .range([0, width]); // output
        
    const svg = d3.select("#dose-graph").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
            
    console.log(heatmap_directory + cell_line + ".csv");

    d3.csv(heatmap_directory + cell_line + ".csv").then(function(original_data) {
        let dataset=[];
        // const p = d3.precisionRound(0.1, 1.1);
        // const fmt = d3.format("." + p + "r");
        const fmt = d3.format(".3f");
        let HillSlope=0;

        console.log(original_data);

        original_data.forEach(function(d) {
            Object.keys(d).forEach(function(k) {
                if (k !== compound_number) {
                    return;
                }
                if (typeof d[k] !== 'object' && d['Row Labels'] == 'HillSlope') {
                    HillSlope = +d[k];
                    return;
                }
                if (typeof d[k] !== 'object' && d['Row Labels'] == 'Name') {
                    compound = d[k];
                    return;
                }
                if (typeof d[k] !== 'object') {
                    const point = {};
                    point.concentration = +d['Row Labels'];
                    point.dose = Math.log10(point.concentration);
                    if (d[k] !== '') {
                        point.inhibition = +d[k];
                        dataset.push(point);
                    }
                }
                
            });
        });
        original_data = undefined;
        
        if (dataset.length < 1) {
            
            svg.append("text")
                .attr("y", margin.top)
                .attr("x", margin.left)
                .attr("dy", "1em")
                .style("text-anchor", "middle")
                .text("Data not found.");
                
            return false;
            
        }

        let max_inhibitions = d3.max(dataset, function(d) { return d.inhibition;} );
        let min_inhibitions = d3.min(dataset, function(d) { return d.inhibition;} );

        // Add dose_response_curve
        LogIC50 = Math.log10(+ic50);
        dataset.forEach(function(d){
            if (isNaN(LogIC50) || isNaN(HillSlope)) {
                d.dose_response_curve = false;
            } else {
                d.dose_response_curve = dose_response_curve(
                    d.dose,
                    100,
                    0,
                    LogIC50,
                    HillSlope
                );
            }
        });

        //console.log(dataset);

        const yScale = d3.scaleLinear()
            .domain([
                //-10,
                Math.min(min_inhibitions - 10, 0),
                Math.max(max_inhibitions + 10, 100)
            ]) // input
            .range([height, 0]); // output


        const line = d3.line()
            .x(function (d) {
                return xScale(d.dose);
            }) // set the x values for the line generator
            .y(function (d) {
                return yScale(d.dose_response_curve);
            }) // set the y values for the line generator
            .curve(d3.curveMonotoneX); // apply smoothing to the line


        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(
                d3.axisBottom(xScale)
            ); // Create an axis component with d3.axisBottom

        // text label for the x axis
        svg.append("text")
            .attr("transform",
                "translate(" + (width/2) + " ," +
                (height + margin.top / 2) + ")")
            .style("text-anchor", "middle")
            .text("Dose (Log [uM])");

        svg.append("g")
            .attr("class", "y axis")
            .call(d3.axisLeft(yScale)); // Create an axis component with d3.axisLeft

        // text label for the y axis
        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - margin.left)
            .attr("x",0 - (height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text("Normalized % Inhibition");
            
        // add graph title
        svg.append("text")
            .attr("x", (width / 2))
            .attr("y", 0 - (margin.top *.75))
            .attr("text-anchor", "middle")
            .style("font-size", "22px")
            .text(cell_line + ", " + compound);

        // add IC50
        svg.append("text")
            .attr("x", (width / 2))
            .attr("y", 0 - (margin.top * .25))
            .attr("text-anchor", "middle")
            .style("font-size", "18px")
            .text("IC50 = " + ic50 + " | Hill Slope = " + HillSlope);

        
        // Append the path, bind the data, and call the line generator
        if (HillSlope && !isNaN(HillSlope)) {
            svg.append("path")
                .datum(dataset) // 10. Binds data to the line
                .attr("class", "line") // Assign a class for styling
                .attr("d", line); // 11. Calls the line generator
        }

        // Appends a circle for each datapoint
        svg.selectAll(".dot")
            .data(dataset)
            .enter().append("circle") // Uses the enter().append() method
            .attr("class", "dot") // Assign a class for styling
            .attr("cx", function(d) { return xScale(d.dose) })
            .attr("cy", function(d) { return yScale(d.inhibition) })
            .attr("r", 5)
            .append("title").text(function(d) {
                    return "dose: " +  fmt(d.dose) + "\n"
                        + "inhibition: " + fmt(d.inhibition);
                });

        

    })
    .catch(function(error) {
        
        svg.append("text")
            .attr("y", margin.top)
            .attr("x", margin.left)
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text("Data not found.");

    });
}

function dose_response_curve(concentration, top, bottom, LogIC50, HillSlope) {
    return bottom + (top - bottom)/
        (1 + Math.pow(10, ((LogIC50-concentration)*HillSlope)));
}

//drawGraph('ST8814','Refametinib (RDEA119, Bay 86-9766)',0.2624, 1.136)