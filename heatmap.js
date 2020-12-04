const $heatmap_container = $('#heatmap');
const heatmap_directory = $heatmap_container.data('heatmapDir');
const heatmap_file = heatmap_directory + 'main.csv';
// const URL_nci = 'https://cancer.gov/publications/dictionaries/cancer-drug/def/';
const URL_pchem = 'https://pubchem.ncbi.nlm.nih.gov/compound/';

function make_class_name(strng){
    return strng.replace(/[^a-zA-Z0-9 -]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-'); // collapse dashes
}

d3.csv(heatmap_file).then(function(data) {
    var select_pathway = document.getElementById("pathwaySel");
    var select_target = document.getElementById("targetSel");
    var select_compound_name = document.getElementById("compoundSel");
    // select_pathway.options[select_pathway.options.length] = new Option('Pathway', 'Pathway', True);
    var pathways = [];
    var targets = [];
    var compound_names = [];

    var low_color = '#12bab8';
    var high_color = '#e63f3b';

    var color = d3.scaleLinear()
        .domain([0, 25])
        .range([low_color, high_color])
        .interpolate(d3.interpolateHcl);

    data.forEach(function(d) {

        d = toFloats(d);

        // organize the information about the drug into one property
        //to make it easier to segregate from the data on the cells
        d.info = {
            'pathway_sort' : d['sort number'],
            'cmpd_name' : d.cmpd_name,
            'cmpd_number' :  d.cmpd_number,
            'primary_target' : d['Primary Target'],
            'pathway' : d.Pathway,
            // 'URL_nci' : URL_nci + d.cmpd_name,
            'URL_pchem': URL_pchem + d.cmpd_name,
            'row_class' : make_class_name(d.cmpd_name)+" "+make_class_name(d['Primary Target'])+" "+make_class_name(d.Pathway)


        };

        //make class for each attribute: pathway, cmpnd, and target so you can manipulate here.
        //make class each

        if (!(pathways.includes(d.Pathway))) {
            select_pathway.options[select_pathway.options.length] = new Option(d.Pathway, d.Pathway);
            pathways.push(d.Pathway);
        }

        if (!(targets.includes(d['Primary Target']))) {
            select_target.options[select_target.options.length] = new Option(d['Primary Target'], d['Primary Target']);
            targets.push(d['Primary Target']);
        }
        if (!(compound_names.includes(d.cmpd_name))) {
            select_compound_name.options[select_compound_name.options.length] = new Option(d.cmpd_name, d.cmpd_name);
            compound_names.push(d.cmpd_name);
        }

        // delete the original info from the row so that
        //we can control its display separately
        delete d.cmpd_number;
        delete d.cmpd_name;
        delete d['sort number'];
        delete d['Primary Target'];
        delete d.Pathway;
    });

    var table = d3.select("#heatmap").append("table");

    var caption = table.append("caption")
        .attr("class", "heatmap-caption");

    const caption_width = 340;
    const scale_x_margin = 20;
    const scale_width = caption_width - scale_x_margin * 2;
    const scale_height = 20;
    const scale_min = 0;
    const scale_max = 25;

    var caption_label = caption.append("p").text("IC50μM");

    var svg = caption.append("svg")
        .attr("width", caption_width)
        .attr("height", 70);

    //Append a defs (for definition) element to your SVG
    var defs = svg.append("defs");

    //Append a linearGradient element to the defs and give it a unique id
    var linearGradient = defs.append("linearGradient")
        .attr("id", "linear-gradient");

    for (var i = scale_min; i <= scale_max; i++) {
        linearGradient.append("stop")
            .attr("offset", i / scale_max)
            .attr("stop-color", color(i));
    }

    svg.append("rect")
        .attr("width", scale_width)
        .attr("height", scale_height)
        .attr("x", scale_x_margin)
        .style("fill", "url(#linear-gradient)");


    for (let i = 5; i <= 25; i += 5) {

        const position = scale_x_margin + i / scale_max * scale_width - 1;
        const dash = scale_height / 3 + ", " + scale_height / 3;

        svg.append("text")
            .style("text-anchor", "middle")
            .attr("y", 35)
            .attr("x", position)
            .text(i);

        svg.append("line")
            .style("stroke", "rgba(0, 0, 0, .5)")
            .style("stroke-width", 1)
            .style("stroke-dasharray", (dash))
            .attr("x1", position)
            .attr("y1", 0)
            .attr("x2", position)
            .attr("y2", scale_height);
    }

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
    tableHeaders.unshift(["Pathway Sort", "yes"], "Pathway", "Target", "Compound Name","PubChem Link");
    sortTypes.unshift('float', 'string', 'string', 'string', '');

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
            return d.info.row_class
        })

    var cells = rows
        .selectAll("td")
        .data(function (d) {
            //console.log(getRowValues(d));
            return getRowValues(d);
        })
        .enter()
        .append("td")
        .attr("data-sort-value", function(d) {
            return d.sort;
        })
        .attr("data-cell_line", function (d) {
            return d.cell_line;
        })
        .attr("data-cmpd", function (d) {
            return d.cmpd_name;

        })
        .attr("data-cmpd_number", function (d) {
            return  d.cmpd_number;
        })
        .attr("data-ic50", function (d) {
            if (!isNaN(d.ic50)) {
                return d.ic50;
            }
        })
        .on("click", function () {
            showGraph(this);
        })
        .attr("class", function (d) {
            // add a class so that the colored cells can be styled
            //differently than the rest of the table
            if (!isNaN(d.ic50)) {
                return "heatmap__cell--" + typeof d.ic50;
            }
        })
        .style("background-color", function (d, i) {
            if (!isNaN(d.ic50)) {
                return color(d.ic50);
            }
        })
        .append("span")
        .html(function (d) {
            // console.log(d);
            if (d.link) {
                return '<a href="' + d.link + '"">' + d.value + '</a>';
            }
            return d.value;

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

// arguments: reference to select list, callback function (optional)
function getSelectedOptions(sel, fn) {
    var opts = [], opt;

    // loop through options in select list
    for (var i=0, len=sel.options.length; i<len; i++) {
        opt = sel.options[i];

        // check if selected
        if ( opt.selected ) {
            // add to array of option elements to return from this function
            opts.push(opt);

            // invoke optional callback function if provided
            if (fn) {
                fn(opt);
            }
        }
    }

    // return array containing references to selected option elements
    // console.log(opts)
    return opts;
}


//for pathways
// anonymous function onchange for select list with id demoSel
document.getElementById("pathwaySel").onchange = function(e) {
    // get reference to display textarea
    var display = document.getElementById('display');
    display.innerHTML = ''; // reset

    // callback fn handles selected options
    var selected_opts = getSelectedOptions(this, callback);

    var classes = []
    for (var i = 0;i < selected_opts.length;i++){
        classes.push(make_class_name(selected_opts[i].innerHTML))
    }
    // console.log(classes)
    $('#heatmap tbody tr').each(function( index ) {
        // console.log( index + ": " + $( this ).text() );
        $(this).hide();
        for (var i = 0;i < classes.length;i++) {
            if ($(this).hasClass(classes[i])){
                $(this).show()
            }
        }
    });


    // remove ', ' at end of string
    var str = display.innerHTML.slice(0, -2);

    display.innerHTML = str;
};

document.getElementById('clear_button').onclick = function(e) {
    
    location.reload();

};

/*document.getElementById('demoForm').onsubmit = function(e) {
    // reference to select list using this keyword and form elements collection
    // no callback function used this time


    var opts = getSelectedOptions(this.elements['demoSel[]']);
    if (isset($_POST['clear_button'])) {
        var opts = []
    }


    alert('The number of options selected is: ' + opts.length);  //  number of selected options

    return false; // don't return online form
};*/

function callback(opt) {
    // display in textarea for this example
    var display = document.getElementById('display');
    display.innerHTML += opt.value + ', ';

    // can access properties of opt, such as...
    //alert( opt.value )
    //alert( opt.text )
    //alert( opt.form )
}


//for targets
// anonymous function onchange for select list with id demoSel
document.getElementById("targetSel").onchange = function(e) {
    // get reference to display textarea
    var display = document.getElementById('display1');
    display.innerHTML = ''; // reset

    // callback fn handles selected options
    var selected_opts = getSelectedOptions(this, callback1);

    var classes = []
    for (var i = 0;i < selected_opts.length;i++){
        classes.push(make_class_name(selected_opts[i].innerHTML))
    }
    // console.log(classes)
    $('#heatmap tbody tr').each(function( index ) {
        // console.log( index + ": " + $( this ).text() );
        $(this).hide();
        for (var i = 0;i < classes.length;i++) {
            if ($(this).hasClass(classes[i])){
                $(this).show()
            }
        }
    });

    // remove ', ' at end of string
    var str = display.innerHTML.slice(0, -2);
    display.innerHTML = str;
};
document.getElementById('demoForm1').onsubmit = function(e) {
    // reference to select list using this keyword and form elements collection
    // no callback function used this time
    var opts = getSelectedOptions(this.elements['demoSel1[]']);
    if (isset($_POST['clear_button'])) {
        var opts = []
    }

    alert('The number of options selected is: ' + opts.length); //  number of selected options

    return false; // don't return online form
};
// example callback function (selected options passed one by one)
function callback1(opt) {
    // display in textarea for this example
    var display = document.getElementById('display1');
    display.innerHTML += opt.value + ', ';

    // can access properties of opt, such as...
    //alert( opt.value )
    //alert( opt.text )
    //alert( opt.form )
}

//for compound names
// anonymous function onchange for select list with id demoSel
document.getElementById("compoundSel").onchange = function(e) {
    // get reference to display textarea
    var display = document.getElementById('display2');
    display.innerHTML = ''; // reset

    // callback fn handles selected options
    var selected_opts = getSelectedOptions(this, callback2);

    var classes = []
    for (var i = 0;i < selected_opts.length;i++){
        classes.push(make_class_name(selected_opts[i].innerHTML))
    }
    console.log(classes)
    $('#heatmap tbody tr').each(function( index ) {
        // console.log( index + ": " + $( this ).text() );
        $(this).hide();
        for (var i = 0;i < classes.length;i++) {
            if ($(this).hasClass(classes[i])){
                $(this).show()
            }
                }
    });



    // remove ', ' at end of string
    var str = display.innerHTML.slice(0, -2);
    display.innerHTML = str;
};

document.getElementById('demoForm2').onsubmit = function(e) {
    // reference to select list using this keyword and form elements collection
    // no callback function used this time
    var opts = getSelectedOptions(this.elements['demoSel2[]']);
    if (isset($_POST['clear_button'])) {
        var opts = []
    }

    alert('The number of options selected is: ' + opts.length); //  number of selected options

    return false; // don't return online form
};

// example callback function (selected options passed one by one)
function callback2(opt) {
    // display in textarea for this example
    var display = document.getElementById('display2');
    display.innerHTML += opt.value + ', ';

    // can access properties of opt, such as...
    //alert( opt.value )
    //alert( opt.text )
    //alert( opt.form )
}


function getRowValues(d) {
    var values = [
        {'value': d.info.pathway_sort, 'sort': null},
        {'value': d.info.pathway, 'sort': null},
        {'value': d.info.primary_target, 'sort': null},
        {'value': d.info.cmpd_name, 'sort': d.info.cmpd_number},
        // {'value': 'link', 'link': d.info.URL_nci, 'sort':null},
        {'value': 'link', 'link': d.info.URL_pchem, 'sort':null},

    ];

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
            //var cell = [o[k], null, o.info.cmpd[1], k, o.info.cmpd[0]];
            var cell = {
                'value' : o[k],
                'sort' : null,
                'cell_line' : k,
                'cmpd_name' : o.info.cmpd_name,
                'cmpd_number' : o.info.cmpd_number,
                'ic50' : o[k]
            }
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
        let bottom=0;
        let top=0;
        let xmid=0;
        let scal=0;
        let s=0;

        original_data.forEach(function(d) {
            Object.keys(d).forEach(function(k) {
                if (k !== compound_number) {
                    return;
                }
                if (typeof d[k] !== 'object' && d['Row Labels'] == 'HillSlope') {
                    HillSlope = +d[k];
                    return;
                } 
                //wendy modification
                if (typeof d[k] !== 'object' && d['Row Labels'] == 'Name') {
                    compound = d[k];
                    return;
                }
                if (typeof d[k] !== 'object' && d['Row Labels'] == 'bottom') {
                    bottom = +d[k];
                    return;
                }
                if (typeof d[k] !== 'object' && d['Row Labels'] == 'top') {
                    top = +d[k];
                    return;
                }
                if (typeof d[k] !== 'object' && d['Row Labels'] == 'xmid') {
                    xmid = +d[k];
                    return;
                }
                if (typeof d[k] !== 'object' && d['Row Labels'] == 'scal') {
                    scal = +d[k];
                    return;
                }
                if (typeof d[k] !== 'object' && d['Row Labels'] == 's') {
                    s = +d[k];
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
        
        //original
        LogIC50 = Math.log10(+ic50);
        //dataset.forEach(function(d){
        //    if (isNaN(LogIC50) || isNaN(HillSlope)) {
        //        d.dose_response_curve = false;
        //    } else {
        //        d.dose_response_curve = dose_response_curve(
        //            d.dose,
        //            100,
        //            0,
        //            LogIC50,
        //            HillSlope
        //        );
        //    }
        //});
        
        //wendy modification
        dataset.forEach(function(d){
                d.dose_response_curve = dose_response_curve(
                    d.dose, top, bottom, xmid, scal, s
                );
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
        if (!isNaN(HillSlope)) {
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
            .text("Data Error." + error);
    });
}

//function dose_response_curve(concentration, top, bottom, LogIC50, HillSlope) {
//    return bottom + (top - bottom)/
//        (1 + Math.pow(10, ((LogIC50-concentration)*HillSlope)));
//}

function dose_response_curve(concentration, top, bottom, xmid, scal, s) {
    top = top * 100
    bottom = bottom * 100
    return bottom+(top-bottom)/Math.pow(1+Math.pow(10, ((xmid-concentration)*scal)),s);    
}

//yfit <- bottom+(top-bottom)/(1+10^((xmid-X)*scal))^s

//drawGraph('ST8814','Refametinib (RDEA119, Bay 86-9766)',0.2624, 1.136)