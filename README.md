# drug-data

## Dependencies

The heatmap chart and dose response graphs are drawn using the [d3.js Javascript library](https://d3js.org/), version 5. 
We have included some extra scripts to make the JS work in IE11 - es6-promise and fetch.

### jQuery and jQuery UI

jQuery and jQuery UI are used. jQuery UI is used for the modal where the dose response graphs appear.

### Searching in the table

The in-table search is implemented using the [hideseek jquery plugin](https://vdw.github.io/HideSeek/).

### Sorting the table

Sorting of the table columns is acheived using the [stupidtable plugin](https://github.com/joequery/Stupid-Table-Plugin).

## Data

The drug data is pulled from CSV files in a specified directory. The data directory is specified in a `data-heatmap-dir` attribute on a container element for the heatmap table:

```html
<div 
    data-heatmap-dir="data/example-heatmap/"
    id="heatmap">
</div>
```

There is a main.csv file that contains all of the compounds in the heatmap with cell lines in the experiment and the ic50 for each drug/cell line combination. 
main.csv is used to build the heatmap table.

Each cell line has a file with the dose response data. These files are used to draw the does response curves you see when clicking a cell in the heatmap.

